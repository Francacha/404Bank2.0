import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import styles from './Transferir.module.css';

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
    <div className={styles.page}>
      {/* Navbar */}
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <button onClick={() => navigate('/home')} className={styles.btnInicio}>
            Inicio
          </button>
          <button onClick={() => navigate('/historial')} className={styles.btnHistorial}>
            Historial
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        <h1 className={styles.title}>Nueva transferencia</h1>

        {/* Buscar destinatario */}
        <div className={styles.searchSection}>
          <label className={styles.searchLabel}>CBU o alias del destinatario</label>
          <div className={styles.searchRow}>
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Ej: 12345678... o mi.alias"
              className={styles.searchInput}
            />
            <button
              onClick={buscarDestinatario}
              disabled={buscando}
              className={styles.btnBuscar}
            >
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
          {errorBusqueda && <p className={styles.searchError}>{errorBusqueda}</p>}
        </div>

        {/* Destinatario encontrado */}
        {destinatario && (
          <div className={styles.destinatarioCard}>
            <p className={styles.destinatarioNombre}>{destinatario.nombre} {destinatario.apellido}</p>
            <p className={styles.destinatarioCbu}>CBU: {destinatario.cbu}</p>
          </div>
        )}

        {/* Importe */}
        {destinatario && (
          <div className={styles.importeSection}>
            <label className={styles.importeLabel}>Importe</label>
            <input
              type="number"
              value={importe}
              onChange={e => setImporte(e.target.value)}
              placeholder="0.00"
              min="0.01"
              className={styles.importeInput}
            />
          </div>
        )}

        {/* Botón transferir */}
        {destinatario && (
          <button
            onClick={realizarTransferencia}
            disabled={enviando || !importe}
            className={styles.btnTransferir}
          >
            {enviando ? 'Procesando...' : 'Confirmar transferencia'}
          </button>
        )}

        {/* Resultado */}
        {resultado && <div className={styles.successBox}>{resultado}</div>}
        {errorTransferencia && <div className={styles.errorBox}>{errorTransferencia}</div>}
      </div>
    </div>
  );
}

export default Transferir;
