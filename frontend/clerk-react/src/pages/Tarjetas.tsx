import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, useUser } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import TarjetaVisual from '../components/TarjetaVisual';
import styles from './Tarjetas.module.css';
import logo404Bank from '../assets/logo404bank.png';

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
  pausada?: boolean;
}

interface DatosVisibles {
  numero: string;
  cvv: string;
}

const SEGUNDOS_VISIBLES = 30;
const SEGUNDOS_MAXIMOS = 120;

const NOMBRE_TIPO: Record<Tipo, string> = { debito: 'débito', credito: 'crédito' };

const OPCIONES: { tipo: Tipo; titulo: string; detalle: string }[] = [
  { tipo: 'debito', titulo: 'Débito', detalle: 'Simulada: queda asociada a tu cuenta en pesos. 404Bank todavía no procesa compras con tarjeta.' },
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

const IconPausa = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
);
const IconPlay = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5v14l11-7Z" /></svg>
);

function Tarjetas() {
  const { getToken } = useAuth();
  const { user } = useUser();
  // El titular es el nombre registrado en el banco (Perfil); si todavía no cargó, el de la cuenta.
  const [nombreBanco, setNombreBanco] = useState<string | null>(null);
  const titular = nombreBanco || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Titular 404Bank';

  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'error'>('cargando');

  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pedidoHecho, setPedidoHecho] = useState<Tipo | null>(null);
  const [errorSolicitud, setErrorSolicitud] = useState('');

  // Datos completos de una sola tarjeta a la vez, con cuenta regresiva para ocultarlos.
  const [visible, setVisible] = useState<{ id: number; datos: DatosVisibles } | null>(null);
  const [segundos, setSegundos] = useState(0);
  // Copia de la cuenta para el tick del intervalo (ahí se avisa y se oculta, sin efectos encadenados).
  const restantes = useRef(0);
  const [pidiendoDatos, setPidiendoDatos] = useState<number | null>(null);
  const [errorDatos, setErrorDatos] = useState<number | null>(null);
  const [copiado, setCopiado] = useState<'ok' | 'error' | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const timer = useRef<number | null>(null);
  // La cuenta regresiva se frena solo mientras el puntero (mouse) está sobre la tarjeta visible.
  // En pantallas táctiles no se frena: tocar no "sale" nunca y los datos quedarían a la vista.
  const enPausa = useRef(false);
  // Sobre qué tarjeta está el mouse (aunque no tenga datos visibles) y cuánto lleva frenada la cuenta.
  const sobreTarjeta = useRef<number | null>(null);
  const segundosEnPausa = useRef(0);
  const [confirmarCancelar, setConfirmarCancelar] = useState<number | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancelar, setErrorCancelar] = useState<number | null>(null);
  const [cuentaFrenada, setCuentaFrenada] = useState(false);
  const timerCopiado = useRef<number | null>(null);
  const conMouse = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

  const [pausando, setPausando] = useState<number | null>(null);
  const [errorPausa, setErrorPausa] = useState<number | null>(null);

  const cabeceras = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const cargarTarjetas = useCallback(async () => {
    setEstado('cargando');
    try {
      const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, { headers: await cabeceras() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setTarjetas(data.tarjetas || []);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }, [cabeceras]);

  useEffect(() => {
    cargarTarjetas();
  }, [cargarTarjetas]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/onboarding/perfil`, { headers: await cabeceras() });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.nombre) setNombreBanco(`${data.nombre} ${data.apellido ?? ''}`.trim());
      } catch {
        // Sin el nombre del banco se usa el de la cuenta.
      }
    })();
  }, [cabeceras]);

  const ocultarDatos = useCallback((automatico = false, idTarjeta?: number) => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    enPausa.current = false;
    setCuentaFrenada(false);
    setVisible(null);
    setCopiado(null);
    setAnuncio(automatico ? 'Se ocultaron los datos de la tarjeta.' : 'Datos ocultos.');
    // Si el foco estaba en un control que desaparece, vuelve a "Ver datos" de esa tarjeta.
    if (automatico && idTarjeta !== undefined) {
      requestAnimationFrame(() => {
        const activo = document.activeElement;
        if (!activo || activo === document.body) document.getElementById(`ver-datos-${idTarjeta}`)?.focus();
      });
    }
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
    if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
  }, []);

  const verDatos = async (t: Tarjeta) => {
    if (pidiendoDatos !== null) return;
    setErrorDatos(null);
    setPidiendoDatos(t.id);
    try {
      const res = await fetch(`${API_URL}/api/tarjetas/${t.id}/datos`, { headers: await cabeceras(), cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.numero) throw new Error();
      if (timer.current) window.clearInterval(timer.current);
      setVisible({ id: t.id, datos: { numero: data.numero, cvv: data.cvv } });
      setCopiado(null);
      restantes.current = SEGUNDOS_VISIBLES;
      setSegundos(SEGUNDOS_VISIBLES);
      setAnuncio(`Datos visibles por ${SEGUNDOS_VISIBLES} segundos.`);
      // Si el mouse ya está sobre esa tarjeta, la cuenta arranca frenada.
      segundosEnPausa.current = 0;
      const frenada = conMouse && sobreTarjeta.current === t.id;
      enPausa.current = frenada;
      setCuentaFrenada(frenada);
      timer.current = window.setInterval(() => {
        // La pausa por mouse dura como mucho un minuto: después la cuenta sigue igual.
        if (enPausa.current && segundosEnPausa.current < 60) {
          segundosEnPausa.current += 1;
          return;
        }
        if (enPausa.current) { enPausa.current = false; setCuentaFrenada(false); }
        restantes.current = Math.max(restantes.current - 1, 0);
        setSegundos(restantes.current);
        // Aviso antes de ocultar, para quien está copiando o escuchando los datos; en cero se ocultan solos.
        if (restantes.current === 20) setAnuncio('Los datos se ocultan en 20 segundos. Podés sumar 30 segundos más.');
        if (restantes.current === 0) ocultarDatos(true, t.id);
      }, 1000);
    } catch {
      setErrorDatos(t.id);
    } finally {
      setPidiendoDatos(null);
    }
  };

  const extenderDatos = () => {
    if (segundos >= SEGUNDOS_MAXIMOS) {
      setAnuncio(`Ya está en el máximo de ${SEGUNDOS_MAXIMOS / 60} minutos.`);
      return;
    }
    const nuevos = Math.min(segundos + 30, SEGUNDOS_MAXIMOS);
    restantes.current = nuevos;
    setSegundos(nuevos);
    // El texto cambia cada vez (incluye los segundos), así el lector lo vuelve a anunciar.
    setAnuncio(`Ahora se ocultan en ${nuevos} segundos.`);
  };

  const copiarNumero = async () => {
    if (!visible) return;
    try {
      await navigator.clipboard.writeText(visible.datos.numero);
      setCopiado('ok');
      setAnuncio('Número copiado.');
    } catch {
      setCopiado('error');
    }
    if (timerCopiado.current) window.clearTimeout(timerCopiado.current);
    timerCopiado.current = window.setTimeout(() => setCopiado(c => (c === 'ok' ? null : c)), 2000);
  };

  const cambiarPausa = async (t: Tarjeta) => {
    if (pausando !== null) return;
    const pausar = !t.pausada;
    // Al pausar, si sus datos están a la vista, se ocultan primero.
    if (pausar && visible?.id === t.id) ocultarDatos();
    setErrorPausa(null);
    setPausando(t.id);
    try {
      const res = await fetch(`${API_URL}/api/tarjetas/${t.id}/pausa`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await cabeceras()) },
        body: JSON.stringify({ pausada: pausar }),
      });
      if (!res.ok) throw new Error();
      setTarjetas(lista => lista.map(x => (x.id === t.id ? { ...x, pausada: pausar } : x)));
      setAnuncio(pausar ? `Pausaste tu tarjeta de ${NOMBRE_TIPO[t.tipo]}.` : `Reactivaste tu tarjeta de ${NOMBRE_TIPO[t.tipo]}.`);
    } catch {
      setErrorPausa(t.id);
    } finally {
      setPausando(null);
    }
  };

  const activas = tarjetas.filter(t => t.estado === 'activa');
  const enTramite = tarjetas.filter(t => t.estado === 'pendiente' || t.estado === 'pre_aprobada');

  // Una tarjeta de cada tipo: si ya hay una activa o en trámite, esa opción no se puede pedir.
  const bloqueo = (t: Tipo) => {
    if (activas.some(x => x.tipo === t)) return `Ya tenés una tarjeta de ${NOMBRE_TIPO[t]} activa.`;
    if (enTramite.some(x => x.tipo === t)) return `Tu tarjeta de ${NOMBRE_TIPO[t]} está en revisión.`;
    return null;
  };
  // Un rechazo viejo deja de importar cuando ya hay una tarjeta de ese tipo activa o en trámite.
  const rechazadas = tarjetas.filter(t => t.estado === 'rechazada' && !bloqueo(t.tipo));
  const opcionesLibres = OPCIONES.filter(o => !bloqueo(o.tipo));
  const tipoElegido = tipo && !bloqueo(tipo) ? tipo : opcionesLibres[0]?.tipo ?? null;

  const cancelarPedido = async (t: Tarjeta) => {
    setErrorCancelar(null);
    setCancelando(true);
    try {
      const res = await fetch(`${API_URL}/api/tarjetas/${t.id}`, { method: 'DELETE', headers: await cabeceras() });
      if (!res.ok) throw new Error();
      setConfirmarCancelar(null);
      setAnuncio(`Cancelaste el pedido de tarjeta de ${NOMBRE_TIPO[t.tipo]}.`);
      await cargarTarjetas();
    } catch {
      setErrorCancelar(t.id);
    } finally {
      setCancelando(false);
    }
  };

  const irAPedir = () => {
    document.getElementById('titulo-pedir')?.scrollIntoView({ block: 'start' });
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('input[name="tipo"]:not(:disabled)')?.focus());
  };

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipoElegido) return;
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/tarjetas/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await cabeceras()) },
        body: JSON.stringify({ tipo: tipoElegido }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // 409 y 400 traen un mensaje pensado para el cliente; el resto se resume.
        throw new Error(res.status === 409 || res.status === 400 ? data?.error : '');
      }
      setPedidoHecho(tipoElegido);
      setTipo(null);
      await cargarTarjetas();
      requestAnimationFrame(() => document.getElementById('pedido-hecho')?.focus());
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

  const mostrarPedir = opcionesLibres.length > 0 || pedidoHecho !== null || !!errorSolicitud;
  const mostrarSolicitudes = enTramite.length > 0 || rechazadas.length > 0;
  // Sin nada a la derecha, las tarjetas usan todo el ancho (una al lado de la otra).
  const sinLateral = estado === 'ok' && !mostrarPedir && !mostrarSolicitudes;

  return (
    <AppLayout ancho="completo" title="Tarjetas" subtitle="Tus tarjetas 404Bank y el estado de lo que pediste.">
      <div className={`${styles.wrapper} ${sinLateral ? styles.sinLateral : ''}`}>
        <p className={styles.srOnly} aria-live="polite">{anuncio}</p>

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
            <section className={`${styles.seccion} ${styles.seccionBilletera}`} aria-labelledby="titulo-activas">
              <h2 id="titulo-activas" className={styles.seccionTitulo}>Tus tarjetas</h2>

              {activas.length === 0 ? (
                // Sin tarjetas: la silueta ocupa el lugar real de la tarjeta, con el paso siguiente a mano.
                <div className={styles.fantasma}>
                  <div className={styles.fantasmaTarjeta} aria-hidden="true">
                    <img src={logo404Bank} alt="" width={140} height={28} className={styles.fantasmaLogo} />
                    <span className={styles.fantasmaChip} />
                  </div>
                  <div className={styles.fantasmaTexto}>
                    <p className={styles.vacioTitulo}>
                      {enTramite.length > 0 ? 'Tu primera tarjeta está en camino' : 'Todavía no tenés tarjetas'}
                    </p>
                    <p>
                      {enTramite.length > 0
                        ? 'Cuando el gerente la apruebe, la vas a ver acá con su número.'
                        : 'Pedí una de débito: queda asociada a tu cuenta en pesos.'}
                    </p>
                    {enTramite.length === 0 && opcionesLibres.length > 0 && (
                      <button type="button" className={styles.btnSecundario} onClick={irAPedir}>Pedir una tarjeta</button>
                    )}
                  </div>
                </div>
              ) : (
                <ul className={styles.billetera}>
                  {activas.map(t => {
                    const datos = visible?.id === t.id ? visible.datos : null;
                    return (
                      <li key={t.id} className={styles.itemTarjeta}>
                        <div
                          onMouseEnter={() => {
                            sobreTarjeta.current = t.id;
                            if (datos && conMouse) { enPausa.current = true; setCuentaFrenada(true); }
                          }}
                          onMouseLeave={() => {
                            sobreTarjeta.current = null;
                            enPausa.current = false;
                            setCuentaFrenada(false);
                          }}
                        >
                          <TarjetaVisual
                            tipo={t.tipo}
                            ultimos4={t.ultimos4}
                            titular={titular}
                            vencimiento={t.fecha_vencimiento}
                            datos={datos}
                            pausada={!!t.pausada}
                          />
                        </div>
                        {/* "Activa" no se dice: todas las de esta lista lo están. La pausa ya se ve en la tarjeta. */}
                        <p className={styles.pie}>
                          {t.pausada
                            ? 'Pausada: no se pueden ver sus datos y el personal del banco la ve pausada.'
                            : t.fecha_resolucion ? `Aprobada el ${fechaCorta(t.fecha_resolucion)}` : null}
                        </p>
                        <div className={styles.accionesTarjeta}>
                          {/* Un solo botón que cambia de estado: el foco no se pierde al mostrar u ocultar. */}
                          {!t.pausada && (
                          <button
                            type="button"
                            id={`ver-datos-${t.id}`}
                            className={styles.btnSecundario}
                            onClick={() => (datos ? ocultarDatos() : verDatos(t))}
                            aria-busy={pidiendoDatos === t.id}
                          >
                            {datos ? <IconOjoTachado /> : <IconOjo />}
                            {pidiendoDatos === t.id ? 'Buscando datos…' : datos ? 'Ocultar datos' : 'Ver datos'}
                          </button>
                          )}
                          {datos && (
                            <>
                              <button type="button" className={styles.btnSecundario} onClick={copiarNumero}>
                                <IconCopiar /> {copiado === 'ok' ? 'Copiado' : 'Copiar número'}
                              </button>
                              <button
                                type="button"
                                className={styles.btnTexto}
                                onClick={extenderDatos}
                                aria-label="Sumar 30 segundos antes de ocultar"
                              >
                                +30 s
                              </button>
                              <span className={styles.cuentaRegresiva} aria-hidden="true">
                                {cuentaFrenada ? `En pausa mientras mirás la tarjeta · ${segundos} s` : `Se ocultan en ${segundos} s`}
                              </span>
                            </>
                          )}
                          {!datos && (
                            <button
                              type="button"
                              className={styles.btnSecundario}
                              onClick={() => cambiarPausa(t)}
                              aria-busy={pausando === t.id}
                            >
                              {t.pausada ? <IconPlay /> : <IconPausa />}
                              {pausando === t.id ? 'Guardando…' : t.pausada ? 'Reactivar tarjeta' : 'Pausar tarjeta'}
                            </button>
                          )}
                        </div>
                        {copiado === 'error' && datos && (
                          <p className={styles.errorLinea} role="alert">No pudimos copiar. Seleccioná el número en la tarjeta.</p>
                        )}
                        {errorDatos === t.id && (
                          <p className={styles.errorLinea} role="alert">No pudimos traer los datos. Probá de nuevo.</p>
                        )}
                        {errorPausa === t.id && (
                          <p className={styles.errorLinea} role="alert">No pudimos cambiar el estado de la tarjeta. Probá de nuevo.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {mostrarSolicitudes && (
              <section className={`${styles.seccion} ${styles.seccionLateral}`} aria-labelledby="titulo-solicitudes">
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
                        {t.estado === 'pendiente' && (
                          <div className={styles.accionesSolicitud}>
                            {confirmarCancelar === t.id ? (
                              <>
                                <span className={styles.solicitudMeta}>¿Cancelar el pedido?</span>
                                <button type="button" className={styles.btnTexto} onClick={() => cancelarPedido(t)} aria-busy={cancelando}>
                                  {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                                </button>
                                <button type="button" className={styles.btnTexto} onClick={() => setConfirmarCancelar(null)}>No</button>
                              </>
                            ) : (
                              <button type="button" className={styles.btnTexto} onClick={() => setConfirmarCancelar(t.id)}>
                                Cancelar pedido
                              </button>
                            )}
                          </div>
                        )}
                        {errorCancelar === t.id && (
                          <p className={styles.errorLinea} role="alert">No pudimos cancelarlo. Puede que ya esté en revisión.</p>
                        )}
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
                      </p>
                      {t.motivo_rechazo && <p className={styles.motivo}>Motivo: {t.motivo_rechazo}</p>}
                      <div className={styles.accionesSolicitud}>
                        <button type="button" className={styles.btnTexto} onClick={() => { setTipo(t.tipo); irAPedir(); }}>
                          Volver a pedirla
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {mostrarPedir && (
              <section className={`${styles.seccion} ${styles.seccionLateral}`} aria-labelledby="titulo-pedir">
                <h2 id="titulo-pedir" className={styles.seccionTitulo}>Pedir una tarjeta</h2>
                <div className={styles.panelPedido}>
                  {pedidoHecho ? (
                    // Después de pedir, el formulario se cierra en la confirmación: no invita a un segundo pedido.
                    <div className={styles.confirmacion}>
                      <p id="pedido-hecho" tabIndex={-1} className={styles.exito}>
                        Listo, pediste tu tarjeta de {NOMBRE_TIPO[pedidoHecho]}. Primero la revisa un empleado y después la aprueba un gerente.
                      </p>
                      {opcionesLibres.length > 0 && (
                        <button type="button" className={styles.btnTexto} onClick={() => setPedidoHecho(null)}>
                          Pedir otra tarjeta
                        </button>
                      )}
                    </div>
                  ) : opcionesLibres.length > 0 && (
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
