import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import styles from './Admin.module.css';

const API_URL = 'http://localhost:3000';

interface Usuario {
  id: number;
  clerk_id: string;
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
  fecha_apertura: string;
}

interface Transferencia {
  id: number;
  transaccion_central_id: string;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: string;
  fecha_hora: string;
}
interface UsuarioConRol {
  clerkId: string;
  email: string;
  nombre: string;
  apellido: string;
  role: string;
}


type Tab = 'usuarios' | 'transferencias' | 'roles';

function Admin() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [tab, setTab] = useState<Tab>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busquedaAdmin, setBusquedaAdmin] = useState('');
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Estados para la pestaña de Roles
const [usuariosConRol, setUsuariosConRol] = useState<UsuarioConRol[]>([]);
const [personasParaRol, setPersonasParaRol] = useState<Usuario[]>([]);
const [busquedaPersona, setBusquedaPersona] = useState('');
const [personaRolSeleccionada, setPersonaRolSeleccionada] = useState<Usuario | null>(null);
const [rolNuevo, setRolNuevo] = useState<'empleado' | 'gerente'>('empleado');
const [mensajeRol, setMensajeRol] = useState('');
const [errorRol, setErrorRol] = useState('');


  const fetchConToken = useCallback(async (url: string) => {
    const token = await getToken();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar datos');
    return data;
  }, [getToken]);

  useEffect(() => {
    const cargar = async () => {
      setLoading(true);
      setError('');
      try {
if (tab === 'usuarios') {
  const data = await fetchConToken(`${API_URL}/api/admin/usuarios`);
  setUsuarios(data.usuarios);
} else if (tab === 'transferencias') {
  const data = await fetchConToken(`${API_URL}/api/admin/transferencias`);
  setTransferencias(data.transferencias);
} else if (tab === 'roles') {
  const [dataRoles, dataPersonas] = await Promise.all([
    fetchConToken(`${API_URL}/api/admin/roles/usuarios-con-rol`),
    fetchConToken(`${API_URL}/api/admin/usuarios`),
  ]);
  setUsuariosConRol(dataRoles.usuarios);
  setPersonasParaRol(dataPersonas.usuarios);
}
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [tab, fetchConToken]);

  const cambiarEstadoCuenta = async (id_cuenta: number, accion: 'bloquear' | 'activar') => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/admin/cuentas/${id_cuenta}/${accion}`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar cuenta');

      // Actualizar el estado local sin recargar todo
      setUsuarios(prev =>
        prev.map(u =>
          u.id_cuenta === id_cuenta
            ? { ...u, estado: accion === 'bloquear' ? 'Bloqueada' : 'Activa' }
            : u
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    }
  };
  const handleAsignarRol = async () => {
  if (!personaRolSeleccionada) return;
  setMensajeRol('');
  setErrorRol('');
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/admin/roles/asignar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ clerkId: personaRolSeleccionada.clerk_id, role: rolNuevo }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al asignar rol');
    setMensajeRol(data.mensaje);
    setPersonaRolSeleccionada(null);
    setBusquedaPersona('');
    const lista = await fetchConToken(`${API_URL}/api/admin/roles/usuarios-con-rol`);
    setUsuariosConRol(lista.usuarios);
  } catch (err: unknown) {
    if (err instanceof Error) setErrorRol(err.message);
    else setErrorRol('Error inesperado');
  }
};

const handleRevocarRol = async (clerkId: string) => {
  setMensajeRol('');
  setErrorRol('');
  try {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/admin/roles/${clerkId}/revocar`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al revocar rol');
    setMensajeRol(data.mensaje);
    setUsuariosConRol(prev => prev.filter(u => u.clerkId !== clerkId));
  } catch (err: unknown) {
    if (err instanceof Error) setErrorRol(err.message);
    else setErrorRol('Error inesperado');
  }
};



  return (
    <div className={styles.page}>
      {/* Navbar */}
      <div className={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={styles.brand}>404Bank</span>
          <span className={styles.adminBadge}>Admin</span>
        </div>
        <div className={styles.navRight}>
          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
            {user?.firstName} {user?.lastName}
          </span>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        <h1 className={styles.title}>Panel de administración</h1>
        <p className={styles.subtitle}>Gestión de clientes, cuentas y transferencias del sistema.</p>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'usuarios' ? styles.tabActive : ''}`}
            onClick={() => setTab('usuarios')}
          >
            Clientes y cuentas
          </button>
          <button
            className={`${styles.tab} ${tab === 'transferencias' ? styles.tabActive : ''}`}
            onClick={() => setTab('transferencias')}
          >
            Transferencias
          </button>
          <button
            className={`${styles.tab} ${tab === 'roles' ? styles.tabActive : ''}`}
            onClick={() => setTab('roles')}
          >
            Roles
          </button>
        </div>

        {loading && <p className={styles.loadingText}>Cargando...</p>}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Tab: Usuarios */}
        {!loading && !error && tab === 'usuarios' && (
          <div>
            <div className={styles.searchBarRow}>
              <input
                type="text"
                placeholder="Buscar por nombre, apellido, DNI o CBU..."
                value={busquedaAdmin}
                onChange={e => setBusquedaAdmin(e.target.value)}
                className={styles.searchInput}
              />
              {busquedaAdmin && (
                <button className={styles.btnLimpiar} onClick={() => setBusquedaAdmin('')}>
                  Limpiar
                </button>
              )}
            </div>
            {(() => {
              const q = busquedaAdmin.trim().toLowerCase();
              const filtrados = q
                ? usuarios.filter(u =>
                    u.nombre?.toLowerCase().includes(q) ||
                    u.apellido?.toLowerCase().includes(q) ||
                    u.dni?.includes(q) ||
                    u.cbu?.includes(q)
                  )
                : usuarios;
              const sinResultados = q && filtrados.length === 0;
              const lista = sinResultados ? usuarios : filtrados;
              return (
                <>
                  {sinResultados && (
                    <p className={styles.searchNote}>Sin resultados para "{busquedaAdmin}". Mostrando todos los usuarios.</p>
                  )}
                  {!sinResultados && q && (
                    <p className={styles.searchNote}>{filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}.</p>
                  )}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>DNI</th>
                  <th>Email</th>
                  <th>Ciudad</th>
                  <th>CBU</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(u => (
                  <tr key={u.id}>
                    <td>{u.apellido}, {u.nombre}</td>
                    <td>{u.dni}</td>
                    <td>{u.email}</td>
                    <td>{u.ciudad}, {u.provincia}</td>
                    <td style={{ fontFamily: 'monospace' }}>{u.cbu}</td>
                    <td>$ {Number(u.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={u.estado === 'Activa' ? styles.estadoActiva : styles.estadoBloqueada}>
                        {u.estado}
                      </span>
                    </td>
                    <td>
                      {u.estado === 'Activa' ? (
                        <button
                          className={styles.btnBloquear}
                          onClick={() => cambiarEstadoCuenta(u.id_cuenta, 'bloquear')}
                        >
                          Bloquear
                        </button>
                      ) : (
                        <button
                          className={styles.btnActivar}
                          onClick={() => cambiarEstadoCuenta(u.id_cuenta, 'activar')}
                        >
                          Activar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Tab: Transferencias */}
        {!loading && !error && tab === 'transferencias' && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>CBU Origen</th>
                  <th>CBU Destino</th>
                  <th>Importe</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.map(t => (
                  <tr key={t.id}>
                    <td>{new Date(t.fecha_hora).toLocaleString('es-AR')}</td>
                    <td style={{ fontFamily: 'monospace' }}>{t.cbu_origen}</td>
                    <td style={{ fontFamily: 'monospace' }}>{t.cbu_destino}</td>
                    <td>$ {Number(t.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={t.tipo === 'entrante' ? styles.tipoEntrante : styles.tipoSaliente}>
                        {t.tipo}
                      </span>
                    </td>
                    <td>
                      <span className={t.estado === 'aprobada' ? styles.estadoAprobada : styles.estadoRechazada}>
                        {t.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab: Roles */}
        {!loading && tab === 'roles' && (
          <div className={styles.rolesSection}>
            {/* Formulario asignar rol */}
            <div className={styles.rolesForm}>
              <h2 className={styles.rolesTitle}>Asignar rol</h2>

              {/* Picker de usuario */}
              {personaRolSeleccionada ? (
                <div className={styles.pickerSelected}>
                  <span className={styles.pickerSelectedNombre}>
                    {personaRolSeleccionada.apellido}, {personaRolSeleccionada.nombre}
                  </span>
                  <span className={styles.pickerSelectedEmail}>{personaRolSeleccionada.email}</span>
                  <button
                    className={styles.btnLimpiarPicker}
                    onClick={() => { setPersonaRolSeleccionada(null); setBusquedaPersona(''); setMensajeRol(''); setErrorRol(''); }}
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className={styles.pickerContainer}>
                  <input
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={busquedaPersona}
                    onChange={e => setBusquedaPersona(e.target.value)}
                    className={styles.rolesInput}
                  />
                  <div className={styles.pickerList}>
                    {(() => {
                      const q = busquedaPersona.trim().toLowerCase();
                      const filtrados = q
                        ? personasParaRol.filter(p =>
                            p.nombre?.toLowerCase().includes(q) ||
                            p.apellido?.toLowerCase().includes(q) ||
                            p.dni?.includes(q)
                          )
                        : personasParaRol.slice(0, 15);
                      if (filtrados.length === 0) return (
                        <p className={styles.pickerEmpty}>Sin resultados.</p>
                      );
                      return filtrados.map(p => (
                        <div
                          key={p.id}
                          className={styles.pickerItem}
                          onClick={() => { setPersonaRolSeleccionada(p); setBusquedaPersona(''); }}
                        >
                          <span className={styles.pickerItemNombre}>{p.apellido}, {p.nombre}</span>
                          <span className={styles.pickerItemEmail}>{p.email}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

              <div className={styles.rolesInputRow}>
                <select
                  value={rolNuevo}
                  onChange={e => setRolNuevo(e.target.value as 'empleado' | 'gerente')}
                  className={styles.rolesSelect}
                >
                  <option value="empleado">Empleado</option>
                  <option value="gerente">Gerente</option>
                </select>
                <button
                  onClick={handleAsignarRol}
                  disabled={!personaRolSeleccionada}
                  className={styles.btnAsignar}
                >
                  Asignar
                </button>
              </div>
              {mensajeRol && <p className={styles.rolesSuccess}>{mensajeRol}</p>}
              {errorRol && <p className={styles.rolesError}>{errorRol}</p>}
            </div>

            {/* Lista de usuarios con rol */}
            <h2 className={styles.rolesTitle}>Empleados y gerentes activos</h2>
            {usuariosConRol.length === 0 ? (
              <p className={styles.loadingText}>No hay empleados ni gerentes asignados.</p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Rol</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosConRol.map(u => (
                      <tr key={u.clerkId}>
                        <td>{u.apellido ? `${u.apellido}, ${u.nombre}` : u.nombre || '—'}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={u.role === 'gerente' ? styles.badgeGerente : styles.badgeEmpleado}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.btnBloquear}
                            onClick={() => handleRevocarRol(u.clerkId)}
                          >
                            Revocar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;
