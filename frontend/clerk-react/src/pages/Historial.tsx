import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Historial.module.css';

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
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
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
    <div className={styles.page}>
      {/* Navbar */}
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <button onClick={() => navigate('/home')} className={styles.btnInicio}>
            Inicio
          </button>
          <button onClick={() => navigate('/transferir')} className={styles.btnTransferir}>
            Transferir
          </button>
        </div>
        {esLaboral && (
          <div className={styles.navRight}>
            <button
              className={styles.btnVolverPanel}
              onClick={() => { setViewMode('work'); navigate(panelUrl); }}
            >
              Volver al panel
            </button>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className={styles.content}>
        <h1 className={styles.title}>Historial de transferencias</h1>

        {loading && <p className={styles.loadingText}>Cargando historial...</p>}

        {error && <div className={styles.errorBox}>{error}</div>}

        {!loading && !error && transferencias.length === 0 && (
          <p className={styles.emptyText}>No tenés transferencias registradas.</p>
        )}

        <div className={styles.list}>
          {transferencias.map((t) => (
            <div
              key={t.id}
              className={`${styles.card} ${t.tipo === 'entrante' ? styles.cardEntrante : styles.cardSaliente}`}
            >
              <div className={styles.cardTop}>
                <span className={`${styles.amount} ${t.tipo === 'entrante' ? styles.amountEntrante : styles.amountSaliente}`}>
                  {t.tipo === 'entrante' ? '+ ' : '- '}
                  $ {Number(t.importe).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
                <span className={styles.date}>
                  {new Date(t.fecha_hora).toLocaleString('es-AR')}
                </span>
              </div>
              <p className={styles.fromTo}>
                {t.tipo === 'entrante' ? `De: ${t.cbu_origen}` : `Para: ${t.cbu_destino}`}
              </p>
              <span className={`${styles.badge} ${t.estado === 'aprobada' ? styles.badgeAprobada : styles.badgeRechazada}`}>
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
