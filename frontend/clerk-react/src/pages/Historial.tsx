import { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Historial.module.css';

const API_URL = 'http://localhost:3000';

interface Transferencia {
  id: number;
  transaccion_central_id: string;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: string;
  fecha_hora: string;
  moneda: 'ARS' | 'USD';
}

const formatearImporte = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

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
const IconArrowUp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
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

function Historial() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState<'TODAS' | 'ARS' | 'USD'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | '7D' | '30D'>('TODAS');

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar el historial');
        setTransferencias(data.transferencias);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargarHistorial();
  }, [getToken]);

  const transferenciasFiltradas = useMemo(() => {
    const ahora = Date.now();
    const limiteMs = filtroFecha === '7D' ? 7 * 24 * 60 * 60 * 1000
      : filtroFecha === '30D' ? 30 * 24 * 60 * 60 * 1000
      : null;

    return transferencias.filter(t => {
      if (filtroMoneda !== 'TODAS' && t.moneda !== filtroMoneda) return false;
      if (limiteMs !== null && ahora - new Date(t.fecha_hora).getTime() > limiteMs) return false;
      return true;
    });
  }, [transferencias, filtroMoneda, filtroFecha]);

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
            <h1 className={styles.topbarTitle}>Historial</h1>
            <p className={styles.topbarSubtitle}>Todas tus transferencias, entrantes y salientes.</p>
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
            {loading && <p className={styles.loadingText}>Cargando historial...</p>}

            {error && <div className={styles.errorBox}>{error}</div>}

            {!loading && !error && transferencias.length > 0 && (
              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  {(['TODAS', 'ARS', 'USD'] as const).map(opcion => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setFiltroMoneda(opcion)}
                      className={`${styles.filterButton} ${filtroMoneda === opcion ? styles.filterButtonActive : ''}`}
                    >
                      {opcion === 'TODAS' ? 'Todas' : opcion}
                    </button>
                  ))}
                </div>
                <div className={styles.filterGroup}>
                  {([
                    { valor: 'TODAS', etiqueta: 'Todo' },
                    { valor: '7D', etiqueta: 'Últimos 7 días' },
                    { valor: '30D', etiqueta: 'Últimos 30 días' },
                  ] as const).map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFiltroFecha(valor)}
                      className={`${styles.filterButton} ${filtroFecha === valor ? styles.filterButtonActive : ''}`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && transferencias.length === 0 && (
              <p className={styles.emptyText}>No tenés transferencias registradas.</p>
            )}

            {!loading && !error && transferencias.length > 0 && transferenciasFiltradas.length === 0 && (
              <p className={styles.emptyText}>No hay transferencias que coincidan con los filtros elegidos.</p>
            )}

            <div className={styles.list}>
              {transferenciasFiltradas.map((t) => (
                <div key={t.id} className={styles.card}>
                  <span className={`${styles.cardIconWrap} ${t.tipo === 'entrante' ? styles.cardIconEntrante : styles.cardIconSaliente}`}>
                    {t.tipo === 'entrante' ? <IconArrowUp /> : <IconSend />}
                  </span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>
                      {t.tipo === 'entrante' ? `De: ${t.cbu_origen}` : `Para: ${t.cbu_destino}`}
                    </span>
                    <span className={styles.cardDate}>
                      {new Date(t.fecha_hora).toLocaleString('es-AR')}
                    </span>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${t.estado === 'aprobada' ? styles.badgeAprobada : styles.badgeRechazada}`}>
                        {t.estado}
                      </span>
                      <span className={`${styles.badge} ${t.moneda === 'USD' ? styles.badgeUsd : styles.badgeArs}`}>
                        {t.moneda}
                      </span>
                    </div>
                  </div>
                  <span className={`${styles.amount} ${t.tipo === 'entrante' ? styles.amountEntrante : styles.amountSaliente}`}>
                    {t.tipo === 'entrante' ? '+ ' : '− '}
                    {formatearImporte(Number(t.importe), t.moneda)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Historial;
