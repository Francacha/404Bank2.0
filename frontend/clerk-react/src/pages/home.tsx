import { useState, useEffect } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './home.module.css';

interface Cuenta {
  cbu: string;
  saldo: number;
}

interface Tarjeta {
  id: number;
  tipo: string;
  numero: string | null;
  cvv: string | null;
  fecha_vencimiento: string | null;
  estado: string;
}

const API_URL = 'http://localhost:3000';

function Home() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [tarjetaIdx, setTarjetaIdx] = useState(0);
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const primaryAccount = cuentas[0];

  useEffect(() => {
    const cargarCuentas = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/cuentas/mis-cuentas`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar las cuentas');
        setCuentas(data.cuentas);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargarCuentas();
  }, [getToken]);

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
      } catch {}
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
      } catch {}
    };
    cargarTarjetas();
  }, [getToken]);

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
          <h1 className={styles.topBarTitle}></h1>
          <div className={styles.topBarActions}>
<span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <section className={styles.leftColumn}>
            <div className={styles.sectionHeader}>
              <h2>Resumen General</h2>
            </div>

            <div className={styles.summaryRow}>
              <article className={`${styles.card} ${styles.accountCard}`}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Cuentas</h3>
                </div>

                <div className={styles.cardBody}>
                  {loading && <p className={styles.loadingText}>Cargando tus cuentas...</p>}
                  {error && <div className={styles.errorBox}>{error}</div>}
                  {!loading && !error && cuentas.length === 0 && (
                    <p className={styles.emptyText}>No tenes cuentas activas.</p>
                  )}

                  {!loading && !error && primaryAccount && (
                    <div className={styles.featuredAccount}>
                      <span className={styles.accountLabel}>Cuenta de ahorro</span>
                      <strong className={styles.accountBalance}>
                        $ {Number(primaryAccount.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </strong>
                      <span className={styles.accountCbu}>CBU: {primaryAccount.cbu}</span>
                    </div>
                  )}

                  {cuentas.slice(1).map((cuenta, index) => (
                    <div key={index} className={styles.accountRow}>
                      <div className={styles.accountInfo}>
                        <span className={styles.accountLabel}>Cuenta adicional</span>
                        <span className={styles.accountCbu}>CBU: {cuenta.cbu}</span>
                      </div>
                      <span className={styles.accountRowBalance}>
                        $ {Number(cuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={styles.cardFooterLeft}>
                </div>
              </article>

            </div>

            <article className={`${styles.card} ${styles.tarjetaSection}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Mis Tarjetas</h3>
              </div>

              <div className={styles.tarjetaBody}>
                {tarjetas.length === 0 ? (
                  <div className={styles.tarjetaEmpty}>
                    <span className={styles.tarjetaEmptyIcon} aria-hidden="true"></span>
                    <p className={styles.tarjetaEmptyText}>No posee tarjeta. ¿Desea solicitar una?</p>
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
                          **** **** **** {tarjetas[tarjetaIdx].numero?.slice(-4) ?? '----'}
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
                          <span className={styles.visaLogo}>VISA</span>
                        </div>

                        <div className={styles.tarjetaCircles}>
                          <span></span>
                          <span></span>
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
            </article>

          </section>

        </div>
      </main>
    </div>
  );
}

export default Home;
