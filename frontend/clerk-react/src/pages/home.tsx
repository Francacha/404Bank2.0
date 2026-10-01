import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './home.module.css';

interface Cuenta {
  cbu: string;
  saldo: number;
  moneda: 'ARS' | 'USD';
}

interface Tarjeta {
  id: number;
  tipo: string;
  numero: string | null;
  cvv: string | null;
  fecha_vencimiento: string | null;
  estado: string;
}

interface SituacionCrediticia {
  dni: string;
  situacion: number;
  deudas: unknown[];
}

interface Movimiento {
  id: number;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: 'entrante' | 'saliente';
  fecha_hora: string;
  moneda: 'ARS' | 'USD';
}

const API_URL = 'http://localhost:3000';

const SITUACION_INFO: Record<number, { etiqueta: string; claseColor: string }> = {
  1: { etiqueta: 'Normal', claseColor: 'situacion1' },
  2: { etiqueta: 'Riesgo bajo', claseColor: 'situacion2' },
  3: { etiqueta: 'Riesgo medio', claseColor: 'situacion3' },
  4: { etiqueta: 'Riesgo alto', claseColor: 'situacion4' },
  5: { etiqueta: 'Irrecuperable', claseColor: 'situacion5' },
};

const IconHome = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>
);
const IconCard = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
);
const IconLoan = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 12h6l2-3 2 6 2-3h4" /></svg>
);
const IconTrending = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
);
const IconSend = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13" /><path d="m13 6 6 6-6 6" /></svg>
);
const IconRefresh = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /></svg>
);
const IconLock = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
const IconChat = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-3.1-.6L3 21l1.8-5.5A8.4 8.4 0 1 1 21 11.5Z" /></svg>
);
const IconHistory = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
);
const IconReceipt = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg>
);
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);
const IconCheck = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const IconAlert = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="m10.3 3.9-8 14A1.5 1.5 0 0 0 3.6 20h16.8a1.5 1.5 0 0 0 1.3-2.1l-8-14a1.5 1.5 0 0 0-2.6 0Z" /></svg>
);
const IconArrowUp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
);

const NAV_ITEMS = [
  { label: 'Cuentas', path: '/', icon: <IconHome /> },
  { label: 'Tarjetas', path: '/tarjetas', icon: <IconCard /> },
  { label: 'Préstamos', path: '/prestamos', icon: <IconLoan /> },
  { label: 'Inversiones', path: '/inversiones', icon: <IconTrending /> },
];

