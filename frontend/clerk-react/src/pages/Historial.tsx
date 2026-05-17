import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

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

function Historial() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

    useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar el historial');
        setTransferencias(data.transferencias);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargarHistorial();
  }, [getToken]);
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fb', fontFamily: 'Arial, sans-serif' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#1f3b73', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>404Bank</span>
          <button onClick={() => navigate('/')} style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1px solid #ffffff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Inicio
          </button>
          <button onClick={() => navigate('/transferir')} style={{ backgroundColor: '#ffffff', color: '#1f3b73', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            Transferir
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#1f3b73', fontSize: '22px', marginBottom: '32px' }}>Historial de transferencias</h1>

        {loading && <p style={{ color: '#6b7280' }}>Cargando historial...</p>}

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {!loading && !error && transferencias.length === 0 && (
          <p style={{ color: '#6b7280' }}>No tenés transferencias registradas.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {transferencias.map((t) => (
            <div
              key={t.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                borderLeft: `4px solid ${t.tipo === 'entrante' ? '#059669' : '#1f3b73'}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: t.tipo === 'entrante' ? '#059669' : '#1f3b73' }}>
                  {t.tipo === 'entrante' ? '+ ' : '- '}
                  $ {Number(t.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {new Date(t.fecha_hora).toLocaleString('es-AR')}
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6b7280' }}>
                {t.tipo === 'entrante' ? `De: ${t.cbu_origen}` : `Para: ${t.cbu_destino}`}
              </p>
              <span style={{
                display: 'inline-block',
                marginTop: '6px',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: t.estado === 'aprobada' ? '#d1fae5' : '#fee2e2',
                color: t.estado === 'aprobada' ? '#065f46' : '#991b1b',
              }}>
                {t.estado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Historial;
