import { useState, useEffect } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './home.module.css';

interface Cuenta {
  cbu: string;
  saldo: number;
}

const API_URL = 'http://localhost:3000';

function Home() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} aria-label="404Bank">
          <span className={styles.brand404}>404</span>
          <span className={styles.brandBank}>Bank</span>
        </div>

        <nav className={styles.sidebarNav}>
          <button className={`${styles.navItem} ${styles.navItemActive}`}>
            <span className={styles.navIconHome} aria-hidden="true"></span>
            <span>DASHBOARD</span>
          </button>
          <button className={styles.navItem} onClick={() => navigate('/')}>
            <span className={styles.navIconWallet} aria-hidden="true"></span>
            <span>CUENTAS</span>
          </button>
          <button className={styles.navItem} onClick={() => navigate('/transferir')}>
            <span className={styles.navIconTransfer} aria-hidden="true"></span>
            <span>TRANSFERIR</span>
          </button>
          <button className={styles.navItem} onClick={() => navigate('/historial')}>
            <span className={styles.navIconHistory} aria-hidden="true"></span>
            <span>HISTORIAL</span>
          </button>
          <button className={styles.navItem} onClick={() => navigate('/prestamos')}>
            <span className={styles.navIconLoan} aria-hidden="true"></span>
            <span>PRESTAMOS</span>
          </button>
          <button className={styles.navItem} onClick={() => navigate('/tarjetas')}>
            <span className={styles.navIconCard} aria-hidden="true"></span>
            <span>TARJETAS</span>
          </button>
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
          <button className={styles.footerItem} type="button">
            <span className={styles.footerIconSettings} aria-hidden="true"></span>
            <span>Settings</span>
          </button>
          <div className={styles.userSection}>
            <div className={styles.userAvatarSidebar}>{initials || 'U'}</div>
            <span className={styles.userNameSidebar}>{displayName}</span>
          </div>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <h1 className={styles.topBarTitle}>RESUMEN</h1>
          <div className={styles.topBarActions}>
            <button className={styles.iconButton} type="button" aria-label="Ajustes">
              <span className={styles.topIconSettings} aria-hidden="true"></span>
            </button>
            <button className={styles.notificationButton} type="button" aria-label="Notificaciones">
              <span className={styles.topIconBell} aria-hidden="true"></span>
              <span className={styles.notificationBadge}>{initials.charAt(0) || 'U'}</span>
            </button>
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
              <div className={styles.heroLogo} aria-label="404Bank">
                <span className={styles.hero404}>404</span>
                <span className={styles.heroBank}>Bank</span>
              </div>
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
                  <button className={styles.btnTransferNow} onClick={() => navigate('/transferir')}>
                    Transfer Now
                  </button>
                </div>
              </article>

              <article className={styles.chartCard}>
                <div className={styles.chartLine} aria-hidden="true">
                  <span></span>
                </div>
                <div className={styles.chartStats}>
                  <div>
                    <span>Transacciones</span>
                    <strong>28 000,00</strong>
                  </div>
                  <div>
                    <span>Lider de cuentas</span>
                    <strong>45 370,00</strong>
                  </div>
                </div>
              </article>
            </div>

            <article className={`${styles.card} ${styles.historyCard}`}>
              <div className={styles.historyHeader}>
                <h3 className={styles.cardTitle}>Transaction History</h3>
                <button className={styles.btnOutline} onClick={() => navigate('/historial')}>
                  View All
                </button>
              </div>
              <div className={styles.cardBody}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Categoria</th>
                      <th className={styles.textRight}>Balado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <div className={styles.categoryIconCart}></div>
                        <div>
                          <strong>Categorias</strong>
                          <span className={styles.subText}>Categoria</span>
                        </div>
                      </td>
                      <td>102 900,00</td>
                      <td className={`${styles.textRight} ${styles.textPositive}`}>2 500 EUR</td>
                    </tr>
                    <tr>
                      <td>
                        <div className={styles.categoryIconCard}></div>
                        <div>
                          <strong>Forneccione</strong>
                          <span className={styles.subText}>Categoria</span>
                        </div>
                      </td>
                      <td>78 300,00</td>
                      <td className={`${styles.textRight} ${styles.textNegative}`}>-4 550 EUR</td>
                    </tr>
                    <tr>
                      <td>
                        <div className={styles.categoryIconLink}></div>
                        <div>
                          <strong>Tarjetas</strong>
                          <span className={styles.subText}>Categoria</span>
                        </div>
                      </td>
                      <td>36 100,00</td>
                      <td className={`${styles.textRight} ${styles.textNegative}`}>-500 EUR</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <aside className={styles.rightColumn}>
            <div className={styles.creditCardVisual}>
              <div className={styles.ccStripe}></div>
              <div className={styles.ccWave}></div>
              <p className={styles.ccNumber}>1234 4SS6 6789</p>
              <div className={styles.ccDots}>..........</div>
              <div className={styles.ccCircles}>
                <span></span>
                <span></span>
              </div>
            </div>

            <article className={`${styles.card} ${styles.quickCard}`}>
              <div className={styles.quickHeader}>
                <h3 className={styles.cardTitle}>Quick Transfer</h3>
                <span aria-hidden="true">...</span>
              </div>
              <div className={styles.quickBody}>
                <div className={styles.messageRow}>
                  <div className={styles.messageIconBell}>
                    <span>3</span>
                  </div>
                  <div>
                    <strong>Mensajes</strong>
                    <p>Mensajes comheras en de nuestra aim palettia.</p>
                  </div>
                  <span className={styles.messageBadge}>10</span>
                </div>
                <div className={styles.messageRow}>
                  <div className={styles.messageIconMail}></div>
                  <div>
                    <strong>Notificacion notificados</strong>
                    <p>Condinuran matos de cuentas al a asquita.</p>
                  </div>
                  <span className={styles.messageBadgeSmall}></span>
                </div>
              </div>
              <div className={styles.cardFooterRight}>
                <button className={styles.btnTransferNow} onClick={() => navigate('/transferir')}>
                  Transfer Now
                </button>
              </div>
            </article>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Home;
