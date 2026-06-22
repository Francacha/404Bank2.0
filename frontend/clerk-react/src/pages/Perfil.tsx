import { useRef, useState } from 'react';
import { useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './perfil.module.css';

function Perfil() {
  const { user } = useUser();
  const navigate = useNavigate();
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
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} aria-label="404Bank">
          <span className={styles.brand404}>404</span>
          <span className={styles.brandBank}>Bank</span>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Productos</span>
            <button className={styles.navSubItem} onClick={() => navigate('/')}>Cuentas</button>
            <button className={styles.navSubItem} onClick={() => navigate('/tarjetas')}>Tarjetas</button>
            <button className={styles.navSubItem} onClick={() => navigate('/prestamos')}>Préstamos</button>
            <button className={styles.navSubItem}>Inversiones</button>
            <button className={styles.navSubItem}>Comercio Exterior</button>
            <button className={styles.navSubItem}>Seguros</button>
            <button className={styles.navSubItem}>Caja de seguridad</button>
            <button className={styles.navSubItem}>Transporte</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Transacciones</span>
            <button className={styles.navSubItem} onClick={() => navigate('/transferir')}>Transferir</button>
            <button className={styles.navSubItem}>Pago de Servicios</button>
            <button className={styles.navSubItem}>Echeq</button>
            <button className={styles.navSubItem}>Recargas</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Seguridad</span>
            <button className={styles.navSubItem}>Gestión de Token</button>
            <button className={styles.navSubItem}>Seguridad Biométrica</button>
            <button className={styles.navSubItem}>Cambio de Contraseña</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Atención al cliente</span>
            <button className={styles.navSubItem} onClick={() => navigate('/chat')}>Chat</button>
            <button className={styles.navSubItem}>Turnos</button>
            <button className={styles.navSubItem}>Cajeros y sucursales</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Documentos</span>
            <button className={styles.navSubItem} onClick={() => navigate('/historial')}>Historial</button>
            <button className={styles.navSubItem}>Comprobantes</button>
            <button className={styles.navSubItem}>Informes ARCA</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Beneficios</span>
            <button className={styles.navSubItem}>Promociones</button>
          </div>
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

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <h1 className={styles.topBarTitle}>MI PERFIL</h1>
          <div className={styles.topBarActions}>
            <span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <div className={styles.profileContent}>
          <div className={styles.profileHeader}>
            <div className={styles.profileAvatar} onClick={() => fileInputRef.current?.click()}>
              {user?.hasImage
                ? <img src={user.imageUrl} alt={displayName} className={styles.profileAvatarImg} />
                : (initials || 'U')
              }
              <div className={styles.profileAvatarOverlay}>
                {uploadingPhoto
                  ? <span className={styles.profileAvatarSpinner}></span>
                  : <span className={styles.profileAvatarCameraIcon}></span>
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
                <span className={styles.iconPerson} aria-hidden="true"></span>
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
                <span className={styles.iconLock} aria-hidden="true"></span>
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
      </main>
    </div>
  );
}

export default Perfil;
