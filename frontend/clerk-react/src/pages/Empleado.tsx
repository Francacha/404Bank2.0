import { useState, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Empleado.module.css';
import logoClaro from '../assets/logo404bank-claro.png';
import BandejaSolicitudes, { type ResumenBandeja } from '../components/BandejaSolicitudes';

const API_URL = 'http://localhost:3000';

type Tab = 'solicitudes' | 'clientes';

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  ciudad: string;
  provincia: string;
  id_cuenta: number;
  cbu: string;
  alias: string;
  saldo: number;
  estado: string;
  // Tarjetas activas de la cuenta; pausada = la congeló el cliente.
  tarjetas?: { tipo: string; ultimos4: string | null; pausada: boolean }[];
  fecha_apertura: string;
}

interface Movimiento {
  id: number;
  transaccion_central_id: string;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: string;
  fecha_hora: string;
}

function Empleado() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const [tab, setTab] = useState<Tab>('solicitudes');
  const [pendientes, setPendientes] = useState<number | null>(null);
  const actualizarResumen = useCallback((r: ResumenBandeja) => setPendientes(r.total), []);

  // --- Clientes ---
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [mostrandoTodos, setMostrandoTodos] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [errorMovimientos, setErrorMovimientos] = useState('');
  const [errorAccion, setErrorAccion] = useState('');

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const buscar = async (q?: string) => {
    const termino = q !== undefined ? q : busqueda;
    setBuscando(true);
    setErrorBusqueda('');
    setClienteSeleccionado(null);
    setMovimientos([]);
    setMostrarMovimientos(false);
    setErrorAccion('');
    try {
      const headers = await authHeader();
      const params = termino.trim() ? `?q=${encodeURIComponent(termino.trim())}` : '';
      const res = await fetch(`${API_URL}/api/empleado/buscar${params}`, { headers });
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

  const verTodos = () => { setBusqueda(''); buscar(''); };

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
      const res = await fetch(`${API_URL}/api/empleado/movimientos/${clienteSeleccionado.cbu}`, { headers });
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
      const res = await fetch(`${API_URL}/api/empleado/cuentas/${clienteSeleccionado.id_cuenta}/${accion}`, {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoClaro} alt="404Bank" width={140} height={28} className={styles.logo} />
          <span className={styles.empleadoBadge}>Empleado</span>
        </div>
        <div className={styles.navRight}>
          <span style={{ color: 'rgba(255, 255, 255, 0.82)', fontSize: '14px' }}>
            {user?.firstName} {user?.lastName}
          </span>
          <button className={styles.btnMiCuenta} onClick={() => { setViewMode('client'); navigate('/home'); }}>
            Mi cuenta
          </button>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      {/* Tabs: lo que espera tu acción va primero */}
      <div className={styles.tabsBar} role="tablist" aria-label="Secciones del panel">
        {([
          { id: 'solicitudes', etiqueta: 'Solicitudes' },
          { id: 'clientes', etiqueta: 'Clientes' },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.etiqueta}
            {t.id === 'solicitudes' && pendientes !== null && pendientes > 0 && (
              <span className={styles.tabContador}>{pendientes}<span className={styles.srOnly}> pendientes</span></span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.content}>

        {/* Tab: Clientes */}
        {tab === 'clientes' && (
          <div id="panel-clientes" role="tabpanel" aria-labelledby="tab-clientes">
            <h1 className={styles.title}>Panel de empleado</h1>
            <p className={styles.subtitle}>Buscá un cliente por nombre, apellido, DNI o CBU.</p>

            <div className={styles.searchBox}>
              <div className={styles.searchRow}>
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="Nombre, apellido, DNI o CBU..."
                  className={styles.searchInput}
                />
                <button onClick={() => buscar()} disabled={buscando} className={styles.btnBuscar}>
                  {buscando ? '...' : 'Buscar'}
                </button>
                <button onClick={verTodos} disabled={buscando} className={styles.btnVerTodos}>
                  Ver todos
                </button>
              </div>
              {errorBusqueda && <p className={styles.errorText}>{errorBusqueda}</p>}
            </div>

            {buscado && (
              <div className={styles.resultadosSection}>
                {mostrandoTodos && busqueda.trim() && (
                  <p className={styles.searchNote}>Sin resultados para "{busqueda}". Mostrando todos los clientes.</p>
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
                  <p className={styles.clienteDetalle}>DNI: {clienteSeleccionado.dni} · {clienteSeleccionado.email}</p>
                  <p className={styles.clienteDetalle}>{clienteSeleccionado.ciudad}, {clienteSeleccionado.provincia}</p>
                  <p className={styles.clienteDetalle}>
                    Tarjetas:{' '}
                    {clienteSeleccionado.tarjetas?.length
                      ? clienteSeleccionado.tarjetas.map((t, i) => (
                          <span key={i} className={styles.tarjetaCliente}>
                            {t.tipo === 'credito' ? 'Crédito' : 'Débito'} ···{t.ultimos4 ?? '····'}
                            {t.pausada && <span className={styles.estadoPausada}>Pausada</span>}
                          </span>
                        ))
                      : 'ninguna activa'}
                  </p>
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
                  {errorAccion && <p className={styles.errorText}>{errorAccion}</p>}
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
                    {errorMovimientos && <p className={styles.errorText}>{errorMovimientos}</p>}
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
          </div>
        )}

        {/* Tab: Solicitudes (siempre montada para que el contador esté al día) */}
        <div id="panel-solicitudes" role="tabpanel" aria-labelledby="tab-solicitudes" hidden={tab !== 'solicitudes'}>
          <h1 className={styles.title}>Solicitudes para revisar</h1>
          <p className={styles.subtitle}>Pre-aprobá o rechazá lo que pidieron los clientes. Después lo resuelve un gerente.</p>
          <BandejaSolicitudes rol="empleado" onResumen={actualizarResumen} />
        </div>
      </div>
    </div>
  );
}

export default Empleado;