const NAV_ITEMS_2 = [
  { label: 'Transferir', path: '/transferir', icon: <IconSend /> },
  { label: 'Recargas', path: null, icon: <IconRefresh /> },
  { label: 'Cambio de Contraseña', path: null, icon: <IconLock /> },
  { label: 'Chat', path: '/chat', icon: <IconChat /> },
  { label: 'Historial', path: '/historial', icon: <IconHistory /> },
  { label: 'Comprobantes', path: null, icon: <IconReceipt /> },
];

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
  const [copiado, setCopiado] = useState(false);
  const [situacionCrediticia, setSituacionCrediticia] = useState<SituacionCrediticia | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
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

  useEffect(() => {
    const cargarCuentas = async () => {
      try {
        setCuentas(await obtenerCuentas());
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargarCuentas();
  }, [obtenerCuentas]);

  const abrirCuentaUSD = async () => {
    setAbriendoCuentaUSD(true);
    setError('');
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la cuenta en dólares');

      setMensajeCuentaUSD(data.mensaje || 'Tu cuenta en dólares fue creada correctamente.');
      setCuentas(await obtenerCuentas());
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado al abrir la cuenta en dólares');
    } finally {
      setAbriendoCuentaUSD(false);
    }
  };

  const copiarCbu = async () => {
    if (!cuentaMostrada) return;
    try {
      await navigator.clipboard.writeText(cuentaMostrada.cbu);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // El clipboard puede no estar disponible en algunos navegadores/contextos.
    }
  };

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

  useEffect(() => {
    const cargarTarjetas = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok) setTarjetas(data.tarjetas.filter((t: Tarjeta) => t.estado === 'activa'));
      } catch {
        // Las tarjetas no bloquean la carga del resumen de cuentas.
      }
    };
    cargarTarjetas();
  }, [getToken]);

  useEffect(() => {
    const cargarSituacion = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/prestamos/mi-situacion-crediticia`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok) setSituacionCrediticia(data.situacion_crediticia);
      } catch {
        // La situación crediticia es informativa, no bloquea el resto de la pantalla.
      }
    };
    cargarSituacion();
  }, [getToken]);

  useEffect(() => {
    const cargarMovimientos = async () => {
      setLoadingMovimientos(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok) {
          const ordenados = [...data.transferencias].sort(
            (a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
          );
          setMovimientos(ordenados.slice(0, 4));
        }
      } catch {
        // Los movimientos recientes son informativos, no bloquean el resto de la pantalla.
      } finally {
        setLoadingMovimientos(false);
      }
    };
    cargarMovimientos();
  }, [getToken]);

  const formatearMonto = (monto: number, moneda: 'ARS' | 'USD') =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} aria-label="404Bank">
          <span className={styles.brand404}>404</span>
          <span className={styles.brandBank}>Bank</span>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => {
            const active = item.path === location.pathname;
            return (
              <button
                key={item.label}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div className={styles.navDivider} />

          {NAV_ITEMS_2.map(item => {
            const active = item.path === location.pathname;
            return (
              <button
                key={item.label}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {esLaboral && (
            <button
              className={styles.btnVolverPanel}
              onClick={() => { setViewMode('work'); navigate(panelUrl); }}
            >
              Volver al panel
            </button>
          )}
          <button className={styles.userSection} onClick={() => navigate('/perfil')}>
            <div className={styles.userAvatarSidebar}>
              {user?.hasImage
                ? <img src={user.imageUrl} alt={displayName} className={styles.userAvatarImg} />
                : (initials || 'U')
              }
            </div>
            <span className={styles.userNameSidebar}>{displayName}</span>
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>Hola, {user?.firstName || 'Franco'}</h1>
            <p className={styles.topbarSubtitle}>Este es el resumen de tu cuenta hoy</p>
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.userChip} onClick={() => navigate('/perfil')}>
              <div className={styles.userChipAvatar}>
                {user?.hasImage
                  ? <img src={user.imageUrl} alt={displayName} className={styles.userAvatarImg} />
                  : (initials || 'U')
                }
              </div>
              <span>{displayName}</span>
            </button>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroTop}>
            <div>
              <span className={styles.heroLabel}>
                {cuentaActiva === 'pesos' ? 'Saldo disponible' : 'Saldo en dólares'}
              </span>

              {loading && <p className={styles.heroStateText}>Cargando tus cuentas...</p>}
              {error && <div className={styles.heroError}>{error}</div>}

              {!loading && !error && cuentaMostrada && (
                <>
                  <div className={styles.heroBalance}>
                    {cuentaActiva === 'pesos' ? '$ ' : 'US$ '}
                    {Number(cuentaMostrada.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className={styles.heroCbuRow}>
                    <span className={styles.heroCbu}>CBU: {cuentaMostrada.cbu}</span>
                    <button className={styles.copyBtn} onClick={copiarCbu} aria-label="Copiar CBU">
                      <IconCopy />
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </>
              )}

              {!loading && !error && cuentaActiva === 'pesos' && !primaryAccount && (
                <p className={styles.heroStateText}>No tenés cuentas activas.</p>
              )}

              {!loading && !error && cuentaActiva === 'dolares' && !primaryUsdAccount && (
                <div className={styles.heroEmptyUsd}>
                  <p className={styles.heroStateText}>Todavía no tenés una cuenta en dólares.</p>
                  <button className={styles.btnOpenUsd} onClick={abrirCuentaUSD} disabled={abriendoCuentaUSD}>
                    {abriendoCuentaUSD ? 'Abriendo cuenta...' : 'Abrir cuenta en dólares'}
                  </button>
                </div>
              )}

              {mensajeCuentaUSD && <p className={styles.heroSuccess}>{mensajeCuentaUSD}</p>}
            </div>

            <div className={styles.heroTabs}>
              <button
                className={`${styles.heroTab} ${cuentaActiva === 'pesos' ? styles.heroTabActive : ''}`}
                onClick={() => setCuentaActiva('pesos')}
              >
                ARS
              </button>
              <button
                className={`${styles.heroTab} ${cuentaActiva === 'dolares' ? styles.heroTabActive : ''}`}
                onClick={() => setCuentaActiva('dolares')}
              >
                USD
              </button>
            </div>
          </div>

          {((cuentaActiva === 'pesos' && cuentasARS.length > 1) || (cuentaActiva === 'dolares' && cuentasUSD.length > 1)) && (
            <div className={styles.heroAdditional}>
              {(cuentaActiva === 'pesos' ? cuentasARS.slice(1) : cuentasUSD.slice(1)).map(cuenta => (
                <div key={cuenta.cbu} className={styles.heroAdditionalRow}>
                  <span className={styles.heroAdditionalCbu}>CBU: {cuenta.cbu}</span>
                  <span className={styles.heroAdditionalBalance}>
                    {cuenta.moneda === 'USD' ? 'US$ ' : '$ '}
                    {Number(cuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.heroActions}>
            <button className={styles.heroActionPrimary} onClick={() => navigate('/transferir')}>
              <IconSend /> Transferir
            </button>
            <button className={styles.heroActionSecondary} onClick={() => navigate('/tarjetas')}>
              <IconCard /> Ver tarjetas
            </button>
            <button className={styles.heroActionSecondary} onClick={() => navigate('/historial')}>
              <IconHistory /> Historial
            </button>
          </div>
        </section>

        <section className={styles.grid3}>

          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Mi tarjeta</span>
              <a className={styles.panelLink} onClick={() => navigate('/tarjetas')}>Ver todas</a>
            </div>

            {tarjetas.length === 0 ? (
              <div className={styles.tarjetaEmpty}>
                <span className={styles.tarjetaEmptyIcon}><IconCard /></span>
                <p className={styles.tarjetaEmptyText}>No poseés tarjeta. ¿Querés solicitar una?</p>
                <button className={styles.btnSolicitarTarjeta} onClick={() => navigate('/tarjetas')}>
                  Solicitar tarjeta
                </button>
              </div>
            ) : (
              <div className={styles.tarjetaCarousel}>
                <div className={styles.tarjetaCarouselRow}>
                  {tarjetas.length > 1 && (
                    <button
                      className={styles.arrowBtn}
                      onClick={() => setTarjetaIdx(i => (i - 1 + tarjetas.length) % tarjetas.length)}
                      aria-label="Anterior"
                    >‹</button>
                  )}

                  <div className={`${styles.tarjetaCard} ${tarjetas[tarjetaIdx].tipo === 'credito' ? styles.tarjetaCredito : styles.tarjetaDebito}`}>
                    <div className={styles.tarjetaTopRow}>
                      <div className={styles.chip}></div>
                      <div className={styles.tarjetaTopRight}>
                        <span className={styles.tarjetaBankLogo}>
                          <span className={styles.tarjetaLogo404}>404</span>
                          <span className={styles.tarjetaLogoBank}>Bank</span>
                        </span>
                        <span className={styles.tarjetaTipoBadge}>
                          {tarjetas[tarjetaIdx].tipo === 'credito' ? 'CRÉDITO' : 'DÉBITO'}
                        </span>
                      </div>
                    </div>

                    <p className={styles.tarjetaNumero}>
                      •••• •••• •••• {tarjetas[tarjetaIdx].numero?.slice(-4) ?? '----'}
                    </p>

                    <div className={styles.tarjetaBottomRow}>
                      <div className={styles.tarjetaDato}>
                        <span className={styles.tarjetaLabel}>TITULAR</span>
                        <span className={styles.tarjetaValor}>{displayName.toUpperCase()}</span>
                      </div>
                      <div className={styles.tarjetaDato}>
                        <span className={styles.tarjetaLabel}>VENCE</span>
                        <span className={styles.tarjetaValor}>
                          {tarjetas[tarjetaIdx].fecha_vencimiento
                            ? new Date(tarjetas[tarjetaIdx].fecha_vencimiento!).toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' })
                            : '--/--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {tarjetas.length > 1 && (
                    <button
                      className={styles.arrowBtn}
                      onClick={() => setTarjetaIdx(i => (i + 1) % tarjetas.length)}
                      aria-label="Siguiente"
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
                        aria-label={`Tarjeta ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Accesos rápidos</span>
            </div>
            <div className={styles.accessGrid}>
              <button className={styles.accessTile} onClick={() => navigate('/prestamos')}>
                <span className={styles.accessIconWrap}><IconLoan /></span>
                <span className={styles.accessLabel}>Préstamos</span>
              </button>
              <button className={styles.accessTile} onClick={() => navigate('/inversiones')}>
                <span className={styles.accessIconWrap}><IconTrending /></span>
                <span className={styles.accessLabel}>Inversiones</span>
              </button>
              <button className={styles.accessTile}>
                <span className={styles.accessIconWrap}><IconRefresh /></span>
                <span className={styles.accessLabel}>Recargas</span>
              </button>
              <button className={styles.accessTile} onClick={() => navigate('/chat')}>
                <span className={styles.accessIconWrap}><IconChat /></span>
                <span className={styles.accessLabel}>Chat</span>
              </button>
            </div>
          </div>

          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Situación crediticia</span>
            </div>
            {situacionCrediticia ? (
              <div className={styles.situacionBody}>
                <span className={`${styles.situacionIconWrap} ${styles[SITUACION_INFO[situacionCrediticia.situacion]?.claseColor ?? 'situacion1']}`}>
                  {situacionCrediticia.situacion <= 2 ? <IconCheck /> : <IconAlert />}
                </span>
                <span className={styles.situacionLabel}>
                  {SITUACION_INFO[situacionCrediticia.situacion]?.etiqueta ?? 'Desconocida'}
                </span>
                <span className={styles.situacionSub}>
                  {situacionCrediticia.deudas.length === 0
                    ? 'Sin deudas registradas en el BCRA'
                    : `${situacionCrediticia.deudas.length} deuda(s) registrada(s)`}
                </span>
              </div>
            ) : (
              <div className={styles.situacionBody}>
                <span className={styles.heroStateText}>Consultando situación crediticia...</span>
              </div>
            )}
          </div>

        </section>

        <section className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Movimientos recientes</span>
            <a className={styles.panelLink} onClick={() => navigate('/historial')}>Ver historial completo</a>
          </div>

          {loadingMovimientos && <p className={styles.heroStateText}>Cargando movimientos...</p>}
          {!loadingMovimientos && movimientos.length === 0 && (
            <p className={styles.heroStateText}>Todavía no tenés movimientos registrados.</p>
          )}

          <div className={styles.movList}>
            {movimientos.map(m => (
              <div key={m.id} className={styles.movRow}>
                <span className={`${styles.movIconWrap} ${m.tipo === 'entrante' ? styles.movIconEntrante : styles.movIconSaliente}`}>
                  {m.tipo === 'entrante' ? <IconArrowUp /> : <IconSend />}
                </span>
                <div className={styles.movInfo}>
                  <span className={styles.movTitle}>
                    {m.tipo === 'entrante' ? 'Transferencia recibida' : 'Transferencia enviada'}
                  </span>
                  <span className={styles.movDate}>
                    {m.tipo === 'entrante' ? `De: ${m.cbu_origen}` : `Para: ${m.cbu_destino}`} · {new Date(m.fecha_hora).toLocaleDateString('es-AR')}
                  </span>
                </div>
                <span className={`${styles.movAmount} ${m.tipo === 'entrante' ? styles.movAmountPositivo : ''}`}>
                  {m.tipo === 'entrante' ? '+ ' : '− '}{formatearMonto(Number(m.importe), m.moneda)}
                </span>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}

export default Home;
