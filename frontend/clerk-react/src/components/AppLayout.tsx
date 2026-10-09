import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './AppLayout.module.css';

// Shell de todas las páginas del cliente: barra lateral (escritorio y tablet),
// barra inferior con "Más" (celular) y topbar con el usuario.

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
const IconMore = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>
);
const IconUser = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);

interface NavItem {
  label: string;
  path: string | null;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', path: '/home', icon: <IconHome /> },
  { label: 'Tarjetas', path: '/tarjetas', icon: <IconCard /> },
  { label: 'Préstamos', path: '/prestamos', icon: <IconLoan /> },
  { label: 'Inversiones', path: '/inversiones', icon: <IconTrending /> },
];

const NAV_ITEMS_2: NavItem[] = [
  { label: 'Transferir', path: '/transferir', icon: <IconSend /> },
  { label: 'Recargas', path: null, icon: <IconRefresh /> },
  { label: 'Cambio de Contraseña', path: null, icon: <IconLock /> },
  { label: 'Chat', path: '/chat', icon: <IconChat /> },
  { label: 'Historial', path: '/historial', icon: <IconHistory /> },
];

// En celular la navegación pasa a una barra inferior: estos van siempre visibles y el resto en "Más".
const NAV_MOVIL = [
  { label: 'Inicio', path: '/home', icon: <IconHome /> },
  { label: 'Transferir', path: '/transferir', icon: <IconSend /> },
  { label: 'Tarjetas', path: '/tarjetas', icon: <IconCard /> },
  { label: 'Historial', path: '/historial', icon: <IconHistory /> },
];

const NAV_MOVIL_MAS = [
  { label: 'Préstamos', path: '/prestamos', icon: <IconLoan /> },
  { label: 'Inversiones', path: '/inversiones', icon: <IconTrending /> },
  { label: 'Chat con Ban', path: '/chat', icon: <IconChat /> },
  { label: 'Mi perfil', path: '/perfil', icon: <IconUser /> },
];

interface AppLayoutProps {
  title: ReactNode;
  subtitle?: ReactNode;
  // 'fill': la página ocupa exactamente el alto de la pantalla y maneja su propio scroll (Chat).
  variant?: 'default' | 'fill';
  children: ReactNode;
}

function AppLayout({ title, subtitle, variant = 'default', children }: AppLayoutProps) {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();
  const [masAbierto, setMasAbierto] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';

  useEffect(() => {
    if (!masAbierto) return;
    const cerrarConEscape = (e: KeyboardEvent) => e.key === 'Escape' && setMasAbierto(false);
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [masAbierto]);

  const volverAlPanel = () => {
    setViewMode('work');
    navigate(panelUrl);
  };

  const avatar = user?.hasImage
    ? <img src={user.imageUrl} alt="" className={styles.userAvatarImg} />
    : (initials || 'U');

  const renderNavItem = (item: NavItem) => {
    const active = item.path === location.pathname;
    return (
      <button
        key={item.label}
        className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
        onClick={() => item.path && navigate(item.path)}
        disabled={!item.path}
        title={item.path ? item.label : `${item.label} (próximamente)`}
        aria-current={active ? 'page' : undefined}
      >
        <span className={styles.navIcon}>{item.icon}</span>
        <span className={styles.navLabel}>{item.label}</span>
      </button>
    );
  };

  return (
    <div className={`${styles.page} ${variant === 'fill' ? styles.pageFill : ''}`}>
      <a href="#contenido" className={styles.skipLink}>Saltar al contenido</a>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} aria-label="404Bank">
          <span className={styles.brand404}>404</span>
          <span className={styles.brandBank}>Bank</span>
        </div>

        <nav className={styles.nav} aria-label="Secciones">
          {NAV_ITEMS.map(renderNavItem)}
          <div className={styles.navDivider} />
          {NAV_ITEMS_2.map(renderNavItem)}
        </nav>

        <div className={styles.sidebarFooter}>
          {esLaboral && (
            <button className={styles.btnVolverPanel} onClick={volverAlPanel} title="Volver al panel">
              <span className={styles.navIcon}><IconHome /></span>
              <span className={styles.navLabel}>Volver al panel</span>
            </button>
          )}
          <button className={styles.userSection} onClick={() => navigate('/perfil')} title="Mi perfil">
            <div className={styles.userAvatarSidebar}>{avatar}</div>
            <span className={styles.userNameSidebar}>{displayName}</span>
          </button>
        </div>
      </aside>

      <main className={styles.main} id="contenido" tabIndex={-1}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.topbarTitle}>{title}</h1>
            {subtitle && <p className={styles.topbarSubtitle}>{subtitle}</p>}
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.userChip} onClick={() => navigate('/perfil')}>
              <div className={styles.userChipAvatar}>{avatar}</div>
              <span>{displayName}</span>
            </button>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesión</button>
            </SignOutButton>
          </div>
        </header>

        {children}
      </main>

      <nav className={styles.tabBar} aria-label="Navegación">
        {masAbierto && (
          <>
            <div className={styles.masBackdrop} onClick={() => setMasAbierto(false)} aria-hidden="true" />
            <div className={styles.masPanel} id="nav-mas">
              {NAV_MOVIL_MAS.map(item => (
                <button
                  key={item.label}
                  className={styles.masItem}
                  onClick={() => { setMasAbierto(false); navigate(item.path); }}
                  aria-current={item.path === location.pathname ? 'page' : undefined}
                >
                  <span className={styles.masIcon}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {esLaboral && (
                <button className={styles.masItem} onClick={() => { setMasAbierto(false); volverAlPanel(); }}>
                  <span className={styles.masIcon}><IconHome /></span>
                  Volver al panel
                </button>
              )}
            </div>
          </>
        )}
        {NAV_MOVIL.map(item => {
          const active = item.path === location.pathname;
          return (
            <button
              key={item.label}
              className={`${styles.tabItem} ${active ? styles.tabItemActive : ''}`}
              onClick={() => navigate(item.path)}
              aria-current={active ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          className={`${styles.tabItem} ${masAbierto || NAV_MOVIL_MAS.some(i => i.path === location.pathname) ? styles.tabItemActive : ''}`}
          onClick={() => setMasAbierto(abierto => !abierto)}
          aria-expanded={masAbierto}
          aria-controls="nav-mas"
        >
          <IconMore />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
}

export default AppLayout;
