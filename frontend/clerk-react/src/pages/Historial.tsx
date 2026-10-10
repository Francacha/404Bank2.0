import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { descargarComprobante as bajarPdf } from '../components/descargarComprobante';
import styles from './Historial.module.css';

const API_URL = 'http://localhost:3000';

type Categoria = 'transferencia' | 'divisas' | 'prestamo' | 'frasco';

// Lo que devuelve /mis-movimientos: transferencias, dólares, préstamos y frascos con la misma forma.
interface Movimiento {
  id: number | string;
  transaccion_central_id: string;
  cbu_origen: string | null;
  cbu_destino: string | null;
  importe: number | string;
  tipo: 'entrante' | 'saliente';
  fecha_hora: string;
  moneda: 'ARS' | 'USD';
  categoria: Categoria;
  concepto: string | null;
  nombre_contraparte: string | null;
}

type Estado = 'cargando' | 'ok' | 'error';

const CATEGORIAS: { valor: 'TODAS' | Categoria; etiqueta: string }[] = [
  { valor: 'TODAS', etiqueta: 'Todo' },
  { valor: 'transferencia', etiqueta: 'Transferencias' },
  { valor: 'divisas', etiqueta: 'Dólares' },
  { valor: 'prestamo', etiqueta: 'Préstamos' },
  { valor: 'frasco', etiqueta: 'Frascos' },
];

const NOMBRE_CATEGORIA: Record<Categoria, string> = {
  transferencia: 'Transferencia',
  divisas: 'Dólares',
  prestamo: 'Préstamo',
  frasco: 'Frasco',
};

const DIA_MS = 24 * 60 * 60 * 1000;

const formatearImporte = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);

const formatearHora = (fecha: Date) =>
  fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

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

// Quién o qué: el nombre de la contraparte, el CBU abreviado o el concepto del movimiento.
const tituloMovimiento = (m: Movimiento) => {
  if (m.categoria !== 'transferencia') return m.concepto || NOMBRE_CATEGORIA[m.categoria];
  return m.nombre_contraparte || cbuCorto(m.tipo === 'entrante' ? m.cbu_origen : m.cbu_destino);
};

const detalleMovimiento = (m: Movimiento) => {
  if (m.categoria === 'transferencia') return m.tipo === 'entrante' ? 'Recibiste' : 'Enviaste';
  return NOMBRE_CATEGORIA[m.categoria];
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
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
);

const iconoMovimiento = (m: Movimiento) => {
  if (m.categoria === 'divisas') return <IconDolar />;
  if (m.categoria === 'prestamo') return <IconPrestamo />;
  if (m.categoria === 'frasco') return <IconFrasco />;
  return m.tipo === 'entrante' ? <IconArrowIn /> : <IconArrowOut />;
};

