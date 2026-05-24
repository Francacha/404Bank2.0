import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import styles from './Admin.module.css';

const API_URL = 'http://localhost:3000';

interface Usuario {
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

type Tab = 'usuarios' | 'transferencias';

function Admin() {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [tab, setTab] = useState<Tab>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        } else {
          const data = await fetchConToken(`${API_URL}/api/admin/transferencias`);
          setTransferencias(data.transferencias);
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
        </div>

        {loading && <p className={styles.loadingText}>Cargando...</p>}
        {error && <div className={styles.errorBox}>{error}</div>}

        {/* Tab: Usuarios */}
        {!loading && !error && tab === 'usuarios' && (
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
                {usuarios.map(u => (
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
      </div>
    </div>
  );
}

export default Admin;
