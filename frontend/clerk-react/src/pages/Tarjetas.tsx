import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import TarjetaVisual from '../components/TarjetaVisual';
import styles from './Tarjetas.module.css';

const API_URL = 'http://localhost:3000';

type Tipo = 'debito' | 'credito';
type EstadoTarjeta = 'pendiente' | 'pre_aprobada' | 'activa' | 'rechazada';

// El listado nunca trae el número completo ni el CVV: solo los últimos 4 (ver "Ver datos").
interface Tarjeta {
  id: number;
  tipo: Tipo;
  ultimos4: string | null;
  fecha_vencimiento: string | null;
  estado: EstadoTarjeta;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  motivo_rechazo?: string | null;
}

interface DatosVisibles {
  numero: string;
  cvv: string;
}

const SEGUNDOS_VISIBLES = 30;

const NOMBRE_TIPO: Record<Tipo, string> = { debito: 'débito', credito: 'crédito' };

const OPCIONES: { tipo: Tipo; titulo: string; detalle: string }[] = [
  { tipo: 'debito', titulo: 'Débito', detalle: 'Pagás con la plata de tu cuenta en pesos.' },
  {
    tipo: 'credito',
    titulo: 'Crédito',
    detalle: 'Simulada: en 404Bank todavía no tiene límite, resumen ni vencimiento de pago.',
  },
];

// El recorrido de una solicitud, igual que lo resuelve el banco: empleado primero, gerente después.
const PASOS = ['Pedido enviado', 'Revisión de un empleado', 'Aprobación del gerente'];

const pasoActual = (estado: EstadoTarjeta) => (estado === 'pre_aprobada' ? 2 : 1);

const fechaCorta = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const IconOjo = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IconOjoTachado = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.2 3.1M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="m2 2 20 20" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);
const IconCopiar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);