function Historial() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  // ?op=<transaccion_central_id>: llega desde Home y abre ese movimiento ya desplegado.
  const [searchParams] = useSearchParams();
  const opBuscada = searchParams.get('op');
  const opResuelta = useRef<string | null>(null);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [limite, setLimite] = useState(50);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [filtroCategoria, setFiltroCategoria] = useState<'TODAS' | Categoria>('TODAS');
  const [filtroMoneda, setFiltroMoneda] = useState<'TODAS' | 'ARS' | 'USD'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | '7D' | '30D'>('TODAS');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [descargando, setDescargando] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/transferencias/mis-movimientos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setMovimientos(data.movimientos || []);
      setLimite(data.limite || 50);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [getToken]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    if (estado !== 'ok' || !opBuscada || opResuelta.current === opBuscada) return;
    opResuelta.current = opBuscada;
    const m = movimientos.find(x => x.transaccion_central_id === opBuscada);
    if (!m) return;
    const id = String(m.id);
    setAbierto(id);
    requestAnimationFrame(() => {
      const fila = document.querySelector<HTMLButtonElement>(`[aria-controls="detalle-${CSS.escape(id)}"]`);
      fila?.scrollIntoView({ block: 'center' });
      fila?.focus({ preventScroll: true });
    });
  }, [estado, opBuscada, movimientos]);

  const filtrados = useMemo(() => {
    const ahora = Date.now();
    const limiteMs = filtroFecha === '7D' ? 7 * DIA_MS : filtroFecha === '30D' ? 30 * DIA_MS : null;
    return movimientos.filter(m => {
      if (filtroCategoria !== 'TODAS' && m.categoria !== filtroCategoria) return false;
      if (filtroMoneda !== 'TODAS' && m.moneda !== filtroMoneda) return false;
      if (limiteMs !== null && ahora - new Date(m.fecha_hora).getTime() > limiteMs) return false;
      return true;
    });
  }, [movimientos, filtroCategoria, filtroMoneda, filtroFecha]);

  // Grupos por día, en el orden en que llegan (del más nuevo al más viejo).
  const dias = useMemo(() => {
    const grupos: { clave: string; nombre: string; items: Movimiento[] }[] = [];
    for (const m of filtrados) {
      const fecha = new Date(m.fecha_hora);
      const clave = claveDia(fecha);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clave === clave) ultimo.items.push(m);
      else grupos.push({ clave, nombre: nombreDia(fecha), items: [m] });
    }
    return grupos;
  }, [filtrados]);

  const hayFiltros = filtroCategoria !== 'TODAS' || filtroMoneda !== 'TODAS' || filtroFecha !== 'TODAS';
  const limpiarFiltros = () => {
    setFiltroCategoria('TODAS');
    setFiltroMoneda('TODAS');
    setFiltroFecha('TODAS');
  };

  const descargarComprobante = async (m: Movimiento) => {
    const id = String(m.id);
    setErrorDescarga(null);
    setDescargando(id);
    try {
      await bajarPdf(m.transaccion_central_id, await getToken());
    } catch {
      setErrorDescarga(id);
    } finally {
      setDescargando(null);
    }
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
              <div className={styles.chips} role="group" aria-label="Tipo de movimiento">
                {CATEGORIAS.map(({ valor, etiqueta }) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={filtroCategoria === valor}
                    onClick={() => setFiltroCategoria(valor)}
                    className={styles.chip}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
              <div className={styles.filtrosSecundarios}>
                <div className={styles.segmento} role="group" aria-label="Moneda">
                  {([
                    { valor: 'TODAS', etiqueta: 'Pesos y dólares' },
                    { valor: 'ARS', etiqueta: 'Pesos' },
                    { valor: 'USD', etiqueta: 'Dólares' },
                  ] as const).map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtroMoneda === valor}
                      onClick={() => setFiltroMoneda(valor)}
                      className={styles.segmentoBoton}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <div className={styles.segmento} role="group" aria-label="Período">
                  {([
                    { valor: 'TODAS', etiqueta: 'Siempre' },
                    { valor: '7D', etiqueta: '7 días' },
                    { valor: '30D', etiqueta: '30 días' },
                  ] as const).map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={filtroFecha === valor}
                      onClick={() => setFiltroFecha(valor)}
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

            <p className={styles.srOnly} aria-live="polite">
              {filtrados.length === 1 ? '1 movimiento' : `${filtrados.length} movimientos`}
            </p>

            {filtrados.length === 0 && (
              <div className={styles.vacio}>
                <p>No hay movimientos con estos filtros.</p>
                <button type="button" className={styles.btnSecundario} onClick={limpiarFiltros}>Ver todos</button>
              </div>
            )}

            {dias.map(dia => (
              <section key={dia.clave} className={styles.dia} aria-labelledby={`dia-${dia.clave}`}>
                <h2 id={`dia-${dia.clave}`} className={styles.diaTitulo}>{dia.nombre}</h2>
                <ul className={styles.libro}>
                  {dia.items.map(m => {
                    const id = String(m.id);
                    const entrante = m.tipo === 'entrante';
                    const fecha = new Date(m.fecha_hora);
                    const monto = formatearImporte(Number(m.importe), m.moneda);
                    const titulo = tituloMovimiento(m);
                    const estaAbierto = abierto === id;
                    const esTransferencia = m.categoria === 'transferencia';
                    return (
                      <li key={id} className={styles.item}>
                        <button
                          type="button"
                          className={styles.fila}
                          aria-expanded={estaAbierto}
                          aria-controls={`detalle-${id}`}
                          onClick={() => setAbierto(estaAbierto ? null : id)}
                        >
                          <span
                            className={`${styles.icono} ${entrante ? styles.iconoEntrante : styles.iconoSaliente}`}
                            aria-hidden="true"
                          >
                            {iconoMovimiento(m)}
                          </span>
                          <span className={styles.info}>
                            <span className={styles.titulo}>{titulo}</span>
                            <span className={styles.meta}>{detalleMovimiento(m)} · {formatearHora(fecha)}</span>
                          </span>
                          <span className={`${styles.monto} ${entrante ? styles.montoEntrante : ''}`}>
                            <span aria-hidden="true">{entrante ? '+ ' : '− '}</span>
                            <span className={styles.srOnly}>{entrante ? 'Ingreso de ' : 'Egreso de '}</span>
                            {monto}
                          </span>
                          <span className={`${styles.chevron} ${estaAbierto ? styles.chevronAbierto : ''}`} aria-hidden="true">
                            <IconChevron />
                          </span>
                        </button>

                        {estaAbierto && (
                          <div id={`detalle-${id}`} className={styles.detalle}>
                            <dl className={styles.datos}>
                              <div>
                                <dt>Fecha</dt>
                                <dd>{fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}, {formatearHora(fecha)} h</dd>
                              </div>
                              {esTransferencia && (
                                <div>
                                  <dt>{entrante ? 'Desde' : 'Hacia'}</dt>
                                  <dd className={styles.mono}>{(entrante ? m.cbu_origen : m.cbu_destino) || 'Cuenta externa'}</dd>
                                </div>
                              )}
                              <div>
                                <dt>{entrante ? 'Acreditado en' : 'Debitado de'}</dt>
                                <dd className={styles.mono}>{(entrante ? m.cbu_destino : m.cbu_origen) || '—'}</dd>
                              </div>
                              <div>
                                <dt>Operación</dt>
                                <dd className={styles.mono}>{m.transaccion_central_id}</dd>
                              </div>
                            </dl>
                            {esTransferencia && (
                              <div className={styles.acciones}>
                                <button
                                  type="button"
                                  className={styles.btnSecundario}
                                  onClick={() => descargarComprobante(m)}
                                  disabled={descargando === id}
                                >
                                  <IconDescarga />
                                  {descargando === id ? 'Generando comprobante…' : 'Descargar comprobante'}
                                </button>
                                {errorDescarga === id && (
                                  <p className={styles.errorDescarga} role="alert">
                                    No pudimos generar el comprobante. Probá de nuevo en un momento.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}

            {movimientos.length >= limite && (
              <p className={styles.nota}>Estás viendo tus últimos {limite} movimientos.</p>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Historial;
