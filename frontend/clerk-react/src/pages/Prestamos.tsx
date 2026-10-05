import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Prestamos.module.css';

const API_URL = 'http://localhost:3000';

const OPCIONES_CUOTAS = [1, 3, 6, 12] as const;

interface Cuota {
  id: number;
  numero_cuota: number;
  monto: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'vencida' | 'pagada';
  fecha_pago: string | null;
}

interface Prestamo {
  id: number;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  cant_cuotas: number | null;
  cuotas: Cuota[];
}

interface SituacionCrediticia {
  dni: string;
  situacion: number;
  deudas: unknown[];
}

const SITUACION_INFO: Record<number, { etiqueta: string; icono: string; claseColor: string }> = {
  1: { etiqueta: 'Normal', icono: '🟢', claseColor: 'situacion1' },
  2: { etiqueta: 'Riesgo bajo', icono: '🟡', claseColor: 'situacion2' },
  3: { etiqueta: 'Riesgo medio', icono: '🟠', claseColor: 'situacion3' },
  4: { etiqueta: 'Riesgo alto', icono: '🔴', claseColor: 'situacion4' },
  5: { etiqueta: 'Irrecuperable', icono: '⚫', claseColor: 'situacion5' },
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
  { label: 'Comprobantes', path: '/comprobantes', icon: <IconReceipt /> },
];

function Prestamos() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [cantCuotas, setCantCuotas] = useState<number>(1);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);

  const [situacionCrediticia, setSituacionCrediticia] = useState<SituacionCrediticia | null>(null);
  const [loadingSituacion, setLoadingSituacion] = useState(true);
  const [errorSituacion, setErrorSituacion] = useState('');
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

  useEffect(() => {
    const cargarSituacion = async () => {
      setLoadingSituacion(true);
      setErrorSituacion('');
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/prestamos/mi-situacion-crediticia`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo consultar la situación crediticia');
        setSituacionCrediticia(data.situacion_crediticia);
      } catch (err: unknown) {
        if (err instanceof Error) setErrorSituacion(err.message);
        else setErrorSituacion('Error inesperado');
      } finally {
        setLoadingSituacion(false);
      }
    };
    cargarSituacion();
  }, [getToken]);

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
        body: JSON.stringify({ monto: Number(monto), cant_cuotas: cantCuotas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar');
      setMensajeSolicitud('Solicitud enviada correctamente. Quedará pendiente de revisión.');
      setMonto('');
      setCantCuotas(1);
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

  const badgeCuotaClass = (estado: Cuota['estado']) => {
    if (estado === 'pagada') return styles.badgeCuotaPagada;
    if (estado === 'vencida') return styles.badgeCuotaVencida;
    return styles.badgeCuotaPendiente;
  };

  const toggleExpandido = (id: number) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            <h1 className={styles.topbarTitle}>Solicitá un préstamo</h1>
            <p className={styles.topbarSubtitle}>Completá el formulario y seguí el estado de tus solicitudes.</p>
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

            {!loadingSituacion && !errorSituacion && situacionCrediticia && (
              <div className={`${styles.situacionCard} ${styles[SITUACION_INFO[situacionCrediticia.situacion]?.claseColor ?? 'situacion1']}`}>
                <span className={styles.situacionIcono}>
                  {SITUACION_INFO[situacionCrediticia.situacion]?.icono ?? '⚪'}
                </span>
                <div className={styles.situacionTexto}>
                  <span className={styles.situacionTitulo}>
                    Tu situación crediticia: {SITUACION_INFO[situacionCrediticia.situacion]?.etiqueta ?? 'Desconocida'}
                  </span>
                  <span className={styles.situacionSubtitulo}>
                    {situacionCrediticia.deudas.length === 0
                      ? 'Sin deudas registradas en el BCRA'
                      : `${situacionCrediticia.deudas.length} deuda(s) registrada(s) en el BCRA`}
                  </span>
                </div>
              </div>
            )}
            {!loadingSituacion && errorSituacion && (
              <p className={styles.errorMsg}>{errorSituacion}</p>
            )}

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
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Cantidad de cuotas</label>
                  <select
                    value={cantCuotas}
                    onChange={e => setCantCuotas(Number(e.target.value))}
                    className={styles.input}
                  >
                    {OPCIONES_CUOTAS.map(opcion => (
                      <option key={opcion} value={opcion}>
                        {opcion === 1 ? 'Pago único (1 cuota)' : `${opcion} cuotas`}
                      </option>
                    ))}
                  </select>
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
                {prestamos.map(p => {
                  const tieneCuotas = p.estado === 'aprobado' && p.cuotas?.length > 0;
                  const abierto = expandidos.has(p.id);
                  return (
                    <div key={p.id} className={styles.prestamoCard}>
                      <button
                        type="button"
                        className={`${styles.prestamoCardHeader} ${tieneCuotas ? styles.clickable : ''}`}
                        onClick={() => tieneCuotas && toggleExpandido(p.id)}
                      >
                        <div className={styles.prestamoInfo}>
                          <span className={styles.prestamoMonto}>
                            $ {Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={styles.prestamoFecha}>
                            Solicitado: {new Date(p.fecha_solicitud).toLocaleDateString('es-AR')}
                          </span>
                          {p.cant_cuotas && (
                            <span className={styles.prestamoFecha}>
                              {p.cant_cuotas === 1 ? 'Pago único' : `${p.cant_cuotas} cuotas`}
                            </span>
                          )}
                          {p.fecha_resolucion && (
                            <span className={styles.prestamoFecha}>
                              Resuelto: {new Date(p.fecha_resolucion).toLocaleDateString('es-AR')}
                            </span>
                          )}
                        </div>
                        <div className={styles.prestamoHeaderRight}>
                          <span className={badgeClass(p.estado)}>{p.estado.replace('_', ' ')}</span>
                          {tieneCuotas && (
                            <span className={`${styles.cuotasToggleIcon} ${abierto ? styles.open : ''}`}>▾</span>
                          )}
                        </div>
                      </button>

                      {tieneCuotas && abierto && (
                        <div className={styles.cuotasList}>
                          <p className={styles.cuotasListTitle}>Plan de cuotas</p>
                          {p.cuotas.map(c => (
                            <div key={c.id} className={styles.cuotaRow}>
                              <span className={styles.cuotaNumero}>Cuota {c.numero_cuota}</span>
                              <span className={styles.cuotaVencimiento}>
                                Vence: {new Date(c.fecha_vencimiento).toLocaleDateString('es-AR')}
                              </span>
                              <span className={styles.cuotaMonto}>
                                $ {Number(c.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className={badgeCuotaClass(c.estado)}>{c.estado}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Prestamos;
