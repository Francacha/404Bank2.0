import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { descargarComprobante as bajarPdf } from '../components/descargarComprobante';
import styles from './Historial.module.css';

const API_URL = 'http://localhost:3000';

type Categoria = 'transferencia' | 'divisas' | 'prestamo' | 'frasco';
type Moneda = 'ARS' | 'USD';

// Lo que devuelve /mis-movimientos: transferencias, dólares, préstamos y frascos con la misma forma.
interface Movimiento {
  id: number | string;
  transaccion_central_id: string;
  cbu_origen: string | null;
  cbu_destino: string | null;
  importe: number | string;
  tipo: 'entrante' | 'saliente';
  fecha_hora: string;
  moneda: Moneda;
  categoria: Categoria;
  concepto: string | null;
  nombre_contraparte: string | null;
  cotizacion?: number | string | null;
}

// Una fila del libro: un movimiento, o los dos lados de una compra/venta de dólares juntos
// (entrada = lo que recibiste, salida = lo que pagaste).
interface Fila {
  clave: string;
  fecha: Date;
  categoria: Categoria;
  movimientos: Movimiento[];
  entrada?: Movimiento;
  salida?: Movimiento;
}

type Estado = 'cargando' | 'ok' | 'error';
type FiltroCategoria = 'TODAS' | Categoria;
type FiltroMoneda = 'TODAS' | Moneda;
type FiltroPeriodo = 'TODAS' | '7D' | '30D';

const CATEGORIAS: { valor: FiltroCategoria; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Todo' },
  { valor: 'transferencia', etiqueta: 'Transferencias' },
  // "Cambio" y no "Dólares": "Dólares" ya es una de las monedas del filtro de abajo.
  { valor: 'divisas', etiqueta: 'Cambio' },
  { valor: 'prestamo', etiqueta: 'Préstamos' },
  { valor: 'frasco', etiqueta: 'Frascos' },
];

const MONEDAS: { valor: FiltroMoneda; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Pesos y dólares' },
  { valor: 'ARS', etiqueta: 'Pesos' },
  { valor: 'USD', etiqueta: 'Dólares' },
];

const PERIODOS: { valor: FiltroPeriodo; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Siempre' },
  { valor: '7D', etiqueta: '7 días' },
  { valor: '30D', etiqueta: '30 días' },
];

const DIA_MS = 24 * 60 * 60 * 1000;
const DIAS_PERIODO: Record<FiltroPeriodo, number | null> = { TODAS: null, '7D': 7, '30D': 30 };

const formatearImporte = (monto: number, moneda: Moneda) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);

const formatearHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

const fechaLarga = (fecha: Date) =>
  fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', ...(fecha.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });

