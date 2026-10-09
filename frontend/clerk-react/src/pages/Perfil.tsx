import { useRef, useState } from 'react';
import { useUser } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import styles from './perfil.module.css';

const IconPerson = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" /></svg>
);
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6Z" /></svg>
);
const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /></svg>
);

function Perfil() {
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
    <AppLayout title="Mi perfil" subtitle="Tus datos personales y la seguridad de tu cuenta.">

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
      </AppLayout>
  );
}

export default Perfil;
