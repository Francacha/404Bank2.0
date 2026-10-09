import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/react';
import AppLayout from '../components/AppLayout';
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
  moneda: 'ARS' | 'USD';
  nombre_contraparte: string | null;
}

const formatearImporte = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

const IconSend = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13" /><path d="m13 6 6 6-6 6" /></svg>
);
const IconArrowUp = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></svg>
);

function Historial() {
  const { getToken } = useAuth();

  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState<'TODAS' | 'ARS' | 'USD'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | '7D' | '30D'>('TODAS');

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

  const transferenciasFiltradas = useMemo(() => {
    const ahora = Date.now();
    const limiteMs = filtroFecha === '7D' ? 7 * 24 * 60 * 60 * 1000
      : filtroFecha === '30D' ? 30 * 24 * 60 * 60 * 1000
      : null;

    return transferencias.filter(t => {
      if (filtroMoneda !== 'TODAS' && t.moneda !== filtroMoneda) return false;
      if (limiteMs !== null && ahora - new Date(t.fecha_hora).getTime() > limiteMs) return false;
      return true;
    });
  }, [transferencias, filtroMoneda, filtroFecha]);

  return (
    <AppLayout title="Historial" subtitle="Todas tus transferencias, entrantes y salientes.">

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>
            {loading && <p className={styles.loadingText}>Cargando historial...</p>}

            {error && <div className={styles.errorBox}>{error}</div>}

            {!loading && !error && transferencias.length > 0 && (
              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  {(['TODAS', 'ARS', 'USD'] as const).map(opcion => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setFiltroMoneda(opcion)}
                      className={`${styles.filterButton} ${filtroMoneda === opcion ? styles.filterButtonActive : ''}`}
                    >
                      {opcion === 'TODAS' ? 'Todas' : opcion}
                    </button>
                  ))}
                </div>
                <div className={styles.filterGroup}>
                  {([
                    { valor: 'TODAS', etiqueta: 'Todo' },
                    { valor: '7D', etiqueta: 'Últimos 7 días' },
                    { valor: '30D', etiqueta: 'Últimos 30 días' },
                  ] as const).map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setFiltroFecha(valor)}
                      className={`${styles.filterButton} ${filtroFecha === valor ? styles.filterButtonActive : ''}`}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && transferencias.length === 0 && (
              <p className={styles.emptyText}>No tenés transferencias registradas.</p>
            )}

            {!loading && !error && transferencias.length > 0 && transferenciasFiltradas.length === 0 && (
              <p className={styles.emptyText}>No hay transferencias que coincidan con los filtros elegidos.</p>
            )}

            <div className={styles.list}>
              {transferenciasFiltradas.map((t) => (
                <div key={t.id} className={styles.card}>
                  <span className={`${styles.cardIconWrap} ${t.tipo === 'entrante' ? styles.cardIconEntrante : styles.cardIconSaliente}`}>
                    {t.tipo === 'entrante' ? <IconArrowUp /> : <IconSend />}
                  </span>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardTitle}>
                      {t.tipo === 'entrante' ? 'De: ' : 'Para: '}
                      {t.nombre_contraparte || (
                        <span className={styles.cardTitleCbu}>{t.tipo === 'entrante' ? t.cbu_origen : t.cbu_destino}</span>
                      )}
                    </span>
                    <span className={styles.cardDate}>
                      {new Date(t.fecha_hora).toLocaleString('es-AR')}
                    </span>
                    <div className={styles.badgeRow}>
                      <span className={`${styles.badge} ${t.estado === 'aprobada' ? styles.badgeAprobada : styles.badgeRechazada}`}>
                        {t.estado}
                      </span>
                      <span className={`${styles.badge} ${t.moneda === 'USD' ? styles.badgeUsd : styles.badgeArs}`}>
                        {t.moneda}
                      </span>
                    </div>
                  </div>
                  <span className={`${styles.amount} ${t.tipo === 'entrante' ? styles.amountEntrante : styles.amountSaliente}`}>
                    {t.tipo === 'entrante' ? '+ ' : '− '}
                    {formatearImporte(Number(t.importe), t.moneda)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
  );
}

export default Historial;
