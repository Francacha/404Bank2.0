import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import styles from './Comprobantes.module.css';

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
  moneda: 'ARS' | 'USD';
  nombre_contraparte: string | null;
}

const formatearImporte = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

const IconReceipt = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg>
);
const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
);

function Comprobantes() {
  const { getToken } = useAuth();

  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [descargandoId, setDescargandoId] = useState<number | null>(null);
  const [errorDescarga, setErrorDescarga] = useState('');

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar los comprobantes');
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

  const descargarComprobante = async (t: Transferencia) => {
    setErrorDescarga('');
    setDescargandoId(t.id);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/comprobantes/${t.transaccion_central_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'No se pudo generar el comprobante');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${t.transaccion_central_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorDescarga(err.message);
      else setErrorDescarga('No se pudo descargar el comprobante');
    } finally {
      setDescargandoId(null);
    }
  };

  return (
    <AppLayout title="Comprobantes" subtitle="Descargá el comprobante en PDF de cualquiera de tus transferencias.">

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>
            {loading && <p className={styles.loadingText}>Cargando comprobantes...</p>}
            {error && <div className={styles.errorBox}>{error}</div>}
            {errorDescarga && <div className={styles.errorBox}>{errorDescarga}</div>}

            {!loading && !error && transferencias.length === 0 && (
              <p className={styles.emptyText}>Todavía no tenés transferencias para generar comprobantes.</p>
            )}

            <div className={styles.list}>
              {transferencias.map((t) => (
                <div key={t.id} className={styles.card}>
                  <span className={styles.cardIconWrap}>
                    <IconReceipt />
                  </span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>
                      {t.tipo === 'entrante' ? 'De: ' : 'Para: '}
                      {t.nombre_contraparte || (
                        <span className={styles.cardTitleCbu}>{t.tipo === 'entrante' ? t.cbu_origen : t.cbu_destino}</span>
                      )}
                    </span>
                    <span className={styles.cardDate}>
                      {new Date(t.fecha_hora).toLocaleString('es-AR')} · {formatearImporte(Number(t.importe), t.moneda)}
                    </span>
                  </div>
                  <button
                    className={styles.btnDescargar}
                    onClick={() => descargarComprobante(t)}
                    disabled={descargandoId === t.id}
                  >
                    <IconDownload />
                    {descargandoId === t.id ? 'Generando...' : 'Descargar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
  );
}

export default Comprobantes;