function Tarjetas() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const titular = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Titular 404Bank';

  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  // Datos completos de una sola tarjeta a la vez, con cuenta regresiva para ocultarlos.
  const [visible, setVisible] = useState<{ id: number; datos: DatosVisibles } | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [pidiendoDatos, setPidiendoDatos] = useState<number | null>(null);
  const [errorDatos, setErrorDatos] = useState<number | null>(null);
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | null>(null);

  const cargarTarjetas = useCallback(async () => {
    setEstado('cargando');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setTarjetas(data.tarjetas || []);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [getToken]);

  useEffect(() => {
    cargarTarjetas();
  }, [cargarTarjetas]);

  const ocultarDatos = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setVisible(null);
    setCopiado(false);
  }, []);

  // Al llegar a cero, los datos se ocultan solos.
  useEffect(() => {
    if (visible && segundos === 0) ocultarDatos();
  }, [visible, segundos, ocultarDatos]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const verDatos = async (t: Tarjeta) => {
    setErrorDatos(null);
    setPidiendoDatos(t.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/${t.id}/datos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.numero) throw new Error();
      if (timer.current) window.clearInterval(timer.current);
      setVisible({ id: t.id, datos: { numero: data.numero, cvv: data.cvv } });
      setCopiado(false);
      setSegundos(SEGUNDOS_VISIBLES);
      timer.current = window.setInterval(() => setSegundos(s => Math.max(s - 1, 0)), 1000);
    } catch {
      setErrorDatos(t.id);
    } finally {
      setPidiendoDatos(null);
    }
  };

  const copiarNumero = async () => {
    if (!visible) return;
    try {
      await navigator.clipboard.writeText(visible.datos.numero);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const activas = tarjetas.filter(t => t.estado === 'activa');
  const enTramite = tarjetas.filter(t => t.estado === 'pendiente' || t.estado === 'pre_aprobada');
  const rechazadas = tarjetas.filter(t => t.estado === 'rechazada');

  // Una tarjeta de cada tipo: si ya hay una activa o en trámite, esa opción no se puede pedir.
  const bloqueo = (t: Tipo) => {
    if (activas.some(x => x.tipo === t)) return `Ya tenés una tarjeta de ${NOMBRE_TIPO[t]} activa.`;
    if (enTramite.some(x => x.tipo === t)) return `Tu tarjeta de ${NOMBRE_TIPO[t]} está en revisión.`;
    return null;
  };
  const opcionesLibres = OPCIONES.filter(o => !bloqueo(o.tipo));
  const tipoElegido = tipo && !bloqueo(tipo) ? tipo : opcionesLibres[0]?.tipo ?? null;

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoElegido) return;
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tipo: tipoElegido }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 409 y 400 traen un mensaje pensado para el cliente; el resto se resume.
        throw new Error(res.status === 409 || res.status === 400 ? data?.error : '');
      }
      setMensajeSolicitud(
        `Listo, pediste tu tarjeta de ${NOMBRE_TIPO[tipoElegido]}. Primero la revisa un empleado y después la aprueba un gerente.`
      );
      setTipo(null);
      await cargarTarjetas();
    } catch (err) {
      setErrorSolicitud(
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos enviar el pedido. Revisá tu conexión e intentá de nuevo.'
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AppLayout title="Tarjetas" subtitle="Tus tarjetas 404Bank y el estado de lo que pediste.">
      <div className={styles.wrapper}>
        {estado === 'cargando' && (
          <div className={styles.esqueleto} aria-busy="true">
            <p className={styles.srOnly} role="status">Cargando tus tarjetas…</p>
            <span className={styles.esqueletoTarjeta} aria-hidden="true" />
          </div>
        )}

        {estado === 'error' && (
          <div className={styles.aviso} role="alert">
            <p>No pudimos cargar tus tarjetas. Revisá tu conexión e intentá de nuevo.</p>
            <button type="button" className={styles.btnSecundario} onClick={cargarTarjetas}>Reintentar</button>
          </div>
        )}

        {estado === 'ok' && (
          <>
            <section className={styles.seccion} aria-labelledby="titulo-activas">
              <h2 id="titulo-activas" className={styles.seccionTitulo}>Tus tarjetas</h2>

              {activas.length === 0 ? (
                <div className={styles.vacio}>
                  <span className={styles.siluetaTarjeta} aria-hidden="true">
                    <span className={styles.siluetaMarca}>404<span>Bank</span></span>
                  </span>
                  <div className={styles.vacioTexto}>
                    <p className={styles.vacioTitulo}>
                      {enTramite.length > 0 ? 'Tu primera tarjeta está en camino' : 'Todavía no tenés tarjetas'}
                    </p>
                    <p>
                      {enTramite.length > 0
                        ? 'Cuando el gerente la apruebe, la vas a ver acá con su número.'
                        : 'Pedí una de débito para pagar en comercios con la plata de tu cuenta.'}
                    </p>
                  </div>
                </div>
              ) : (
                <ul className={styles.billetera}>
                  {activas.map(t => {
                    const datos = visible?.id === t.id ? visible.datos : null;
                    return (
                      <li key={t.id} className={styles.itemTarjeta}>
                        <TarjetaVisual
                          tipo={t.tipo}
                          ultimos4={t.ultimos4}
                          titular={titular}
                          vencimiento={t.fecha_vencimiento}
                          datos={datos}
                        />
                        <div className={styles.accionesTarjeta}>
                          {datos ? (
                            <>
                              <button type="button" className={styles.btnSecundario} onClick={ocultarDatos}>
                                <IconOjoTachado /> Ocultar datos
                              </button>
                              <button type="button" className={styles.btnSecundario} onClick={copiarNumero}>
                                <IconCopiar /> {copiado ? 'Número copiado' : 'Copiar número'}
                              </button>
                              <span className={styles.cuentaRegresiva} aria-hidden="true">
                                Se ocultan en {segundos} s
                              </span>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={styles.btnSecundario}
                              onClick={() => verDatos(t)}
                              disabled={pidiendoDatos === t.id}
                            >
                              <IconOjo /> {pidiendoDatos === t.id ? 'Buscando datos…' : 'Ver datos'}
                            </button>
                          )}
                        </div>
                        <p className={styles.srOnly} aria-live="polite">
                          {datos ? `Datos visibles por ${SEGUNDOS_VISIBLES} segundos.` : ''}
                          {copiado ? ' Número copiado.' : ''}
                        </p>
                        {errorDatos === t.id && (
                          <p className={styles.errorLinea} role="alert">No pudimos traer los datos. Probá de nuevo.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {(enTramite.length > 0 || rechazadas.length > 0) && (
              <section className={styles.seccion} aria-labelledby="titulo-solicitudes">
                <h2 id="titulo-solicitudes" className={styles.seccionTitulo}>Solicitudes</h2>
                <ul className={styles.libro}>
                  {enTramite.map(t => {
                    const paso = pasoActual(t.estado);
                    return (
                      <li key={t.id} className={styles.solicitud}>
                        <div className={styles.solicitudCabecera}>
                          <p className={styles.solicitudTitulo}>Tarjeta de {NOMBRE_TIPO[t.tipo]}</p>
                          <span className={styles.estadoRevision}>En revisión</span>
                        </div>
                        <p className={styles.solicitudMeta}>Pedida el {fechaCorta(t.fecha_solicitud)}</p>
                        <ol className={styles.pasos}>
                          {PASOS.map((nombre, i) => {
                            const hecho = i < paso;
                            const actual = i === paso;
                            return (
                              <li
                                key={nombre}
                                className={`${styles.paso} ${hecho ? styles.pasoHecho : ''} ${actual ? styles.pasoActual : ''}`}
                                aria-current={actual ? 'step' : undefined}
                              >
                                <span className={styles.pasoMarca} aria-hidden="true">{hecho ? <IconCheck /> : i + 1}</span>
                                <span>
                                  {nombre}
                                  <span className={styles.srOnly}>{hecho ? ': listo' : actual ? ': en curso' : ': pendiente'}</span>
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </li>
                    );
                  })}
                  {rechazadas.map(t => (
                    <li key={t.id} className={styles.solicitud}>
                      <div className={styles.solicitudCabecera}>
                        <p className={styles.solicitudTitulo}>Tarjeta de {NOMBRE_TIPO[t.tipo]}</p>
                        <span className={styles.estadoRechazada}>No aprobada</span>
                      </div>
                      <p className={styles.solicitudMeta}>
                        Pedida el {fechaCorta(t.fecha_solicitud)}
                        {t.fecha_resolucion && ` · resuelta el ${fechaCorta(t.fecha_resolucion)}`}.
                        {!bloqueo(t.tipo) && ' Podés volver a pedirla abajo.'}
                      </p>
                      {t.motivo_rechazo && <p className={styles.motivo}>Motivo: {t.motivo_rechazo}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Si ya tiene (o pidió) las dos, no hay nada que pedir: la sección no aparece. */}
            {(opcionesLibres.length > 0 || mensajeSolicitud || errorSolicitud) && (
            <section className={styles.seccion} aria-labelledby="titulo-pedir">
              <h2 id="titulo-pedir" className={styles.seccionTitulo}>Pedir una tarjeta</h2>
              <div className={styles.panelPedido}>
                {opcionesLibres.length > 0 && (
                  <form onSubmit={handleSolicitar} className={styles.form}>
                    <fieldset className={styles.opciones}>
                      <legend className={styles.srOnly}>Tipo de tarjeta</legend>
                      {OPCIONES.map(o => {
                        const motivo = bloqueo(o.tipo);
                        return (
                          <label
                            key={o.tipo}
                            className={`${styles.opcion} ${tipoElegido === o.tipo ? styles.opcionElegida : ''} ${motivo ? styles.opcionBloqueada : ''}`}
                          >
                            <input
                              type="radio"
                              name="tipo"
                              value={o.tipo}
                              className={styles.radio}
                              checked={tipoElegido === o.tipo}
                              disabled={!!motivo}
                              onChange={() => setTipo(o.tipo)}
                            />
                            <span className={styles.opcionTitulo}>{o.titulo}</span>
                            <span className={styles.opcionDetalle}>{motivo ?? o.detalle}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                    <button type="submit" disabled={enviando || !tipoElegido} className={styles.btnPrincipal}>
                      {enviando ? 'Enviando pedido…' : `Pedir tarjeta de ${tipoElegido ? NOMBRE_TIPO[tipoElegido] : ''}`}
                    </button>
                  </form>
                )}
                <div aria-live="polite">
                  {mensajeSolicitud && <p className={styles.exito}>{mensajeSolicitud}</p>}
                </div>
                {errorSolicitud && <p className={styles.errorLinea} role="alert">{errorSolicitud}</p>}
              </div>
            </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Tarjetas;
