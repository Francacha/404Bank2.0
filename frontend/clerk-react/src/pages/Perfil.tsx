import { useRef, useState } from 'react';
import { useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './perfil.module.css';

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
const IconPerson = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6Z" /></svg>
);
const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /></svg>
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
  { label: 'Comprobantes', path: '/comprobantes', icon: <IconReceipt /> },
];

function Perfil() {
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      await user.setProfileImage({ file });
    } catch (err) {
      console.error('Error subiendo imagen:', err);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
            <h1 className={styles.topbarTitle}>Mi perfil</h1>
            <p className={styles.topbarSubtitle}>Tus datos personales y la seguridad de tu cuenta.</p>
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

            <div className={styles.profileHeader}>
              <div className={styles.profileAvatar} onClick={() => fileInputRef.current?.click()}>
                {user?.hasImage
                  ? <img src={user.imageUrl} alt={displayName} className={styles.profileAvatarImg} />
                  : (initials || 'U')
                }
                <div className={styles.profileAvatarOverlay}>
                  {uploadingPhoto
                    ? <span className={styles.profileAvatarSpinner}></span>
                    : <IconCamera />
                  }
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className={styles.profileAvatarInput}
                onChange={handlePhotoChange}
              />
              <div className={styles.profileHeaderInfo}>
                <h2 className={styles.profileName}>{displayName}</h2>
                <span className={styles.profileEmail}>{email}</span>
              </div>
            </div>

            <div className={styles.cardsGrid}>
              <article className={styles.profileCard}>
                <div className={styles.cardIconWrap}>
                  <IconPerson />
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>Datos personales</h3>
                  <p className={styles.cardDesc}>Nombre, apellido y datos de contacto</p>
                </div>
                <div className={styles.cardFields}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Nombre</span>
                    <span className={styles.fieldValue}>{user?.firstName ?? '—'}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Apellido</span>
                    <span className={styles.fieldValue}>{user?.lastName ?? '—'}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Email</span>
                    <span className={styles.fieldValue}>{email || '—'}</span>
                  </div>
                </div>
              </article>

              <article className={styles.profileCard}>
                <div className={styles.cardIconWrap}>
                  <IconShield />
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>Seguridad</h3>
                  <p className={styles.cardDesc}>Contraseña y acceso a tu cuenta</p>
                </div>
                <div className={styles.cardFields}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Contraseña</span>
                    <span className={styles.fieldValue}>••••••••</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Último acceso</span>
                    <span className={styles.fieldValue}>
                      {user?.lastSignInAt
                        ? new Date(user.lastSignInAt).toLocaleDateString('es-AR', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Perfil;
