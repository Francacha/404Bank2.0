import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import styles from './BandejaSolicitudes.module.css';

// Bandeja de solicitudes de préstamos y tarjetas para el personal.
// Empleado: pre-aprueba o rechaza lo pendiente. Gerente: aprueba (acredita / emite) o rechaza lo pre-aprobado.

const API_URL = 'http://localhost:3000';

type Rol = 'empleado' | 'gerente';
type Tipo = 'prestamo' | 'tarjeta';

interface Mora { en_mora: boolean; deuda: number; punitorios: number }

interface Solicitud {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  cbu: string;
  fecha_solicitud: string;
  saldo_cuenta?: number | string;
  pre_aprobado_por?: string | null;
  // préstamos
  monto?: number | string;
  cant_cuotas?: number;
  tna?: number | string;
  cuota_estimada?: number;
  total_estimado?: number;
  mora?: Mora | null;
  situacion_crediticia?: { situacion: number } | null;
  // tarjetas
  tipo?: 'debito' | 'credito';
}

export interface ResumenBandeja { total: number }

const MOTIVOS = [
  { valor: 'situacion_crediticia', etiqueta: 'Situación crediticia en el BCRA' },
  { valor: 'ingresos_insuficientes', etiqueta: 'Ingresos insuficientes' },
  { valor: 'deuda_vigente', etiqueta: 'Deuda o cuotas impagas' },
  { valor: 'datos_inconsistentes', etiqueta: 'Datos que no coinciden' },
  { valor: 'otro', etiqueta: 'Otro motivo' },
];

const SITUACION: Record<number, string> = {
  1: 'Normal', 2: 'Riesgo bajo', 3: 'Riesgo medio', 4: 'Riesgo alto', 5: 'Irrecuperable',
};

const pesos = (valor: number | string | undefined) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(Number(valor ?? 0));

const antiguedad = (fecha: string) => {
  const horas = Math.floor((Date.now() - new Date(fecha).getTime()) / 3_600_000);
  if (horas < 1) return 'hace menos de 1 h';
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
};

const nombreDe = (s: Solicitud) => `${s.nombre} ${s.apellido}`;
const clave = (tipo: Tipo, id: number) => `${tipo}-${id}`;

function ChipSituacion({ s }: { s: Solicitud }) {
  const n = s.situacion_crediticia?.situacion;
  if (!n) return <span className={`${styles.chip} ${styles.chipNeutro}`}>BCRA sin datos</span>;
  const clase = n <= 1 ? styles.chipOk : n === 2 ? styles.chipAviso : styles.chipRiesgo;
  return <span className={`${styles.chip} ${clase}`}>BCRA {n}: {SITUACION[n] ?? 'Desconocida'}</span>;
}

