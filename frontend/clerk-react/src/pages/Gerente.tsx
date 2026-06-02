import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Gerente.module.css';

const API_URL = 'http://localhost:3000';

type Tab = 'empleados' | 'clientes' | 'solicitudes';

interface Empleado {
  clerkId: string;
  email: string;
  nombre: string;
  apellido: string;
}

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  ciudad: string;
  provincia: string;
  id_cuenta: number;
  cbu: string;
  alias: string;
  saldo: number;
  estado: string;
}

interface Movimiento {
  id: number;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: string;
  fecha_hora: string;
}

interface SolicitudPrestamo {
  id: number;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  nombre: string;
  apellido: string;
  dni: string;
  cbu: string;
}

interface SolicitudTarjeta {
  id: number;
  tipo: string;
  estado: string;
  fecha_solicitud: string;
  nombre: string;
  apellido: string;
  dni: string;
  cbu: string;
}

function Gerente() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const [tab, setTab] = useState<Tab>('empleados');

  // --- Empleados ---
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(true);
  const [errorEmpleados, setErrorEmpleados] = useState('');
  const [mensajeRevocar, setMensajeRevocar] = useState('');

  // --- Clientes ---
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [mostrandoTodos, setMostrandoTodos] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [errorMovimientos, setErrorMovimientos] = useState('');
  const [errorAccion, setErrorAccion] = useState('');

  // --- Solicitudes ---
  const [prestamos, setPrestamos] = useState<SolicitudPrestamo[]>([]);
  const [tarjetas, setTarjetas] = useState<SolicitudTarjeta[]>([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');

  const authHeader = useCallback(async () => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const fetchConToken = useCallback(async (url: string) => {
    const headers = await authHeader();
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar datos');
    return data;
  }, [authHeader]);

  const cargarEmpleados = useCallback(async () => {
    setLoadingEmpleados(true);
    setErrorEmpleados('');
    try {
      const data = await fetchConToken(`${API_URL}/api/gerente/empleados`);
      setEmpleados(data.usuarios);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorEmpleados(err.message);
      else setErrorEmpleados('Error inesperado');
    } finally {
      setLoadingEmpleados(false);
    }
  }, [fetchConToken]);

  const cargarSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      const headers = await authHeader();
      const [resPrestamos, resTarjetas] = await Promise.all([
        fetch(`${API_URL}/api/prestamos/pre-aprobados`, { headers }),
        fetch(`${API_URL}/api/tarjetas/pre-aprobadas`, { headers }),
      ]);
      const dataPrestamos = await resPrestamos.json();
      const dataTarjetas = await resTarjetas.json();
      setPrestamos(dataPrestamos.prestamos || []);
      setTarjetas(dataTarjetas.tarjetas || []);
    } catch {
      // silencioso
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [authHeader]);

  useEffect(() => {
    cargarEmpleados();
  }, [cargarEmpleados]);

  useEffect(() => {
    if (tab === 'solicitudes') cargarSolicitudes();
  }, [tab, cargarSolicitudes]);

  const handleRevocarEmpleado = async (clerkId: string) => {
    setMensajeRevocar('');
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}/api/gerente/empleados/${clerkId}/revocar`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al revocar empleado');
      setMensajeRevocar(data.mensaje);
      setEmpleados(prev => prev.filter(e => e.clerkId !== clerkId));
    } catch (err: unknown) {
      if (err instanceof Error) setMensajeRevocar(err.message);
      else setMensajeRevocar('Error inesperado');
    }
  };

  const accionPrestamo = async (id: number, accion: 'aprobar' | 'rechazar') => {
    setMensajeSolicitud('');
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}/api/prestamos/${id}/${accion}`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensajeSolicitud(accion === 'aprobar' ? 'Préstamo aprobado. El saldo fue acreditado.' : 'Préstamo rechazado.');
      cargarSolicitudes();
    } catch (err: unknown) {
      if (err instanceof Error) setMensajeSolicitud(err.message);
    }
  };

  const accionTarjeta = async (id: number, accion: 'aprobar' | 'rechazar') => {
    setMensajeSolicitud('');
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}/api/tarjetas/${id}/${accion}`, {
        method: 'PUT',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensajeSolicitud(accion === 'aprobar' ? 'Tarjeta aprobada y activada.' : 'Tarjeta rechazada.');
      cargarSolicitudes();
    } catch (err: unknown) {
      if (err instanceof Error) setMensajeSolicitud(err.message);
    }
  };

  const buscarCliente = async (q?: string) => {
    const termino = q !== undefined ? q : busquedaCliente;
    setBuscando(true);
    setErrorBusqueda('');
    setClienteSeleccionado(null);
    setMovimientos([]);
    setMostrarMovimientos(false);
    setErrorAccion('');
    try {
      const headers = await authHeader();
      const params = termino.trim() ? `?q=${encodeURIComponent(termino.trim())}` : '';
      const res = await fetch(`${API_URL}/api/gerente/clientes/buscar${params}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar');
      setResultados(data.usuarios);
      setMostrandoTodos(data.mostrandoTodos);
      setBuscado(true);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorBusqueda(err.message);
      else setErrorBusqueda('Error inesperado');
    } finally {
      setBuscando(false);
    }
  };

  const verTodosClientes = () => { setBusquedaCliente(''); buscarCliente(''); };

  const seleccionarCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setMovimientos([]);
    setMostrarMovimientos(false);
    setErrorAccion('');
  };

  const verMovimientos = async () => {
    if (!clienteSeleccionado) return;
    setCargandoMovimientos(true);
    setErrorMovimientos('');
    setMostrarMovimientos(true);
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}/api/gerente/clientes/movimientos/${clienteSeleccionado.cbu}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar movimientos');
      setMovimientos(data.movimientos);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMovimientos(err.message);
      else setErrorMovimientos('Error inesperado');
    } finally {
      setCargandoMovimientos(false);
    }
  };

  const cambiarEstado = async (accion: 'bloquear' | 'activar') => {
    if (!clienteSeleccionado) return;
    setErrorAccion('');
    try {
      const headers = await authHeader();
      const res = await fetch(`${API_URL}/api/gerente/clientes/${clienteSeleccionado.id_cuenta}/${accion}`, {
        method: 'PATCH',
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar la cuenta');
      const nuevoEstado = accion === 'bloquear' ? 'Bloqueada' : 'Activa';
      setClienteSeleccionado(prev => prev ? { ...prev, estado: nuevoEstado } : prev);
      setResultados(prev => prev.map(r =>
        r.id_cuenta === clienteSeleccionado.id_cuenta ? { ...r, estado: nuevoEstado } : r
      ));
    } catch (err: unknown) {
      if (err instanceof Error) setErrorAccion(err.message);
      else setErrorAccion('Error inesperado');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <span className={styles.gerenteBadge}>Gerente</span>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
          <button className={styles.btnMiCuenta} onClick={() => { setViewMode('client'); navigate('/home'); }}>
            Mi cuenta
          </button>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsBar}>
        <button className={`${styles.tabBtn} ${tab === 'empleados' ? styles.tabBtnActive : ''}`} onClick={() => setTab('empleados')}>
          Empleados
        </button>
        <button className={`${styles.tabBtn} ${tab === 'clientes' ? styles.tabBtnActive : ''}`} onClick={() => setTab('clientes')}>
          Clientes
        </button>
        <button className={`${styles.tabBtn} ${tab === 'solicitudes' ? styles.tabBtnActive : ''}`} onClick={() => setTab('solicitudes')}>
          Solicitudes
        </button>
      </div>

      <div className={styles.content}>

        {/* Tab: Empleados */}
        {tab === 'empleados' && (
          <>
            <h1 className={styles.title}>Gestión de empleados</h1>
            <p className={styles.subtitle}>Asignación y revocación de empleados del sistema.</p>
            <h2 className={styles.listTitle}>Empleados activos</h2>
            {mensajeRevocar && <p className={styles.successMsg}>{mensajeRevocar}</p>}
            {loadingEmpleados && <p className={styles.loadingText}>Cargando empleados...</p>}
            {errorEmpleados && <div className={styles.errorBox}>{errorEmpleados}</div>}
            {!loadingEmpleados && !errorEmpleados && empleados.length === 0 && (
              <p className={styles.emptyText}>No hay empleados asignados todavía.</p>
            )}
            {!loadingEmpleados && !errorEmpleados && empleados.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Nombre</th><th>Email</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {empleados.map(e => (
                      <tr key={e.clerkId}>
                        <td>{e.apellido ? `${e.apellido}, ${e.nombre}` : e.nombre || '—'}</td>
                        <td>{e.email}</td>
                        <td>
                          <button className={styles.btnRevocar} onClick={() => handleRevocarEmpleado(e.clerkId)}>
                            Revocar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Tab: Clientes */}
        {tab === 'clientes' && (
          <>
            <h1 className={styles.title}>Gestión de clientes</h1>
            <p className={styles.subtitle}>Buscá un cliente por nombre, apellido, DNI o CBU.</p>
            <div className={styles.searchBox}>
              <div className={styles.searchRow}>
                <input
                  value={busquedaCliente}
                  onChange={e => setBusquedaCliente(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarCliente()}
                  placeholder="Nombre, apellido, DNI o CBU..."
                  className={styles.searchInput}
                />
                <button onClick={() => buscarCliente()} disabled={buscando} className={styles.btnBuscar}>
                  {buscando ? '...' : 'Buscar'}
                </button>
                <button onClick={verTodosClientes} disabled={buscando} className={styles.btnVerTodos}>
                  Ver todos
                </button>
              </div>
              {errorBusqueda && <p className={styles.errorMsg}>{errorBusqueda}</p>}
            </div>
            {buscado && (
              <div className={styles.resultadosSection}>
                {mostrandoTodos && busquedaCliente.trim() && (
                  <p className={styles.searchNote}>Sin resultados para "{busquedaCliente}". Mostrando todos los clientes.</p>
                )}
                {!mostrandoTodos && (
                  <p className={styles.searchNote}>{resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}.</p>
                )}
                {resultados.length === 0 ? (
                  <p className={styles.emptyText}>No hay clientes registrados.</p>
                ) : (
                  <div className={styles.tableWrapper}>
                    <table className={styles.tableResultados}>
                      <thead>
                        <tr><th>Nombre</th><th>DNI</th><th>CBU</th><th>Estado</th></tr>
                      </thead>
                      <tbody>
                        {resultados.map(c => (
                          <tr
                            key={c.id}
                            className={`${styles.filaCliente} ${clienteSeleccionado?.id === c.id ? styles.filaActiva : ''}`}
                            onClick={() => seleccionarCliente(c)}
                          >
                            <td>{c.apellido}, {c.nombre}</td>
                            <td>{c.dni}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{c.cbu}</td>
                            <td>
                              <span className={c.estado === 'Activa' ? styles.estadoActiva : styles.estadoBloqueada}>
                                {c.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {clienteSeleccionado && (
              <>
                <div className={styles.clienteCard}>
                  <p className={styles.clienteNombre}>{clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}</p>
                  <p className={styles.clienteDetalle}>{clienteSeleccionado.email}</p>
                  <p className={styles.clienteDetalle}>{clienteSeleccionado.ciudad}, {clienteSeleccionado.provincia}</p>
                  <div className={styles.cuentaRow}>
                    <div>
                      <p className={styles.cuentaLabel}>CBU</p>
                      <p className={styles.cuentaCbu}>{clienteSeleccionado.cbu}</p>
                    </div>
                    <div>
                      <p className={styles.cuentaLabel}>Saldo</p>
                      <p className={styles.cuentaSaldo}>
                        $ {Number(clienteSeleccionado.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div>
                      <p className={styles.cuentaLabel}>Estado</p>
                      <span className={clienteSeleccionado.estado === 'Activa' ? styles.estadoActiva : styles.estadoBloqueada}>
                        {clienteSeleccionado.estado}
                      </span>
                    </div>
                  </div>
                  {errorAccion && <p className={styles.errorMsg}>{errorAccion}</p>}
                  <div className={styles.accionesRow}>
                    {clienteSeleccionado.estado === 'Activa' ? (
                      <button className={styles.btnBloquear} onClick={() => cambiarEstado('bloquear')}>Bloquear cuenta</button>
                    ) : (
                      <button className={styles.btnActivar} onClick={() => cambiarEstado('activar')}>Activar cuenta</button>
                    )}
                    <button className={styles.btnMovimientos} onClick={verMovimientos}>Ver movimientos</button>
                  </div>
                </div>
                {mostrarMovimientos && (
                  <div className={styles.movimientosSection}>
                    <h2 className={styles.movimientosTitle}>Movimientos de la cuenta</h2>
                    {cargandoMovimientos && <p className={styles.loadingText}>Cargando...</p>}
                    {errorMovimientos && <p className={styles.errorMsg}>{errorMovimientos}</p>}
                    {!cargandoMovimientos && movimientos.length === 0 && (
                      <p className={styles.loadingText}>No hay movimientos registrados.</p>
                    )}
                    <div className={styles.movimientosList}>
                      {movimientos.map(m => (
                        <div key={m.id} className={`${styles.movimientoCard} ${m.tipo === 'entrante' ? styles.cardEntrante : styles.cardSaliente}`}>
                          <div className={styles.movimientoTop}>
                            <span className={`${styles.importe} ${m.tipo === 'entrante' ? styles.importeEntrante : styles.importeSaliente}`}>
                              {m.tipo === 'entrante' ? '+ ' : '- '}
                              $ {Number(m.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className={styles.fecha}>{new Date(m.fecha_hora).toLocaleString('es-AR')}</span>
                          </div>
                          <p className={styles.cbuInfo}>
                            {m.tipo === 'entrante' ? `De: ${m.cbu_origen}` : `Para: ${m.cbu_destino}`}
                          </p>
                          <span className={m.estado === 'aprobada' ? styles.badgeAprobada : styles.badgeRechazada}>
                            {m.estado}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Tab: Solicitudes */}
        {tab === 'solicitudes' && (
          <>
            <h1 className={styles.title}>Solicitudes pre-aprobadas</h1>
            <p className={styles.subtitle}>Aprobación final de préstamos y tarjetas.</p>

            {mensajeSolicitud && <p className={styles.successMsg}>{mensajeSolicitud}</p>}
            {loadingSolicitudes && <p className={styles.loadingText}>Cargando...</p>}

            {/* Préstamos */}
            <h2 className={styles.listTitle}>Préstamos</h2>
            {!loadingSolicitudes && prestamos.length === 0 && (
              <p className={styles.emptyText}>No hay préstamos pre-aprobados pendientes.</p>
            )}
            {prestamos.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Cliente</th><th>DNI</th><th>Monto</th><th>Fecha</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {prestamos.map(p => (
                      <tr key={p.id}>
                        <td>{p.apellido}, {p.nombre}</td>
                        <td>{p.dni}</td>
                        <td>$ {Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                        <td>{new Date(p.fecha_solicitud).toLocaleDateString('es-AR')}</td>
                        <td>
                          <div className={styles.accionesRow}>
                            <button className={styles.btnActivar} onClick={() => accionPrestamo(p.id, 'aprobar')}>
                              Aprobar
                            </button>
                            <button className={styles.btnRevocar} onClick={() => accionPrestamo(p.id, 'rechazar')}>
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tarjetas */}
            <h2 className={styles.listTitle} style={{ marginTop: '32px' }}>Tarjetas</h2>
            {!loadingSolicitudes && tarjetas.length === 0 && (
              <p className={styles.emptyText}>No hay tarjetas pre-aprobadas pendientes.</p>
            )}
            {tarjetas.length > 0 && (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Cliente</th><th>DNI</th><th>Tipo</th><th>Fecha</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {tarjetas.map(t => (
                      <tr key={t.id}>
                        <td>{t.apellido}, {t.nombre}</td>
                        <td>{t.dni}</td>
                        <td style={{ textTransform: 'capitalize' }}>{t.tipo}</td>
                        <td>{new Date(t.fecha_solicitud).toLocaleDateString('es-AR')}</td>
                        <td>
                          <div className={styles.accionesRow}>
                            <button className={styles.btnActivar} onClick={() => accionTarjeta(t.id, 'aprobar')}>
                              Aprobar
                            </button>
                            <button className={styles.btnRevocar} onClick={() => accionTarjeta(t.id, 'rechazar')}>
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Gerente;
