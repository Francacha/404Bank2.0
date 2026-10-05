import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Prestamos.module.css';

const API_URL = 'http://localhost:3000';

const CUOTAS_POR_DEFECTO = [1, 3, 6, 12, 24, 36];

interface Cuota {
  id: number;
  numero_cuota: number;
  monto: number;
  capital: number | null;
  interes: number;
  iva: number;
  punitorios: number;
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
  tna: number;
  monto_total: number | null;
  cuotas: Cuota[];
}

interface Mora {
  en_mora: boolean;
  deuda: number;
  punitorios: number;
}

interface OpcionSimulada {
  cant_cuotas: number;
  monto_cuota: number;
  monto_total: number;
  recargo_porcentaje: number;
  tea: number;
  cftea: number;
}

interface Simulacion {
  tna: number;
  iva_intereses: number;
  cuotas_permitidas: number[];
  opciones: OpcionSimulada[];
}

const pesos = (valor: number) =>
  `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface SituacionCrediticia {
  dni: string;
  situacion: number;
  deudas: unknown[];
}

const SITUACION_INFO: Record<number, { etiqueta: string; icono: string; claseColor: string }> = {
  1: { etiqueta: 'Normal', icono: '🟢', claseColor: 'situacionVerde' },
  2: { etiqueta: 'Riesgo bajo', icono: '🟡', claseColor: 'situacionAmarilla' },
  3: { etiqueta: 'Riesgo medio', icono: '🟠', claseColor: 'situacionNaranja' },
  4: { etiqueta: 'Riesgo alto', icono: '🔴', claseColor: 'situacionRoja' },
  5: { etiqueta: 'Irrecuperable', icono: '⚫', claseColor: 'situacionNegra' },
};

function Prestamos() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [cantCuotas, setCantCuotas] = useState<number>(1);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [mora, setMora] = useState<Mora | null>(null);
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);

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
      setMora(data.mora ?? null);
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

  // Simula el préstamo mientras el cliente escribe el monto (con una pequeña espera entre teclas)
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/prestamos/simular?monto=${Number(monto) || 0}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) setSimulacion(await res.json());
      } catch {
        setSimulacion(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [monto, getToken]);

  const opcionesCuotas = simulacion?.cuotas_permitidas ?? CUOTAS_POR_DEFECTO;
  const opcionElegida = simulacion?.opciones.find(o => o.cant_cuotas === cantCuotas);

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
    if (estado === 'aprobado' || estado === 'finalizado') return styles.badgeAprobado;
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
            <button className={styles.navSubItem} onClick={() => navigate('/inversiones')}>Inversiones</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Transacciones</span>
            <button className={styles.navSubItem} onClick={() => navigate('/transferir')}>Transferir</button>
            <button className={styles.navSubItem}>Recargas</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Seguridad</span>
            <button className={styles.navSubItem}>Cambio de Contraseña</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Atención al cliente</span>
            <button className={styles.navSubItem} onClick={() => navigate('/chat')}>Chat</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Documentos</span>
            <button className={styles.navSubItem} onClick={() => navigate('/historial')}>Historial</button>
            <button className={styles.navSubItem}>Comprobantes</button>
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

          {!loadingSituacion && !errorSituacion && situacionCrediticia && (
            <div className={`${styles.situacionCard} ${styles[SITUACION_INFO[situacionCrediticia.situacion]?.claseColor ?? 'situacionVerde']}`}>
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

          {mora?.en_mora && (
            <div className={`${styles.situacionCard} ${styles.situacionRoja}`}>
              <span className={styles.situacionIcono}>⚠️</span>
              <div className={styles.situacionTexto}>
                <span className={styles.situacionTitulo}>
                  Tenés cuotas impagas: debés {pesos(mora.deuda)}
                </span>
                <span className={styles.situacionSubtitulo}>
                  La deuda está en el saldo negativo de tu cuenta y se descuenta sola cuando ingresa dinero.
                  {mora.punitorios > 0 && ` Incluye ${pesos(mora.punitorios)} de intereses punitorios, que siguen aumentando mientras no la canceles.`}
                  {' '}Hasta regularizarla no podés pedir préstamos ni tarjetas.
                </span>
              </div>
            </div>
          )}

          <div className={styles.formCard}>
            <h3 className={styles.formCardTitle}>Nueva solicitud</h3>
            <form onSubmit={handleSolicitar} className={styles.form}>
              <fieldset disabled={mora?.en_mora} className={styles.fieldset}>
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
                    {opcionesCuotas.map(opcion => (
                      <option key={opcion} value={opcion}>
                        {opcion === 1 ? 'Pago único (1 cuota)' : `${opcion} cuotas`}
                      </option>
                    ))}
                  </select>
                </div>
                {opcionElegida && (
                  <div className={styles.simulacion}>
                    <div className={styles.simulacionFila}>
                      <span>{cantCuotas === 1 ? 'Pago único' : `${cantCuotas} cuotas fijas de`}</span>
                      <strong>{pesos(opcionElegida.monto_cuota)}</strong>
                    </div>
                    <div className={styles.simulacionFila}>
                      <span>Total a devolver</span>
                      <strong>{pesos(opcionElegida.monto_total)}</strong>
                    </div>
                    <div className={styles.simulacionFila}>
                      <span>Intereses + IVA</span>
                      <strong>+{opcionElegida.recargo_porcentaje.toLocaleString('es-AR')}%</strong>
                    </div>
                    <p className={styles.simulacionTasas}>
                      TNA {simulacion?.tna}% · TEA {opcionElegida.tea.toLocaleString('es-AR')}% ·
                      CFTEA {opcionElegida.cftea.toLocaleString('es-AR')}% (con IVA {simulacion?.iva_intereses}%).
                      Sistema francés: la cuota es fija y el interés se calcula sobre el capital que queda por pagar.
                    </p>
                  </div>
                )}
                <button type="submit" disabled={enviando || !monto} className={styles.btnSolicitar}>
                  {enviando ? 'Enviando...' : 'Solicitar préstamo'}
                </button>
              </fieldset>
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
                const tieneCuotas = (p.estado === 'aprobado' || p.estado === 'finalizado') && p.cuotas?.length > 0;
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
                            {Number(p.tna) > 0 && ` · TNA ${Number(p.tna)}%`}
                          </span>
                        )}
                        {p.monto_total && Number(p.monto_total) !== Number(p.monto) && (
                          <span className={styles.prestamoFecha}>
                            Total a devolver: {pesos(p.monto_total)}
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
                              Vence: {new Date(c.fecha_vencimiento).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                              {Number(c.interes) > 0 && (
                                <span className={styles.cuotaDetalle}>
                                  Capital {pesos(Number(c.capital))} · Interés {pesos(c.interes)} · IVA {pesos(c.iva)}
                                </span>
                              )}
                              {Number(c.punitorios) > 0 && (
                                <span className={`${styles.cuotaDetalle} ${styles.cuotaPunitorios}`}>
                                  + {pesos(c.punitorios)} de intereses punitorios
                                </span>
                              )}
                            </span>
                            <span className={styles.cuotaMonto}>
                              $ {Number(c.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className={badgeCuotaClass(c.estado)}>
                              {c.estado === 'vencida' ? 'en mora' : c.estado}
                            </span>
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
      </main>
    </div>
  );
}

export default Prestamos;