function BandejaSolicitudes({ rol, onResumen }: { rol: Rol; onResumen?: (r: ResumenBandeja) => void }) {
  const { getToken } = useAuth();
  const esGerente = rol === 'gerente';

  const [prestamos, setPrestamos] = useState<Solicitud[]>([]);
  const [tarjetas, setTarjetas] = useState<Solicitud[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [abierta, setAbierta] = useState<string | null>(null);
  const [modo, setModo] = useState<'ver' | 'confirmar' | 'rechazar'>('ver');
  const [motivo, setMotivo] = useState('');
  const [detalle, setDetalle] = useState('');
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [errorFila, setErrorFila] = useState<{ clave: string; texto: string } | null>(null);
  const [aviso, setAviso] = useState('');

  const cabeceras = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const headers = await cabeceras();
      const [rp, rt] = await Promise.all([
        fetch(`${API_URL}/api/prestamos/${esGerente ? 'pre-aprobados' : 'pendientes'}`, { headers }),
        fetch(`${API_URL}/api/tarjetas/${esGerente ? 'pre-aprobadas' : 'pendientes'}`, { headers }),
      ]);
      const [dp, dt] = await Promise.all([rp.json().catch(() => null), rt.json().catch(() => null)]);
      // Una bandeja que no cargó no es una bandeja vacía: se informa el error.
      if (!rp.ok || !rt.ok || !dp || !dt) throw new Error();
      setPrestamos(dp.prestamos || []);
      setTarjetas(dt.tarjetas || []);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [cabeceras, esGerente]);

  useEffect(() => { cargar(); }, [cargar]);

  const total = prestamos.length + tarjetas.length;
  useEffect(() => {
    if (estado === 'ok') onResumen?.({ total });
  }, [estado, total, onResumen]);

  const masAntigua = [...prestamos, ...tarjetas]
    .map(s => s.fecha_solicitud)
    .sort()[0];

  const abrir = (k: string) => {
    setAbierta(a => (a === k ? null : k));
    setModo('ver');
    setMotivo('');
    setDetalle('');
    setErrorFila(null);
  };

  const resolver = async (tipo: Tipo, s: Solicitud, accion: 'aprobar' | 'rechazar') => {
    const k = clave(tipo, s.id);
    const ruta = accion === 'rechazar' ? 'rechazar' : esGerente ? 'aprobar' : 'pre-aprobar';
    setEnCurso(k);
    setErrorFila(null);
    try {
      const res = await fetch(`${API_URL}/api/${tipo === 'prestamo' ? 'prestamos' : 'tarjetas'}/${s.id}/${ruta}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await cabeceras()) },
        body: accion === 'rechazar' ? JSON.stringify({ motivo, detalle }) : undefined,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorFila({
          clave: k,
          texto: data?.error || 'No pudimos resolver la solicitud. Probá de nuevo.',
        });
        return;
      }
      // Resuelta: sale de la bandeja sin recargar todo (y sin volver a consultar al BCRA).
      if (tipo === 'prestamo') setPrestamos(l => l.filter(x => x.id !== s.id));
      else setTarjetas(l => l.filter(x => x.id !== s.id));
      setAbierta(null);
      const que = tipo === 'prestamo' ? `el préstamo de ${nombreDe(s)}` : `la tarjeta de ${nombreDe(s)}`;
      setAviso(
        accion === 'rechazar'
          ? `Rechazaste ${que}. Va a ver el motivo en su cuenta.`
          : esGerente
            ? tipo === 'prestamo'
              ? `Aprobaste ${que}: le acreditamos ${pesos(s.monto)}.`
              : `Aprobaste ${que}: ya está activa.`
            : `Pre-aprobaste ${que}. Ahora la revisa un gerente.`
      );
    } catch {
      setErrorFila({ clave: k, texto: 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.' });
    } finally {
      setEnCurso(null);
    }
  };

  const etiquetaAprobar = (tipo: Tipo, s: Solicitud) =>
    !esGerente ? 'Pre-aprobar' : tipo === 'prestamo' ? `Aprobar y acreditar ${pesos(s.monto)}` : 'Aprobar y emitir';

  const renderFila = (tipo: Tipo, s: Solicitud) => {
    const k = clave(tipo, s.id);
    const estaAbierta = abierta === k;
    const ocupada = enCurso === k;
    const resumen = tipo === 'prestamo'
      ? `Préstamo de ${pesos(s.monto)} en ${s.cant_cuotas} cuota${s.cant_cuotas === 1 ? '' : 's'}`
      : `Tarjeta de ${s.tipo === 'credito' ? 'crédito' : 'débito'}`;

    return (
      <li key={k} className={styles.fila}>
        <button
          type="button"
          className={styles.cabecera}
          aria-expanded={estaAbierta}
          aria-controls={`detalle-${k}`}
          onClick={() => abrir(k)}
        >
          <span className={styles.quien}>
            <span className={styles.nombre}>{nombreDe(s)}</span>
            <span className={styles.meta}>DNI {Number(s.dni).toLocaleString('es-AR')} · {antiguedad(s.fecha_solicitud)}</span>
          </span>
          <span className={styles.que}>{resumen}</span>
          {tipo === 'prestamo' && <ChipSituacion s={s} />}
          {tipo === 'prestamo' && s.mora?.en_mora && <span className={`${styles.chip} ${styles.chipRiesgo}`}>En mora</span>}
          <span className={styles.revisar} aria-hidden="true">{estaAbierta ? 'Cerrar' : 'Revisar'}</span>
        </button>

        {estaAbierta && (
          <div id={`detalle-${k}`} className={styles.detalle}>
            <dl className={styles.datos}>
              {tipo === 'prestamo' && (
                <>
                  <div><dt>Monto</dt><dd className={styles.cifra}>{pesos(s.monto)}</dd></div>
                  <div><dt>Cuotas</dt><dd className={styles.cifra}>{s.cant_cuotas} de {pesos(s.cuota_estimada)}</dd></div>
                  <div><dt>Total a devolver</dt><dd className={styles.cifra}>{pesos(s.total_estimado)}</dd></div>
                  <div><dt>TNA</dt><dd className={styles.cifra}>{Number(s.tna).toLocaleString('es-AR')} %</dd></div>
                  <div>
                    <dt>Mora</dt>
                    <dd>{s.mora?.en_mora ? `Sí: debe ${pesos(s.mora.deuda)}` : 'No tiene cuotas impagas'}</dd>
                  </div>
                </>
              )}
              <div><dt>Saldo de la cuenta</dt><dd className={styles.cifra}>{pesos(s.saldo_cuenta)}</dd></div>
              <div><dt>CBU</dt><dd className={styles.cifra}>{s.cbu}</dd></div>
              <div><dt>Pedido el</dt><dd>{new Date(s.fecha_solicitud).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
              {esGerente && <div><dt>Pre-aprobado por</dt><dd>{s.pre_aprobado_por || 'Sin registro'}</dd></div>}
            </dl>

            {modo === 'ver' && (
              <div className={styles.acciones}>
                <button
                  type="button"
                  className={styles.btnAprobar}
                  disabled={ocupada}
                  onClick={() => (esGerente ? setModo('confirmar') : resolver(tipo, s, 'aprobar'))}
                  aria-label={`${etiquetaAprobar(tipo, s)} a ${nombreDe(s)}`}
                >
                  {ocupada ? 'Procesando…' : etiquetaAprobar(tipo, s)}
                </button>
                <button
                  type="button"
                  className={styles.btnRechazar}
                  disabled={ocupada}
                  onClick={() => setModo('rechazar')}
                  aria-label={`Rechazar la solicitud de ${nombreDe(s)}`}
                >
                  Rechazar
                </button>
              </div>
            )}

            {modo === 'confirmar' && (
              <div className={styles.confirmacion} role="group" aria-label="Confirmar aprobación">
                <p>
                  {tipo === 'prestamo'
                    ? <>Vas a acreditar <strong className={styles.cifra}>{pesos(s.monto)}</strong> en la cuenta de {nombreDe(s)} y generar {s.cant_cuotas} cuota{s.cant_cuotas === 1 ? '' : 's'} de {pesos(s.cuota_estimada)}. No se puede deshacer.</>
                    : <>Vas a emitir la tarjeta de {s.tipo === 'credito' ? 'crédito' : 'débito'} de {nombreDe(s)}. Queda activa al instante.</>}
                </p>
                <div className={styles.acciones}>
                  <button type="button" className={styles.btnAprobar} disabled={ocupada} onClick={() => resolver(tipo, s, 'aprobar')}>
                    {ocupada ? 'Procesando…' : 'Sí, aprobar'}
                  </button>
                  <button type="button" className={styles.btnVolver} disabled={ocupada} onClick={() => setModo('ver')}>Volver</button>
                </div>
              </div>
            )}

            {modo === 'rechazar' && (
              <form
                className={styles.confirmacion}
                onSubmit={e => { e.preventDefault(); resolver(tipo, s, 'rechazar'); }}
              >
                <div className={styles.campo}>
                  <label htmlFor={`motivo-${k}`} className={styles.label}>Motivo (lo ve el cliente)</label>
                  <select id={`motivo-${k}`} className={styles.input} value={motivo} onChange={e => setMotivo(e.target.value)} required>
                    <option value="">Elegí un motivo</option>
                    {MOTIVOS.map(m => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`detalle-texto-${k}`} className={styles.label}>
                    Detalle {motivo === 'otro' ? '' : <span className={styles.opcional}>(opcional)</span>}
                  </label>
                  <textarea
                    id={`detalle-texto-${k}`}
                    className={styles.textarea}
                    rows={2}
                    maxLength={240}
                    value={detalle}
                    onChange={e => setDetalle(e.target.value)}
                    required={motivo === 'otro'}
                  />
                </div>
                <div className={styles.acciones}>
                  <button
                    type="submit"
                    className={styles.btnRechazarFuerte}
                    disabled={ocupada || !motivo || (motivo === 'otro' && !detalle.trim())}
                  >
                    {ocupada ? 'Procesando…' : 'Rechazar solicitud'}
                  </button>
                  <button type="button" className={styles.btnVolver} disabled={ocupada} onClick={() => setModo('ver')}>Volver</button>
                </div>
              </form>
            )}

            {errorFila?.clave === k && <p className={styles.error} role="alert">{errorFila.texto}</p>}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className={styles.bandeja}>
      <p className={styles.srOnly} role="status">{aviso}</p>
      {aviso && <p className={styles.aviso} aria-hidden="true">{aviso}</p>}

      {estado === 'cargando' && <p className={styles.textoSuave} role="status">Cargando la bandeja…</p>}

      {estado === 'error' && (
        <div className={styles.avisoError} role="alert">
          <p>No pudimos cargar las solicitudes. Puede ser un problema de conexión o de permisos.</p>
          <button type="button" className={styles.btnVolver} onClick={cargar}>Reintentar</button>
        </div>
      )}

      {estado === 'ok' && (
        <>
          <p className={styles.resumen}>
            {total === 0
              ? 'Bandeja al día: no hay solicitudes esperando tu revisión.'
              : `${total} solicitud${total === 1 ? '' : 'es'} espera${total === 1 ? '' : 'n'} tu revisión${masAntigua ? `; la más antigua, ${antiguedad(masAntigua)}` : ''}.`}
          </p>

          {(['prestamo', 'tarjeta'] as const).map(tipo => {
            const lista = tipo === 'prestamo' ? prestamos : tarjetas;
            return (
              <section key={tipo} className={styles.seccion} aria-labelledby={`titulo-${tipo}`}>
                <h2 id={`titulo-${tipo}`} className={styles.seccionTitulo}>
                  {tipo === 'prestamo' ? 'Préstamos' : 'Tarjetas'} <span className={styles.contador}>{lista.length}</span>
                </h2>
                {lista.length === 0 ? (
                  <p className={styles.vacio}>
                    {tipo === 'prestamo'
                      ? esGerente ? 'No hay préstamos pre-aprobados esperando tu aprobación.' : 'No hay préstamos pendientes de revisión.'
                      : esGerente ? 'No hay tarjetas pre-aprobadas esperando tu aprobación.' : 'No hay tarjetas pendientes de revisión.'}
                  </p>
                ) : (
                  <ul className={styles.lista}>{lista.map(s => renderFila(tipo, s))}</ul>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}

export default BandejaSolicitudes;
