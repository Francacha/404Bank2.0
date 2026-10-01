import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Tarjetas.module.css';

const API_URL = 'http://localhost:3000';

interface Tarjeta {
  id: number;
  tipo: string;
  numero: string | null;
  cvv: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

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

const NAV_ITEMS = [
  { label: 'Cuentas', path: '/home', icon: <IconHome /> },
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

function Tarjetas() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();

  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState<'debito' | 'credito'>('debito');
  const [enviando, setEnviando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';

  const cargarTarjetas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar tarjetas');
      setTarjetas(data.tarjetas);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarTarjetas();
  }, [cargarTarjetas]);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar');
      setMensajeSolicitud('Solicitud enviada correctamente. Quedará pendiente de revisión.');
      cargarTarjetas();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorSolicitud(err.message);
      else setErrorSolicitud('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  const badgeClass = (estado: string) => {
    if (estado === 'activa') return styles.badgeActiva;
    if (estado === 'rechazada') return styles.badgeRechazada;
    if (estado === 'pre_aprobada') return styles.badgePreAprobada;
    return styles.badgePendiente;
  };

  const formatNumero = (numero: string) =>
    numero.replace(/(.{4})/g, '$1 ').trim();

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
            <h1 className={styles.topbarTitle}>Solicitá una tarjeta</h1>
            <p className={styles.topbarSubtitle}>Elegí el tipo y seguí el estado de tus solicitudes.</p>
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

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>
            <div className={styles.formCard}>
              <h3 className={styles.formCardTitle}>Nueva solicitud</h3>
              <form onSubmit={handleSolicitar} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Tipo de tarjeta</label>
                  <div className={styles.tipoRow}>
                    <button
                      type="button"
                      className={`${styles.tipoBtn} ${tipo === 'debito' ? styles.tipoBtnActive : ''}`}
                      onClick={() => setTipo('debito')}
                    >
                      Débito
                    </button>
                    <button
                      type="button"
                      className={`${styles.tipoBtn} ${tipo === 'credito' ? styles.tipoBtnActive : ''}`}
                      onClick={() => setTipo('credito')}
                    >
                      Crédito
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={enviando} className={styles.btnSolicitar}>
                  {enviando ? 'Enviando...' : 'Solicitar tarjeta'}
                </button>
              </form>
              {mensajeSolicitud && <p className={styles.successMsg}>{mensajeSolicitud}</p>}
              {errorSolicitud && <p className={styles.errorMsg}>{errorSolicitud}</p>}
            </div>

            <div className={styles.listSection}>
              <h3 className={styles.listTitle}>Mis tarjetas</h3>
              {loading && <p className={styles.loadingText}>Cargando...</p>}
              {error && <p className={styles.errorMsg}>{error}</p>}
              {!loading && !error && tarjetas.length === 0 && (
                <p className={styles.emptyText}>No tenés solicitudes de tarjetas todavía.</p>
              )}
              <div className={styles.lista}>
                {tarjetas.map(t => (
                  <div key={t.id} className={`${styles.tarjetaCard} ${t.estado === 'activa' ? styles.tarjetaCardActiva : ''}`}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTipo}>{t.tipo.toUpperCase()}</span>
                      <span className={badgeClass(t.estado)}>{t.estado.replace('_', ' ')}</span>
                    </div>
                    {t.estado === 'activa' && t.numero ? (
                      <div className={styles.cardDatos}>
                        <p className={styles.cardNumero}>{formatNumero(t.numero)}</p>
                        <div className={styles.cardRow}>
                          <div>
                            <p className={styles.cardDatoLabel}>Vencimiento</p>
                            <p className={styles.cardDatoValor}>
                              {t.fecha_vencimiento
                                ? new Date(t.fecha_vencimiento).toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' })
                                : '—'}
                            </p>
                          </div>
                          <div>
                            <p className={styles.cardDatoLabel}>CVV</p>
                            <p className={styles.cardDatoValor}>{t.cvv}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className={styles.cardFecha}>
                        Solicitada: {new Date(t.fecha_solicitud).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Tarjetas;
