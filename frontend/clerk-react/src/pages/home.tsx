import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import TarjetaVisual from '../components/TarjetaVisual';
import styles from './home.module.css';
import banListo from '../assets/banListo.png';

interface Cuenta {
  cbu: string;
  alias?: string | null;
  saldo: number;
  moneda: 'ARS' | 'USD';
}

interface Tarjeta {
  id: number;
  tipo: string;
  ultimos4: string | null;
  fecha_vencimiento: string | null;
  estado: string;
}

interface SituacionCrediticia {
  dni: string;
  situacion: number;
  deudas: unknown[];
}

interface CuotaPrestamo {
  numero_cuota: number;
  monto: number;
  punitorios: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'vencida' | 'pagada';
}

interface Prestamo {
  id: number;
  estado: string;
  cant_cuotas: number | null;
  cuotas: CuotaPrestamo[];
}

interface Mora {
  en_mora: boolean;
  deuda: number;
  punitorios: number;
}

interface Movimiento {
  id: number;
  transaccion_central_id: string;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: 'entrante' | 'saliente';
  fecha_hora: string;
  moneda: 'ARS' | 'USD';
  nombre_contraparte: string | null;
}

const API_URL = 'http://localhost:3000';

// Situaciones de la Central de Deudores: qué significa cada una, en palabras del usuario.
const SITUACION_INFO: Record<number, { etiqueta: string; claseColor: string; significado: string }> = {
  1: { etiqueta: 'Normal', claseColor: 'situacion1', significado: 'Pagás tus deudas al día o con menos de 31 días de atraso.' },
  2: { etiqueta: 'Riesgo bajo', claseColor: 'situacion2', significado: 'Tenés pagos atrasados entre 31 y 90 días.' },
  3: { etiqueta: 'Riesgo medio', claseColor: 'situacion3', significado: 'Tenés pagos atrasados entre 91 y 180 días.' },
  4: { etiqueta: 'Riesgo alto', claseColor: 'situacion4', significado: 'Tenés pagos atrasados entre 181 días y un año.' },
  5: { etiqueta: 'Irrecuperable', claseColor: 'situacion5', significado: 'Tenés pagos atrasados por más de un año.' },
};

const IconCard = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
);
const IconSend = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13" /><path d="m13 6 6 6-6 6" /></svg>
);
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IconArrowIn = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7 7 17" /><path d="M16 17H7V8" /></svg>
);
const IconArrowOut = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
);

type EstadoCarga = 'cargando' | 'ok' | 'error';

