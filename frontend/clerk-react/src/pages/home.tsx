import { useState, useEffect } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
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
    <div className={styles.page}>
      {/* Barra superior */}
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <button onClick={() => navigate('/transferir')} className={styles.btnTransferir}>
            Transferir
          </button>
          <button onClick={() => navigate('/historial')} className={styles.btnHistorial}>
            Historial
          </button>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userName}>
            {user?.firstName} {user?.lastName}
          </span>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        <h1 className={styles.title}>Bienvenido, {user?.firstName}</h1>
        <p className={styles.subtitle}>Este es el resumen de tus cuentas en 404Bank.</p>

        {loading && <p className={styles.loadingText}>Cargando tus cuentas...</p>}

        {error && <div className={styles.errorBox}>{error}</div>}

        {!loading && !error && cuentas.length === 0 && (
          <p className={styles.emptyText}>No tenés cuentas activas.</p>
        )}

        <div className={styles.accountsList}>
          {cuentas.map((cuenta, index) => (
            <div key={index} className={styles.accountCard}>
              <div className={styles.balanceSection}>
                <p className={styles.balanceLabel}>Saldo disponible</p>
                <p className={styles.balanceValue}>
                  $ {Number(cuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={styles.cbuSection}>
                <p className={styles.cbuLabel}>
                  CBU: <span className={styles.cbuValue}>{cuenta.cbu}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Home;
