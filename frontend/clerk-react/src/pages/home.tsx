import { useState, useEffect} from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate()

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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f7fb',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Barra superior */}
      <div
        style={{
          backgroundColor: '#1f3b73',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>
            404Bank
          </span>
          <button
            onClick={() => navigate('/transferir')}
            style={{
              backgroundColor: '#ffffff',
              color: '#1f3b73',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Transferir
          </button>
          <button
            onClick={() => navigate('/historial')}
            style={{
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: '1px solid #ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Historial
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#cbd5e1', fontSize: '14px' }}>
            {user?.firstName} {user?.lastName}
          </span>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button
              style={{
                backgroundColor: 'transparent',
                color: '#ffffff',
                border: '1px solid #ffffff',
                padding: '6px 14px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Cerrar sesión
            </button>
          </SignOutButton>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#1f3b73', marginBottom: '4px', fontSize: '22px' }}>
          Bienvenido, {user?.firstName}
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '32px' }}>
          Este es el resumen de tus cuentas en 404Bank.
        </p>

        {loading && (
          <p style={{ color: '#6b7280' }}>Cargando tus cuentas...</p>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && cuentas.length === 0 && (
          <p style={{ color: '#6b7280' }}>No tenés cuentas activas.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cuentas.map((cuenta, index) => (
            <div
              key={index}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px 28px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
                borderLeft: '4px solid #1f3b73',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Saldo disponible
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 700, color: '#111827' }}>
                  $ {Number(cuenta.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div
                style={{
                  borderTop: '1px solid #f3f4f6',
                  paddingTop: '12px',
                }}
              >
                <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
                  CBU: <span style={{ fontFamily: 'monospace', color: '#374151', letterSpacing: '0.05em' }}>{cuenta.cbu}</span>
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