function Home() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [tarjetaIdx, setTarjetaIdx] = useState(0);
  const [cuentaActiva, setCuentaActiva] = useState<'pesos' | 'dolares'>('pesos');
  const [abriendoCuentaUSD, setAbriendoCuentaUSD] = useState(false);
  const [mensajeCuentaUSD, setMensajeCuentaUSD] = useState('');
  const [errorUsd, setErrorUsd] = useState('');
  const [copiado, setCopiado] = useState<'cbu' | 'alias' | null>(null);
  const [errorCopia, setErrorCopia] = useState(false);
  const [estadoTarjetas, setEstadoTarjetas] = useState<EstadoCarga>('cargando');
  const [tarjetasPendientes, setTarjetasPendientes] = useState(0);
  const [estadoSituacion, setEstadoSituacion] = useState<EstadoCarga>('cargando');
  const [estadoPrestamos, setEstadoPrestamos] = useState<EstadoCarga>('cargando');
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [mora, setMora] = useState<Mora | null>(null);
  const [errorMovimientos, setErrorMovimientos] = useState(false);
  const [situacionCrediticia, setSituacionCrediticia] = useState<SituacionCrediticia | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const navigate = useNavigate();

  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const cuentasARS = cuentas.filter(cuenta => cuenta.moneda === 'ARS');
  const cuentasUSD = cuentas.filter(cuenta => cuenta.moneda === 'USD');
  const primaryAccount = cuentasARS[0];
  const primaryUsdAccount = cuentasUSD[0];
  const cuentaMostrada = cuentaActiva === 'pesos' ? primaryAccount : primaryUsdAccount;

  const obtenerCuentas = useCallback(async (): Promise<Cuenta[]> => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/cuentas/mis-cuentas`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar las cuentas');
    return data.cuentas;
  }, [getToken]);

  const cargarCuentas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCuentas(await obtenerCuentas());
    } catch {
      // El detalle técnico queda en la consola del backend; acá le decimos al usuario qué hacer.
      setError('No pudimos cargar tus cuentas.');
    } finally {
      setLoading(false);
    }
  }, [obtenerCuentas]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  const abrirCuentaUSD = async () => {
    setAbriendoCuentaUSD(true);
    setErrorUsd('');
    setMensajeCuentaUSD('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/caja-ahorro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ moneda: 'USD' }),
      });
      if (!res.ok) throw new Error('No pudimos abrir tu cuenta en dólares. Probá de nuevo en unos minutos.');

      setMensajeCuentaUSD('¡Listo! Ya tenés tu cuenta en dólares.');
      // La cuenta ya se abrió: si después falla la recarga, lo informa el hero (no este flujo).
      cargarCuentas();
    } catch (err: unknown) {
      // Error propio: si falla abrir la cuenta en dólares, el saldo en pesos se sigue viendo.
      if (err instanceof Error) setErrorUsd(err.message);
      else setErrorUsd('No pudimos abrir la cuenta en dólares. Intentá de nuevo.');
    } finally {
      setAbriendoCuentaUSD(false);
    }
  };

  const copiar = async (texto: string, cual: 'cbu' | 'alias') => {
    setErrorCopia(false);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
    } catch {
      // Sin portapapeles (p. ej. HTTP en la red local): avisamos y el texto queda seleccionable a mano.
      setErrorCopia(true);
    }
  };

  const cambiarMoneda = (moneda: 'pesos' | 'dolares') => {
    setCuentaActiva(moneda);
    setCopiado(null);
    setErrorCopia(false);
  };

  useEffect(() => {
    if (!copiado) return;
    const timer = setTimeout(() => setCopiado(null), 1800);
    return () => clearTimeout(timer);
  }, [copiado]);

  useEffect(() => {
    if (!user || user.firstName) return;
    const syncNombre = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/onboarding/perfil`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.nombre) {
          await user.update({ firstName: data.nombre, lastName: data.apellido ?? '' });
        }
      } catch {
        // La sincronización del nombre es opcional para la pantalla.
      }
    };
    syncNombre();
  }, [user, getToken]);

  const cargarTarjetas = useCallback(async () => {
    setEstadoTarjetas('cargando');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const todas: Tarjeta[] = data.tarjetas || [];
      setTarjetas(todas.filter(t => t.estado === 'activa'));
      setTarjetasPendientes(todas.filter(t => t.estado === 'pendiente' || t.estado === 'pre_aprobada').length);
      setEstadoTarjetas('ok');
    } catch {
      // Las tarjetas no bloquean la carga del resumen de cuentas.
      setEstadoTarjetas('error');
    }
  }, [getToken]);

  useEffect(() => {
    cargarTarjetas();
  }, [cargarTarjetas]);

  const cargarSituacion = useCallback(async () => {
    setEstadoSituacion('cargando');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/mi-situacion-crediticia`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSituacionCrediticia(data.situacion_crediticia);
      setEstadoSituacion('ok');
    } catch {
      // La situación crediticia es informativa, no bloquea el resto de la pantalla.
      setEstadoSituacion('error');
    }
  }, [getToken]);

  useEffect(() => {
    cargarSituacion();
  }, [cargarSituacion]);

  const cargarPrestamos = useCallback(async () => {
    setEstadoPrestamos('cargando');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/mis-prestamos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrestamos(data.prestamos || []);
      setMora(data.mora ?? null);
      setEstadoPrestamos('ok');
    } catch {
      setEstadoPrestamos('error');
    }
  }, [getToken]);

  useEffect(() => {
    cargarPrestamos();
  }, [cargarPrestamos]);

  // La cuota que viene: la impaga con vencimiento más cercano entre los préstamos aprobados.
  const proximaCuota = prestamos
    .filter(p => p.estado === 'aprobado')
    .flatMap(p => p.cuotas.filter(c => c.estado !== 'pagada').map(c => ({ ...c, total: p.cant_cuotas ?? p.cuotas.length })))
    .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())[0];
  const infoSituacion = situacionCrediticia ? SITUACION_INFO[situacionCrediticia.situacion] : undefined;

  const cargarMovimientos = useCallback(async () => {
    setLoadingMovimientos(true);
    setErrorMovimientos(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // El backend ya las devuelve de la más nueva a la más vieja.
      setMovimientos((data.transferencias || []).slice(0, 4));
    } catch {
      // Los movimientos recientes son informativos, no bloquean el resto de la pantalla.
      setErrorMovimientos(true);
    } finally {
      setLoadingMovimientos(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarMovimientos();
  }, [cargarMovimientos]);

  const formatearMonto = (monto: number, moneda: 'ARS' | 'USD') =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);

  return (
    <AppLayout title={user?.firstName ? `Hola, ${user.firstName}` : 'Hola'} subtitle="Tu plata, de un vistazo.">
        <div className={styles.homeBody}>

        <section className={styles.hero}>
          <div className={styles.heroTop}>
            {/* Primero en el DOM: la moneda se elige antes de leer la cifra (y el foco sigue ese orden). */}
            <div className={styles.heroTabs} role="group" aria-label="Moneda de la cuenta">
              <button
                className={`${styles.heroTab} ${cuentaActiva === 'pesos' ? styles.heroTabActive : ''}`}
                onClick={() => cambiarMoneda('pesos')}
                aria-pressed={cuentaActiva === 'pesos'}
              >
                Pesos
              </button>
              <button
                className={`${styles.heroTab} ${cuentaActiva === 'dolares' ? styles.heroTabActive : ''}`}
                onClick={() => cambiarMoneda('dolares')}
                aria-pressed={cuentaActiva === 'dolares'}
              >
                Dólares
              </button>
            </div>
            <div>
              <span className={styles.heroLabel}>
                {cuentaActiva === 'pesos' ? 'Saldo en pesos' : 'Saldo en dólares'}
                {((cuentaActiva === 'pesos' && cuentasARS.length > 1) || (cuentaActiva === 'dolares' && cuentasUSD.length > 1)) && ' · cuenta principal'}
              </span>

              <div aria-live="polite">
                {loading && <p className={styles.heroStateText}>Cargando tus cuentas…</p>}
              </div>
              {error && (
                <div className={styles.heroError} role="alert">
                  <span>{error}</span>
                  <button type="button" className={styles.btnReintentarHero} onClick={cargarCuentas}>Reintentar</button>
                </div>
              )}

              {!loading && !error && cuentaMostrada && (
                <>
                  <div className={styles.heroBalance}>
                    {formatearMonto(Number(cuentaMostrada.saldo), cuentaMostrada.moneda)}
                  </div>
                  {cuentaMostrada.alias && (
                    <div className={styles.heroCbuRow}>
                      <span className={styles.heroAlias}>
                        <span className={styles.heroDatoLabel}>Alias</span> {cuentaMostrada.alias}
                      </span>
                      <button className={styles.copyBtn} onClick={() => copiar(cuentaMostrada.alias!, 'alias')}>
                        <IconCopy />
                        {copiado === 'alias' ? 'Copiado' : 'Copiar'}
                        <span className={styles.srOnly}> alias</span>
                      </button>
                    </div>
                  )}
                  <div className={styles.heroCbuRow}>
                    <span className={styles.heroCbu}><span className={styles.heroDatoLabel}>CBU</span> {cuentaMostrada.cbu}</span>
                    <button className={styles.copyBtn} onClick={() => copiar(cuentaMostrada.cbu, 'cbu')}>
                      <IconCopy />
                      {copiado === 'cbu' ? 'Copiado' : 'Copiar'}
                      <span className={styles.srOnly}> CBU</span>
                    </button>
                  </div>
                  <span className={styles.srOnly} aria-live="polite">
                    {copiado === 'alias' ? 'Alias copiado' : copiado === 'cbu' ? 'CBU copiado' : ''}
                  </span>
                  {errorCopia && (
                    <p className={styles.heroCopiaError} role="alert">
                      No pudimos copiar. Mantené apretado el alias o el CBU para seleccionarlo.
                    </p>
                  )}
                </>
              )}

              {!loading && !error && cuentaActiva === 'pesos' && !primaryAccount && (
                <p className={styles.heroStateText}>
                  {cuentas.length > 0 ? 'No tenés una cuenta en pesos.' : 'Todavía no tenés cuentas activas.'}
                </p>
              )}

              {!loading && !error && cuentaActiva === 'dolares' && !primaryUsdAccount && (
                <div className={styles.heroEmptyUsd}>
                  <p className={styles.heroStateText}>Todavía no tenés una cuenta en dólares.</p>
                  <button className={styles.btnOpenUsd} onClick={abrirCuentaUSD} disabled={abriendoCuentaUSD}>
                    {abriendoCuentaUSD ? 'Abriendo cuenta...' : 'Abrir cuenta en dólares'}
                  </button>
                  {errorUsd && <div className={styles.heroError} role="alert">{errorUsd}</div>}
                </div>
              )}

              {/* Solo en la pestaña de dólares: es la confirmación de esa cuenta, no un mensaje general. */}
              <div aria-live="polite">
                {mensajeCuentaUSD && cuentaActiva === 'dolares' && <p className={styles.heroSuccess}>{mensajeCuentaUSD}</p>}
              </div>
            </div>

          </div>

          {((cuentaActiva === 'pesos' && cuentasARS.length > 1) || (cuentaActiva === 'dolares' && cuentasUSD.length > 1)) && (
            <div className={styles.heroAdditional}>
              {(cuentaActiva === 'pesos' ? cuentasARS.slice(1) : cuentasUSD.slice(1)).map(cuenta => (
                <div key={cuenta.cbu} className={styles.heroAdditionalRow}>
                  <span className={styles.heroAdditionalCbu}>
                    <span className={styles.heroDatoLabel}>Otra cuenta</span>{' '}
                    {cuenta.alias || cuenta.cbu}
                  </span>
                  <span className={styles.heroAdditionalBalance}>
                    {formatearMonto(Number(cuenta.saldo), cuenta.moneda)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Una sola acción: tarjetas e historial ya están en la navegación y en sus paneles. */}
          {/* Sin cuentas cargadas no hay desde dónde transferir: el botón aparece solo cuando hay saldo para mover. */}
          {!loading && !error && cuentaMostrada && (
            <div className={styles.heroActions}>
              <button className={styles.heroActionPrimary} onClick={() => navigate('/transferir')}>
                <IconSend /> Transferir
              </button>
            </div>
          )}
        </section>

        {/* Después del saldo, lo que más se mira es qué se movió: va antes que los paneles. */}
        <section className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Movimientos recientes</h2>
            <button type="button" className={styles.panelLink} onClick={() => navigate('/historial')}>Ver historial completo</button>
          </div>

          {loadingMovimientos && <p className={styles.panelStateText}>Cargando movimientos…</p>}
          {!loadingMovimientos && errorMovimientos && (
            <div className={styles.panelError}>
              <p>No pudimos cargar tus movimientos.</p>
              <button type="button" className={styles.btnReintentar} onClick={cargarMovimientos}>Reintentar</button>
            </div>
          )}
          {!loadingMovimientos && !errorMovimientos && movimientos.length === 0 && (
            <div className={styles.movEmpty}>
              <p className={styles.panelStateText}>Todavía no tenés movimientos. Cuando envíes o recibas plata, la vas a ver acá.</p>
              {cuentas.length > 0 && (
                <button type="button" className={styles.panelLink} onClick={() => navigate('/transferir')}>
                  Hacé tu primera transferencia
                </button>
              )}
            </div>
          )}

          {movimientos.length > 0 && (
            <ul className={styles.movList}>
              {movimientos.map(m => {
                const entrante = m.tipo === 'entrante';
                const cbuContraparte = entrante ? m.cbu_origen : m.cbu_destino;
                // Quién es lo que importa: el nombre manda; si es de otro banco, los últimos 4 del CBU.
                const contraparte = m.nombre_contraparte || `CBU ···${cbuContraparte.slice(-4)}`;
                const fecha = new Date(m.fecha_hora).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
                const monto = formatearMonto(Number(m.importe), m.moneda);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={styles.movRow}
                      onClick={() => navigate(`/historial?op=${encodeURIComponent(m.transaccion_central_id)}`)}
                      aria-label={`${entrante ? 'Recibiste' : 'Enviaste'} ${monto} ${entrante ? 'de' : 'a'} ${contraparte}, ${fecha}. Ver detalle`}
                    >
                      <span className={`${styles.movIconWrap} ${entrante ? styles.movIconEntrante : styles.movIconSaliente}`} aria-hidden="true">
                        {entrante ? <IconArrowIn /> : <IconArrowOut />}
                      </span>
                      <span className={styles.movInfo}>
                        <span className={styles.movTitle}>{contraparte}</span>
                        <span className={styles.movDate}>{entrante ? 'Recibiste' : 'Enviaste'} · {fecha}</span>
                      </span>
                      <span className={`${styles.movAmount} ${entrante ? styles.movAmountPositivo : ''}`}>
                        {entrante ? '+ ' : '− '}{monto}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={styles.grid3}>

          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Mi tarjeta</h2>
              <button type="button" className={styles.panelLink} onClick={() => navigate('/tarjetas')}>Ver todas</button>
            </div>

            {estadoTarjetas === 'cargando' ? (
              <p className={styles.panelStateText}>Cargando tus tarjetas…</p>
            ) : estadoTarjetas === 'error' ? (
              <div className={styles.panelError}>
                <p>No pudimos cargar tus tarjetas.</p>
                <button type="button" className={styles.btnReintentar} onClick={cargarTarjetas}>Reintentar</button>
              </div>
            ) : tarjetas.length === 0 ? (
              <div className={styles.tarjetaEmpty}>
                <span className={styles.tarjetaEmptyIcon}><IconCard /></span>
                {tarjetasPendientes > 0 ? (
                  <>
                    <p className={styles.tarjetaEmptyText}>Tu solicitud de tarjeta está en revisión.</p>
                    <button className={styles.btnSolicitarTarjeta} onClick={() => navigate('/tarjetas')}>
                      Ver estado
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.tarjetaEmptyText}>Todavía no tenés tarjeta. ¿Querés solicitar una?</p>
                    <button className={styles.btnSolicitarTarjeta} onClick={() => navigate('/tarjetas')}>
                      Solicitar tarjeta
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.tarjetaCarousel}>
                <div className={styles.tarjetaCarouselRow}>
                  {tarjetas.length > 1 && (
                    <button
                      className={styles.arrowBtn}
                      onClick={() => setTarjetaIdx(i => (i - 1 + tarjetas.length) % tarjetas.length)}
                      aria-label="Tarjeta anterior"
                    >‹</button>
                  )}

                  <div className={styles.tarjetaSlot}>
                    <TarjetaVisual
                      tipo={tarjetas[tarjetaIdx].tipo}
                      ultimos4={tarjetas[tarjetaIdx].ultimos4}
                      titular={displayName}
                      vencimiento={tarjetas[tarjetaIdx].fecha_vencimiento}
                    />
                  </div>

                  {tarjetas.length > 1 && (
                    <button
                      className={styles.arrowBtn}
                      onClick={() => setTarjetaIdx(i => (i + 1) % tarjetas.length)}
                      aria-label="Tarjeta siguiente"
                    >›</button>
                  )}
                </div>

                {tarjetas.length > 1 && (
                  <div className={styles.tarjetaDots}>
                    {tarjetas.map((_, i) => (
                      <button
                        key={i}
                        className={i === tarjetaIdx ? styles.dotActive : styles.dot}
                        onClick={() => setTarjetaIdx(i)}
                        aria-label={`Ver tarjeta ${i + 1} de ${tarjetas.length}`}
                        aria-current={i === tarjetaIdx ? 'true' : undefined}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>Tu préstamo</h2>
              <button type="button" className={styles.panelLink} onClick={() => navigate('/prestamos')}>Ver préstamos</button>
            </div>

            {estadoPrestamos === 'cargando' ? (
              <p className={styles.panelStateText}>Cargando tus préstamos…</p>
            ) : estadoPrestamos === 'error' ? (
              <div className={styles.panelError}>
                <p>No pudimos cargar tus préstamos.</p>
                <button type="button" className={styles.btnReintentar} onClick={cargarPrestamos}>Reintentar</button>
              </div>
            ) : (
              <div className={styles.prestamoBody}>
                {mora?.en_mora && (
                  <div className={styles.moraAviso} role="alert">
                    <strong>Tenés {formatearMonto(Number(mora.deuda), 'ARS')} en mora.</strong>
                    {Number(mora.punitorios) > 0 && <> Incluye {formatearMonto(Number(mora.punitorios), 'ARS')} de intereses punitorios, que siguen sumando.</>}
                    {' '}Ingresá plata en tu cuenta en pesos para regularizarla.
                  </div>
                )}

                {proximaCuota ? (
                  <div className={styles.cuotaProxima}>
                    <span className={styles.cuotaEtiqueta}>
                      {proximaCuota.estado === 'vencida' ? 'Cuota vencida' : 'Próxima cuota'}
                    </span>
                    <span className={`${styles.cuotaMonto} ${proximaCuota.estado === 'vencida' ? styles.cuotaMontoVencida : ''}`}>
                      {formatearMonto(Number(proximaCuota.monto) + Number(proximaCuota.punitorios || 0), 'ARS')}
                    </span>
                    <span className={styles.cuotaDetalle}>
                      {proximaCuota.estado === 'vencida' ? 'Venció el ' : 'Vence el '}
                      {new Date(proximaCuota.fecha_vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                      {' · '}cuota {proximaCuota.numero_cuota} de {proximaCuota.total}
                    </span>
                    <span className={styles.cuotaNota}>
                      {proximaCuota.estado === 'vencida'
                        ? 'Se debita en cuanto tengas saldo en tu cuenta en pesos.'
                        : 'Se debita automáticamente de tu cuenta en pesos.'}
                    </span>
                  </div>
                ) : (
                  <div className={styles.cuotaProxima}>
                    <span className={styles.cuotaEtiqueta}>Sin cuotas pendientes</span>
                    <p className={styles.panelStateText}>No tenés préstamos activos.</p>
                    <button type="button" className={styles.panelLinkInline} onClick={() => navigate('/prestamos')}>
                      Simulá un préstamo
                    </button>
                  </div>
                )}

                {/* La situación crediticia es contexto del préstamo: una línea, no un panel propio. */}
                <div className={styles.situacionLinea}>
                  {estadoSituacion === 'error' ? (
                    <>
                      <span>No pudimos consultar tu situación crediticia.</span>
                      <button type="button" className={styles.panelLinkInline} onClick={cargarSituacion}>Reintentar</button>
                    </>
                  ) : situacionCrediticia && infoSituacion ? (
                    <>
                      <span className={`${styles.situacionDot} ${styles[infoSituacion.claseColor]}`} aria-hidden="true" />
                      <span>
                        Situación crediticia: <strong>{infoSituacion.etiqueta}</strong>
                        {situacionCrediticia.situacion > 1 && <> · {infoSituacion.significado}</>}
                      </span>
                    </>
                  ) : (
                    <span>Consultando tu situación crediticia…</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <button type="button" className={styles.banCard} onClick={() => navigate('/chat')}>
            <span className={styles.banCardTexto}>
              <span className={styles.banCardTitulo}>¿Dudas? Preguntale a Ban</span>
              <span className={styles.banCardSub}>Te ayuda con transferencias, préstamos y tu cuenta.</span>
            </span>
            <img src={banListo} alt="" width={240} height={324} className={styles.banCardImg} />
          </button>

        </section>

        </div>
      </AppLayout>
  );
}

export default Home;