const claveDia = (fecha: Date) => `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;

// "Hoy", "Ayer" o "jueves 8 de octubre" (con año si no es el actual), como en un resumen bancario.
const nombreDia = (fecha: Date) => {
  const hoy = new Date();
  const ayer = new Date(hoy.getTime() - DIA_MS);
  if (claveDia(fecha) === claveDia(hoy)) return 'Hoy';
  if (claveDia(fecha) === claveDia(ayer)) return 'Ayer';
  return fecha.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(fecha.getFullYear() !== hoy.getFullYear() ? { year: 'numeric' } : {}),
  });
};

const cbuCorto = (cbu: string | null) => (cbu ? `CBU ···${cbu.slice(-4)}` : 'Cuenta externa');

// CBU en sus dos bloques (8 dígitos de banco y sucursal, 14 de cuenta), como figura en un resumen.
const cbuEnBloques = (cbu: string) => (/^\d{22}$/.test(cbu) ? `${cbu.slice(0, 8)} ${cbu.slice(8)}` : cbu);

// La operación de dólares guarda dos lados con el mismo número; para mostrarla se usa el número base.
const operacionBase = (id: string) => id.replace(/-(salida|entrada)$/, '');

const leerFiltro = <T extends string>(valor: string | null, validos: readonly { valor: T }[]): T =>
  (validos.find(v => v.valor === valor)?.valor ?? validos[0].valor);

// Junta los dos lados de cada compra/venta de dólares en una sola fila; el resto va uno por fila.
const armarFilas = (movimientos: Movimiento[]): Fila[] => {
  const filas: Fila[] = [];
  const porOperacion = new Map<string, Fila>();
  for (const m of movimientos) {
    if (m.categoria === 'divisas') {
      const base = String(m.id).replace(/-(salida|entrada)$/, '');
      const existente = porOperacion.get(base);
      if (existente) {
        existente.movimientos.push(m);
        if (m.tipo === 'entrante') existente.entrada = m; else existente.salida = m;
        continue;
      }
      const fila: Fila = {
        clave: base,
        fecha: new Date(m.fecha_hora),
        categoria: 'divisas',
        movimientos: [m],
        ...(m.tipo === 'entrante' ? { entrada: m } : { salida: m }),
      };
      porOperacion.set(base, fila);
      filas.push(fila);
      continue;
    }
    filas.push({ clave: String(m.id), fecha: new Date(m.fecha_hora), categoria: m.categoria, movimientos: [m] });
  }
  return filas;
};

// En una compra la entrada son dólares; en una venta, pesos.
const esCompra = (f: Fila) => (f.entrada ?? f.salida)?.moneda === (f.entrada ? 'USD' : 'ARS');

const dolaresDeLaOperacion = (f: Fila) => {
  const ladoUsd = f.movimientos.find(m => m.moneda === 'USD');
  return ladoUsd ? formatearImporte(Number(ladoUsd.importe), 'USD') : null;
};

const tituloFila = (f: Fila) => {
  const m = f.movimientos[0];
  if (f.categoria === 'divisas') {
    const usd = dolaresDeLaOperacion(f);
    if (usd && f.entrada && f.salida) return `${esCompra(f) ? 'Compraste' : 'Vendiste'} ${usd}`;
    return m.concepto || 'Compra o venta de dólares';
  }
  if (f.categoria !== 'transferencia') return m.concepto || 'Movimiento';
  return m.nombre_contraparte || cbuCorto(m.tipo === 'entrante' ? m.cbu_origen : m.cbu_destino);
};

// La línea de abajo dice qué pasó, sin repetir el título.
const metaFila = (f: Fila) => {
  const m = f.movimientos[0];
  const entrante = m.tipo === 'entrante';
  if (f.categoria === 'transferencia') return entrante ? 'Recibiste' : 'Enviaste';
  if (f.categoria === 'prestamo') return entrante ? 'Acreditado en tu cuenta' : 'Debitado de tu cuenta';
  if (f.categoria === 'frasco') return entrante ? 'Volvió a tu cuenta' : 'Apartado de tu cuenta';
  const cotizacion = m.cotizacion === null || m.cotizacion === undefined ? null : Number(m.cotizacion);
  return cotizacion ? `Cotización ${formatearImporte(cotizacion, 'ARS')}` : 'Cambio';
};

const IconArrowIn = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7 7 17" /><path d="M16 17H7V8" /></svg>
);
const IconArrowOut = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
);
const IconDolar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M16.5 7.5c-.8-1.3-2.4-2-4.5-2-2.6 0-4.3 1.3-4.3 3.1 0 4.4 9 2.4 9 6.8 0 1.8-1.8 3.1-4.7 3.1-2.2 0-3.9-.8-4.7-2.1" /></svg>
);
const IconPrestamo = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10 12 4l9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20h18" /></svg>
);
const IconFrasco = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3h8" /><path d="M9 3v3.2a4 4 0 0 1-1.2 2.8A5 5 0 0 0 6 12.6V19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6.4a5 5 0 0 0-1.8-3.6A4 4 0 0 1 15 6.2V3" /><path d="M6 14h12" /></svg>
);
const IconDescarga = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M5 20h14" /></svg>
);
const IconCopiar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
);
const IconFiltros = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></svg>
);
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);

const iconoFila = (f: Fila) => {
  if (f.categoria === 'divisas') return <IconDolar />;
  if (f.categoria === 'prestamo') return <IconPrestamo />;
  if (f.categoria === 'frasco') return <IconFrasco />;
  return f.movimientos[0].tipo === 'entrante' ? <IconArrowIn /> : <IconArrowOut />;
};

// Suma lo que entró y lo que salió, separado por moneda (pesos y dólares no se mezclan).
const sumarTotales = (movimientos: Movimiento[]) => {
  const totales = { ARS: { entro: 0, salio: 0, hay: false }, USD: { entro: 0, salio: 0, hay: false } };
  for (const m of movimientos) {
    const t = totales[m.moneda];
    t.hay = true;
    if (m.tipo === 'entrante') t.entro += Number(m.importe); else t.salio += Number(m.importe);
  }
  return totales;
};

function Monto({ m, chico = false }: { m: Movimiento; chico?: boolean }) {
  const entrante = m.tipo === 'entrante';
  return (
    <span className={`${chico ? styles.montoSecundario : styles.monto} ${entrante && !chico ? styles.montoEntrante : ''}`}>
      <span aria-hidden="true">{entrante ? '+ ' : '− '}</span>
      <span className={styles.srOnly}>{entrante ? 'Ingreso de ' : 'Egreso de '}</span>
      {formatearImporte(Number(m.importe), m.moneda)}
    </span>
  );
}

function Historial() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  // Filtros en la URL (?tipo=&moneda=&periodo=) para que sobrevivan a "atrás" y a recargar.
  // ?op=<transaccion_central_id>: llega desde Home y abre ese movimiento ya desplegado.
  const [searchParams, setSearchParams] = useSearchParams();
  const opBuscada = searchParams.get('op');
  const opResuelta = useRef<string | null>(null);
  const filtroCategoria = leerFiltro(searchParams.get('tipo'), CATEGORIAS);
  const filtroMoneda = leerFiltro(searchParams.get('moneda'), MONEDAS);
  const filtroPeriodo = leerFiltro(searchParams.get('periodo'), PERIODOS);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState(false);
  const [masFiltros, setMasFiltros] = useState(false);
  const [filtrosTocados, setFiltrosTocados] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const timerCopiado = useRef<number | null>(null);
  // "Ahora" fijo por visita: los períodos de 7 y 30 días se cuentan desde que abriste la pantalla.
  const [ahora] = useState(() => Date.now());

  const pedir = useCallback(async (antes?: string) => {
    const token = await getToken();
    const url = `${API_URL}/api/transferencias/mis-movimientos${antes ? `?antes=${encodeURIComponent(antes)}` : ''}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) throw new Error();
    return { movimientos: (data.movimientos || []) as Movimiento[], hayMas: Boolean(data.hayMas) };
  }, [getToken]);

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const pagina = await pedir();
      setMovimientos(pagina.movimientos);
      setHayMas(pagina.hayMas);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [pedir]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => () => {
    if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
  }, []);

  // Pide los siguientes a partir del más viejo que ya está; el backend repite los de esa misma fecha
  // para no perder ninguno, así que se descartan por id.
  const cargarMas = async () => {
    if (cargandoMas || movimientos.length === 0) return;
    setErrorMas(false);
    setCargandoMas(true);
    try {
      const pagina = await pedir(movimientos[movimientos.length - 1].fecha_hora);
      setMovimientos(actuales => {
        const vistos = new Set(actuales.map(m => String(m.id)));
        return [...actuales, ...pagina.movimientos.filter(m => !vistos.has(String(m.id)))];
      });
      setHayMas(pagina.hayMas);
    } catch {
      setErrorMas(true);
    } finally {
      setCargandoMas(false);
    }
  };

  const filas = useMemo(() => armarFilas(movimientos), [movimientos]);

  useEffect(() => {
    if (estado !== 'ok' || !opBuscada || opResuelta.current === opBuscada) return;
    opResuelta.current = opBuscada;
    const f = filas.find(x => x.movimientos.some(m => m.transaccion_central_id === opBuscada));
    if (!f) return;
    setAbierto(f.clave);
    requestAnimationFrame(() => {
      const fila = document.querySelector<HTMLButtonElement>(`[aria-controls="detalle-${CSS.escape(f.clave)}"]`);
      fila?.scrollIntoView({ block: 'center' });
      fila?.focus({ preventScroll: true });
    });
  }, [estado, opBuscada, filas]);

  const diasPeriodo = DIAS_PERIODO[filtroPeriodo];
  const inicioPeriodo = diasPeriodo === null ? null : ahora - diasPeriodo * DIA_MS;

  const filtradas = useMemo(() => filas.filter(f => {
    if (filtroCategoria !== 'TODAS' && f.categoria !== filtroCategoria) return false;
    if (filtroMoneda !== 'TODAS' && !f.movimientos.some(m => m.moneda === filtroMoneda)) return false;
    if (inicioPeriodo !== null && f.fecha.getTime() < inicioPeriodo) return false;
    return true;
  }), [filas, filtroCategoria, filtroMoneda, inicioPeriodo]);

  const totales = useMemo(() => sumarTotales(
    filtradas.flatMap(f => f.movimientos).filter(m => filtroMoneda === 'TODAS' || m.moneda === filtroMoneda),
  ), [filtradas, filtroMoneda]);

  // ¿Lo cargado cubre todo el período elegido? Si quedan más viejos sin pedir, los totales son parciales.
  const masViejo = movimientos.length ? new Date(movimientos[movimientos.length - 1].fecha_hora) : null;
  const periodoCompleto = !hayMas || (inicioPeriodo !== null && masViejo !== null && masViejo.getTime() < inicioPeriodo);

  // Grupos por día, en el orden en que llegan (del más nuevo al más viejo).
  const dias = useMemo(() => {
    const grupos: { clave: string; nombre: string; items: Fila[] }[] = [];
    for (const f of filtradas) {
      const clave = claveDia(f.fecha);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clave === clave) ultimo.items.push(f);
      else grupos.push({ clave, nombre: nombreDia(f.fecha), items: [f] });
    }
    return grupos;
  }, [filtradas]);

  const cambiarFiltro = (clave: 'tipo' | 'moneda' | 'periodo', valor: string) => {
    setFiltrosTocados(true);
    setSearchParams(actuales => {
      const nuevos = new URLSearchParams(actuales);
      if (valor === 'TODAS') nuevos.delete(clave); else nuevos.set(clave, valor);
      return nuevos;
    }, { replace: true });
  };

  const secundariosActivos = (filtroMoneda !== 'TODAS' ? 1 : 0) + (filtroPeriodo !== 'TODAS' ? 1 : 0);
  const hayFiltros = filtroCategoria !== 'TODAS' || secundariosActivos > 0;
  const limpiarFiltros = () => {
    setFiltrosTocados(true);
    setSearchParams(actuales => {
      const nuevos = new URLSearchParams(actuales);
      ['tipo', 'moneda', 'periodo'].forEach(c => nuevos.delete(c));
      return nuevos;
    }, { replace: true });
  };

  const descargarComprobante = async (m: Movimiento, clave: string) => {
    setErrorDescarga(null);
    setDescargando(clave);
    try {
      await bajarPdf(m.transaccion_central_id, await getToken());
    } catch {
      setErrorDescarga(clave);
    } finally {
      setDescargando(null);
    }
  };

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
      timerCopiado.current = window.setTimeout(() => setCopiado(null), 2000);
    } catch {
      setCopiado(null);
    }
  };

  // Un CBU en su píldora, con botón para copiarlo (sin espacios, listo para pegar).
  const datoCbu = (cbu: string | null, clave: string, etiqueta: string) => {
    if (!cbu) return <span>—</span>;
    return (
      <span className={styles.cbu}>
        <span className={styles.pill}>{cbuEnBloques(cbu)}</span>
        <button
          type="button"
          className={styles.btnCopiar}
          onClick={() => copiar(cbu, clave)}
          aria-label={`Copiar CBU ${etiqueta}`}
        >
          <IconCopiar />
          {copiado === clave ? 'Copiado' : 'Copiar'}
        </button>
      </span>
    );
  };

  const nombrePeriodo = filtroPeriodo === '7D' ? 'Últimos 7 días' : filtroPeriodo === '30D' ? 'Últimos 30 días'
    : periodoCompleto ? 'Desde que abriste tu cuenta' : 'Lo que ves en esta lista';

  const renderDetalle = (f: Fila, titulo: string) => {
    const m = f.movimientos[0];
    const entrante = m.tipo === 'entrante';
    const cotizacion = m.cotizacion === null || m.cotizacion === undefined ? null : Number(m.cotizacion);
    return (
      <div id={`detalle-${f.clave}`} className={styles.detalle} role="region" aria-label={`Detalle: ${titulo}`}>
        <dl className={styles.datos}>
          <div>
            <dt>Fecha</dt>
            <dd>{f.fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}, {formatearHora(f.fecha)} h</dd>
          </div>

          {f.categoria === 'transferencia' && (
            <>
              <div>
                <dt>{entrante ? 'Te la envió' : 'Se la enviaste a'}</dt>
                <dd>{m.nombre_contraparte || 'Titular sin nombre registrado'}</dd>
              </div>
              <div className={styles.datoAncho}>
                <dt>{entrante ? 'Desde el CBU' : 'Al CBU'}</dt>
                <dd>{datoCbu(entrante ? m.cbu_origen : m.cbu_destino, `${f.clave}-otro`, entrante ? 'de origen' : 'de destino')}</dd>
              </div>
            </>
          )}

          {f.categoria === 'divisas' && (
            <>
              {f.entrada && (
                <div>
                  <dt>Recibiste</dt>
                  <dd className={styles.cifra}>{formatearImporte(Number(f.entrada.importe), f.entrada.moneda)}</dd>
                </div>
              )}
              {f.salida && (
                <div>
                  <dt>Pagaste</dt>
                  <dd className={styles.cifra}>{formatearImporte(Number(f.salida.importe), f.salida.moneda)}</dd>
                </div>
              )}
              {cotizacion !== null && (
                <div>
                  <dt>Cotización</dt>
                  <dd className={styles.cifra}>{formatearImporte(cotizacion, 'ARS')} por dólar</dd>
                </div>
              )}
            </>
          )}

          {(f.categoria === 'prestamo' || f.categoria === 'frasco') && (
            <div className={styles.datoAncho}>
              <dt>Descripción</dt>
              <dd>{m.concepto || titulo}</dd>
            </div>
          )}

          {f.categoria === 'divisas' ? (
            <>
              {f.salida?.cbu_origen && (
                <div className={styles.datoAncho}>
                  <dt>Salió de tu cuenta en {f.salida.moneda === 'USD' ? 'dólares' : 'pesos'}</dt>
                  <dd>{datoCbu(f.salida.cbu_origen, `${f.clave}-salida`, 'de la cuenta de origen')}</dd>
                </div>
              )}
              {f.entrada?.cbu_destino && (
                <div className={styles.datoAncho}>
                  <dt>Entró en tu cuenta en {f.entrada.moneda === 'USD' ? 'dólares' : 'pesos'}</dt>
                  <dd>{datoCbu(f.entrada.cbu_destino, `${f.clave}-entrada`, 'de la cuenta de destino')}</dd>
                </div>
              )}
            </>
          ) : (
            <div className={styles.datoAncho}>
              <dt>{entrante ? 'Acreditado en tu cuenta' : 'Debitado de tu cuenta'} en {m.moneda === 'USD' ? 'dólares' : 'pesos'}</dt>
              <dd>{datoCbu(entrante ? m.cbu_destino : m.cbu_origen, `${f.clave}-propia`, 'de tu cuenta')}</dd>
            </div>
          )}

          <div>
            <dt>N.º de operación</dt>
            <dd className={styles.cifra}>{operacionBase(m.transaccion_central_id)}</dd>
          </div>
        </dl>

        {f.categoria === 'transferencia' ? (
          <div className={styles.acciones}>
            <button
              type="button"
              className={styles.btnSecundario}
              onClick={() => descargarComprobante(m, f.clave)}
              disabled={descargando === f.clave}
            >
              <IconDescarga />
              {descargando === f.clave ? 'Generando comprobante…' : 'Descargar comprobante'}
            </button>
            {errorDescarga === f.clave && (
              <p className={styles.errorDescarga} role="alert">
                No pudimos generar el comprobante de esta transferencia. Volvé a tocar “Descargar comprobante” en un momento.
              </p>
            )}
          </div>
        ) : (
          <p className={styles.notaDetalle}>
            Por ahora el comprobante en PDF es solo para transferencias. Si necesitás consultar este movimiento, usá el número de operación.
          </p>
        )}
      </div>
    );
  };

  const filaTotal = (moneda: Moneda) => {
    const t = totales[moneda];
    if (!t.hay) return null;
    return (
      <div className={styles.resumenFila} key={moneda}>
        <span className={styles.resumenMoneda}>{moneda === 'ARS' ? 'Pesos' : 'Dólares'}</span>
        {/* Un lado en cero se marca con una raya: "− US$ 0,00" no dice nada. */}
        <span className={styles.resumenCifra}>
          <span className={styles.resumenEtiqueta}>Entró</span>
          {t.entro > 0
            ? <span className={styles.montoEntrante}>+ {formatearImporte(t.entro, moneda)}</span>
            : <span className={styles.resumenCero}>—<span className={styles.srOnly}>nada</span></span>}
        </span>
        <span className={styles.resumenCifra}>
          <span className={styles.resumenEtiqueta}>Salió</span>
          {t.salio > 0
            ? <span>− {formatearImporte(t.salio, moneda)}</span>
            : <span className={styles.resumenCero}>—<span className={styles.srOnly}>nada</span></span>}
        </span>
      </div>
    );
  };

  return (
    <AppLayout ancho="lectura" title="Historial" subtitle="Todo lo que entró y salió de tus cuentas: transferencias, dólares, préstamos y frascos.">
      <div className={styles.wrapper}>
        {estado === 'cargando' && (
          <div className={styles.libro} aria-busy="true">
            <p className={styles.srOnly} role="status">Cargando tu historial…</p>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={styles.esqueletoFila} aria-hidden="true">
                <span className={styles.esqueletoIcono} />
                <span className={styles.esqueletoTexto}>
                  <span className={styles.esqueletoLinea} />
                  <span className={`${styles.esqueletoLinea} ${styles.esqueletoCorta}`} />
                </span>
                <span className={`${styles.esqueletoLinea} ${styles.esqueletoMonto}`} />
              </div>
            ))}
          </div>
        )}

        {estado === 'error' && (
          <div className={styles.aviso} role="alert">
            <p>No pudimos cargar tu historial. Revisá tu conexión e intentá de nuevo.</p>
            <button type="button" className={styles.btnSecundario} onClick={cargar}>Reintentar</button>
          </div>
        )}

        {estado === 'ok' && movimientos.length === 0 && (
          <div className={styles.vacio}>
            <p>Todavía no tenés movimientos. Cuando envíes o recibas plata, la vas a ver acá.</p>
            <button type="button" className={styles.btnSecundario} onClick={() => navigate('/transferir')}>
              Hacé tu primera transferencia
            </button>
          </div>
        )}

        {estado === 'ok' && movimientos.length > 0 && (
          <>
            <div className={styles.filtros}>
              <div className={styles.filaChips}>
                <div className={styles.chips} role="group" aria-label="Tipo de movimiento">
                  {CATEGORIAS.map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtroCategoria === valor}
                      onClick={() => cambiarFiltro('tipo', valor)}
                      className={styles.chip}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                {/* Solo en celular: moneda y período quedan plegados detrás de este botón. */}
                <button
                  type="button"
                  className={styles.btnMasFiltros}
                  aria-expanded={masFiltros}
                  aria-controls="filtros-secundarios"
                  onClick={() => setMasFiltros(v => !v)}
                >
                  <IconFiltros />
                  Filtros{secundariosActivos > 0 ? ` (${secundariosActivos})` : ''}
                </button>
              </div>
              <div
                id="filtros-secundarios"
                className={`${styles.filtrosSecundarios} ${masFiltros ? '' : styles.secundariosPlegados}`}
              >
                <div className={styles.segmento} role="group" aria-label="Moneda">
                  {MONEDAS.map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtroMoneda === valor}
                      onClick={() => cambiarFiltro('moneda', valor)}
                      className={styles.segmentoBoton}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <div className={styles.segmento} role="group" aria-label="Período">
                  {PERIODOS.map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtroPeriodo === valor}
                      onClick={() => cambiarFiltro('periodo', valor)}
                      className={styles.segmentoBoton}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                {hayFiltros && (
                  <button type="button" className={styles.quitarFiltros} onClick={limpiarFiltros}>
                    Quitar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Solo se anuncia cuando cambian los filtros, no al entrar. */}
            <p className={styles.srOnly} aria-live="polite">
              {filtrosTocados ? (filtradas.length === 1 ? '1 movimiento' : `${filtradas.length} movimientos`) : ''}
            </p>

            {filtradas.length > 0 && (
              <section className={styles.resumen} aria-labelledby="resumen-titulo">
                <h2 id="resumen-titulo" className={styles.resumenTitulo}>{nombrePeriodo}</h2>
                <div className={styles.resumenFilas}>
                  {filaTotal('ARS')}
                  {filaTotal('USD')}
                </div>
                {!periodoCompleto && masViejo && (
                  <p className={styles.resumenNota}>
                    Cuenta los movimientos hasta el {fechaLarga(masViejo)}. Hay más viejos sin cargar.{' '}
                    <button type="button" className={styles.btnTexto} onClick={cargarMas} aria-busy={cargandoMas}>
                      {cargandoMas ? 'Cargando…' : 'Cargar más'}
                    </button>
                  </p>
                )}
              </section>
            )}

            {filtradas.length === 0 && (
              <div className={styles.vacio}>
                <p>
                  No hay movimientos con estos filtros
                  {!periodoCompleto && masViejo ? ` hasta el ${fechaLarga(masViejo)}. Puede haber en los más viejos.` : '.'}
                </p>
                <button type="button" className={styles.btnSecundario} onClick={limpiarFiltros}>Ver todos</button>
              </div>
            )}

            {dias.map(dia => (
              <section key={dia.clave} className={styles.dia} aria-labelledby={`dia-${dia.clave}`}>
                <h2 id={`dia-${dia.clave}`} className={styles.diaTitulo}>{dia.nombre}</h2>
                <ul className={styles.libro}>
                  {dia.items.map(f => {
                    const principal = f.entrada ?? f.movimientos[0];
                    const secundario = f.entrada && f.salida ? f.salida : null;
                    const titulo = tituloFila(f);
                    const estaAbierto = abierto === f.clave;
                    return (
                      <li key={f.clave} className={styles.item}>
                        <button
                          type="button"
                          className={styles.fila}
                          aria-expanded={estaAbierto}
                          aria-controls={`detalle-${f.clave}`}
                          onClick={() => setAbierto(estaAbierto ? null : f.clave)}
                        >
                          <span
                            className={`${styles.icono} ${principal.tipo === 'entrante' ? styles.iconoEntrante : styles.iconoSaliente}`}
                            aria-hidden="true"
                          >
                            {iconoFila(f)}
                          </span>
                          <span className={styles.info}>
                            <span className={styles.titulo}>{titulo}</span>
                            <span className={styles.meta}>{metaFila(f)} · {formatearHora(f.fecha)}</span>
                          </span>
                          <span className={styles.montos}>
                            <Monto m={principal} />
                            {secundario && <Monto m={secundario} chico />}
                          </span>
                          <span className={`${styles.chevron} ${estaAbierto ? styles.chevronAbierto : ''}`} aria-hidden="true">
                            <IconChevron />
                          </span>
                        </button>

                        {estaAbierto && renderDetalle(f, titulo)}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {hayMas && (
              <div className={styles.cargarMas}>
                <button type="button" className={styles.btnSecundario} onClick={cargarMas} aria-busy={cargandoMas}>
                  {cargandoMas ? 'Cargando movimientos…' : 'Cargar movimientos anteriores'}
                </button>
                {errorMas && (
                  <p className={styles.errorDescarga} role="alert">No pudimos traer más movimientos. Probá de nuevo.</p>
                )}
              </div>
            )}
            {!hayMas && movimientos.length > 20 && (
              <p className={styles.nota}>Estos son todos tus movimientos.</p>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Historial;
