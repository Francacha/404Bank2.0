import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Prestamos.module.css';

const API_URL = 'http://localhost:3000';

interface Prestamo {
  id: number;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

function Prestamos() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';

  const cargarPrestamos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/mis-prestamos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar préstamos');
      setPrestamos(data.prestamos);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarPrestamos();
  }, [cargarPrestamos]);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ monto: Number(monto) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar');
      setMensajeSolicitud('Solicitud enviada correctamente. Quedará pendiente de revisión.');
      setMonto('');
      cargarPrestamos();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorSolicitud(err.message);
      else setErrorSolicitud('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  const badgeClass = (estado: string) => {
    if (estado === 'aprobado') return styles.badgeAprobado;
    if (estado === 'rechazado') return styles.badgeRechazado;
    if (estado === 'pre_aprobado') return styles.badgePreAprobado;
    return styles.badgePendiente;
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
            <button className={styles.navSubItem} onClick={() => navigate('/home')}>Cuentas</button>
            <button className={styles.navSubItem} onClick={() => navigate('/tarjetas')}>Tarjetas</button>
            <button className={`${styles.navSubItem} ${styles.navSubItemActive}`}>Préstamos</button>
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
          <h1 className={styles.topBarTitle}>PRÉSTAMOS</h1>
          <div className={styles.topBarActions}>
            <span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <div className={styles.pageContent}>
          <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>Solicitá un préstamo</h2>
            <p className={styles.pageSubtitle}>Completá el formulario y seguí el estado de tus solicitudes.</p>
          </div>

          <div className={styles.formCard}>
            <h3 className={styles.formCardTitle}>Nueva solicitud</h3>
            <form onSubmit={handleSolicitar} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Monto solicitado ($)</label>
                <input
                  type="number"
                  min="1"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  placeholder="Ej: 50000"
                  className={styles.input}
                  required
                />
              </div>
              <button type="submit" disabled={enviando || !monto} className={styles.btnSolicitar}>
                {enviando ? 'Enviando...' : 'Solicitar préstamo'}
              </button>
            </form>
            {mensajeSolicitud && <p className={styles.successMsg}>{mensajeSolicitud}</p>}
            {errorSolicitud && <p className={styles.errorMsg}>{errorSolicitud}</p>}
          </div>

          <div className={styles.listSection}>
            <h3 className={styles.listTitle}>Mis solicitudes</h3>
            {loading && <p className={styles.loadingText}>Cargando...</p>}
            {error && <p className={styles.errorMsg}>{error}</p>}
            {!loading && !error && prestamos.length === 0 && (
              <p className={styles.emptyText}>No tenés solicitudes de préstamos todavía.</p>
            )}
            <div className={styles.lista}>
              {prestamos.map(p => (
                <div key={p.id} className={styles.prestamoCard}>
                  <div className={styles.prestamoInfo}>
                    <span className={styles.prestamoMonto}>
                      $ {Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={styles.prestamoFecha}>
                      Solicitado: {new Date(p.fecha_solicitud).toLocaleDateString('es-AR')}
                    </span>
                    {p.fecha_resolucion && (
                      <span className={styles.prestamoFecha}>
                        Resuelto: {new Date(p.fecha_resolucion).toLocaleDateString('es-AR')}
                      </span>
                    )}
                  </div>
                  <span className={badgeClass(p.estado)}>{p.estado.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Prestamos;
