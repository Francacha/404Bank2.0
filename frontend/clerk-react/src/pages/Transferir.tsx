import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

interface Destinatario {
  nombre: string;
  apellido: string;
  cbu: string;
}

function Transferir() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [destinatario, setDestinatario] = useState<Destinatario | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [importe, setImporte] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState('');
  const [errorTransferencia, setErrorTransferencia] = useState('');

    const buscarDestinatario = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusqueda('');
    setDestinatario(null);
    setResultado('');
    setErrorTransferencia('');

    try {
      const token = await getToken();
      const esCbu = /^\d+$/.test(busqueda.trim());
      const param = esCbu ? `cbu=${busqueda.trim()}` : `alias=${busqueda.trim()}`;
      const res = await fetch(`${API_URL}/api/transferencias/buscar?${param}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No encontrado');
      setDestinatario({ nombre: data.nombre, apellido: data.apellido, cbu: data.cbu });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorBusqueda(err.message);
      else setErrorBusqueda('Error al buscar destinatario');
    } finally {
      setBuscando(false);
    }
  };

  const realizarTransferencia = async () => {
    if (!destinatario || !importe || Number(importe) <= 0) return;
    setEnviando(true);
    setErrorTransferencia('');
    setResultado('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/transferencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ cbuDestino: destinatario.cbu, importe: Number(importe) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al transferir');
      setResultado(`Transferencia de $${Number(importe).toLocaleString('es-AR')} realizada con éxito.`);
      setImporte('');
      setDestinatario(null);
      setBusqueda('');
    } catch (err: unknown) {
      if (err instanceof Error) setErrorTransferencia(err.message);
      else setErrorTransferencia('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f7fb', fontFamily: 'Arial, sans-serif' }}>
      {/* Navbar */}
      <div style={{ backgroundColor: '#1f3b73', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700 }}>404Bank</span>
          <button onClick={() => navigate('/')} style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1px solid #ffffff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Inicio
          </button>
          <button onClick={() => navigate('/historial')} style={{ backgroundColor: 'transparent', color: '#ffffff', border: '1px solid #ffffff', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
            Historial
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '40px 32px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ color: '#1f3b73', fontSize: '22px', marginBottom: '32px' }}>Nueva transferencia</h1>

        {/* Buscar destinatario */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>CBU o alias del destinatario</label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ej: 12345678... o mi.alias"
              style={{ flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
            />
            <button
              onClick={buscarDestinatario}
              disabled={buscando}
              style={{ backgroundColor: '#1f3b73', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
          {errorBusqueda && <p style={{ color: '#991b1b', fontSize: '13px', marginTop: '6px' }}>{errorBusqueda}</p>}
        </div>

        {/* Destinatario encontrado */}
        {destinatario && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', borderLeft: '4px solid #1f3b73', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#374151', fontWeight: 600 }}>{destinatario.nombre} {destinatario.apellido}</p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>CBU: {destinatario.cbu}</p>
          </div>
        )}

        {/* Importe */}
        {destinatario && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>Importe</label>
            <input
              type="number"
              value={importe}
              onChange={e => setImporte(e.target.value)}
              placeholder="0.00"
              min="0.01"
              style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Botón transferir */}
        {destinatario && (
          <button
            onClick={realizarTransferencia}
            disabled={enviando || !importe}
            style={{ width: '100%', backgroundColor: '#1f3b73', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}
          >
            {enviando ? 'Procesando...' : 'Confirmar transferencia'}
          </button>
        )}

        {/* Resultado */}
        {resultado && (
          <div style={{ marginTop: '20px', backgroundColor: '#d1fae5', color: '#065f46', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
            {resultado}
          </div>
        )}
        {errorTransferencia && (
          <div style={{ marginTop: '20px', backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', fontSize: '14px' }}>
            {errorTransferencia}
          </div>
        )}
      </div>
    </div>
  );
}

export default Transferir;
