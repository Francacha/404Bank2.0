import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import layout from './Transferir.module.css';
import styles from './Inversiones.module.css';

const API_URL = 'http://localhost:3000';

interface Frasco {
  id: number;
  nombre: string;
  monto: number;
  tna: number;
  plazo_dias: number;
  monto_final: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'cobrado';
  fecha_cobro: string | null;
  dias_transcurridos: number;
  valor_actual: number;
  ganancia_actual: number;
}

interface Plazo {
  dias: number;
  tna: number;
  tea: number;
  monto_final: number | null;
  ganancia: number | null;
}

const pesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(valor);

const fecha = (valor: string) =>
  new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

// Frascos de ahorro: el cliente aparta pesos por un plazo, el dinero queda bloqueado
// y crece con interés compuesto diario hasta que vence y vuelve a su cuenta.
function SeccionFrascos({ onSaldoCambiado }: { onSaldoCambiado: () => void }) {
  const { getToken } = useAuth();
  const [frascos, setFrascos] = useState<Frasco[]>([]);
  const [plazos, setPlazos] = useState<Plazo[]>([]);
  const [montoMinimo, setMontoMinimo] = useState(1000);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [plazoDias, setPlazoDias] = useState(30);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargarFrascos = useCallback(async () => {
    const token = await getToken();
    const res = await fetch(`${API_URL}/api/frascos`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudieron cargar tus frascos.');
    setFrascos(data.frascos);
  }, [getToken]);

  // Se recargan cada 30 segundos para ver crecer los intereses y acreditar los que vencen
  useEffect(() => {
    const recargar = () => cargarFrascos().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar tus frascos.');
    });
    recargar();
    const intervalo = setInterval(recargar, 30000);
    return () => clearInterval(intervalo);
  }, [cargarFrascos]);

  // Simulación de lo que ganaría en cada plazo mientras escribe el monto
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/frascos/simular?monto=${Number(monto) || 0}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        setPlazos(data.plazos);
        setMontoMinimo(data.monto_minimo);
      } catch {
        // Sin simulación el formulario sigue funcionando
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [monto, getToken]);

  const plazoElegido = plazos.find(p => p.dias === plazoDias);
  const activos = frascos.filter(f => f.estado === 'activo');
  const totalAhorrado = activos.reduce((acc, f) => acc + Number(f.monto), 0);
  const totalActual = activos.reduce((acc, f) => acc + f.valor_actual, 0);

  const crearFrasco = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    setError('');
    setExito('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frascos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nombre, monto: Number(monto), plazo_dias: plazoDias }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo crear el frasco.');
      setExito(`Guardaste ${pesos(Number(data.frasco.monto))} en "${data.frasco.nombre}". Vas a recibir ${pesos(Number(data.frasco.monto_final))} el ${fecha(data.frasco.fecha_fin)}.`);
      setNombre('');
      setMonto('');
      await cargarFrascos();
      onSaldoCambiado();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el frasco.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <>
      <div className={layout.pageHeader}>
        <h2 className={layout.pageTitle}>Frascos de ahorro</h2>
        <p className={layout.pageSubtitle}>
          Separá pesos por un plazo y ganá intereses todos los días. El dinero queda reservado hasta que el frasco vence
          y ese día vuelve solo a tu cuenta con lo ganado.
        </p>
      </div>

      {error && <p className={layout.errorMsg}>{error}</p>}
      {exito && <p className={layout.successMsg}>{exito}</p>}

      {activos.length > 0 && (
        <section className={`${layout.formCard} ${styles.summaryCard}`}>
          <h3 className={layout.formCardTitle}>Tus ahorros</h3>
          <div className={styles.summaryGrid}>
            <div><span className={styles.metricLabel}>Ahorrado</span><strong>{pesos(totalAhorrado)}</strong></div>
            <div><span className={styles.metricLabel}>Valor hoy</span><strong>{pesos(totalActual)}</strong></div>
            <div><span className={styles.metricLabel}>Ganado hasta hoy</span><strong className={styles.ganancia}>+{pesos(totalActual - totalAhorrado)}</strong></div>
          </div>
        </section>
      )}

      <section className={layout.formCard}>
        <h3 className={layout.formCardTitle}>Nuevo frasco</h3>
        <form onSubmit={crearFrasco} className={styles.frascoForm}>
          <div className={layout.inputGroup}>
            <label className={layout.label} htmlFor="frasco-nombre">Nombre</label>
            <input id="frasco-nombre" className={layout.input} maxLength={40} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Vacaciones" required />
          </div>
          <div className={layout.inputGroup}>
            <label className={layout.label} htmlFor="frasco-monto">Monto a guardar ($)</label>
            <input id="frasco-monto" className={layout.input} type="number" min={montoMinimo} step="0.01" value={monto} onChange={e => setMonto(e.target.value)} placeholder={`Mínimo ${pesos(montoMinimo)}`} required />
          </div>
          <div className={layout.inputGroup}>
            <label className={layout.label} htmlFor="frasco-plazo">Plazo</label>
            <select id="frasco-plazo" className={layout.input} value={plazoDias} onChange={e => setPlazoDias(Number(e.target.value))}>
              {plazos.map(p => (
                <option key={p.dias} value={p.dias}>{p.dias} días · TNA {p.tna}%</option>
              ))}
            </select>
          </div>
          {plazoElegido?.monto_final != null && (
            <div className={styles.estimate}>
              <span>Al vencer vas a recibir</span>
              <strong>{pesos(plazoElegido.monto_final)}</strong>
              <small>
                Ganancia de {pesos(plazoElegido.ganancia ?? 0)} · TNA {plazoElegido.tna}% · TEA {plazoElegido.tea.toLocaleString('es-AR')}%.
                No vas a poder retirar el dinero antes de que venza.
              </small>
            </div>
          )}
          <button className={layout.btnTransferir} type="submit" disabled={creando || !nombre.trim() || Number(monto) < montoMinimo}>
            {creando ? 'Guardando...' : 'Guardar en el frasco'}
          </button>
        </form>
      </section>

      {frascos.length > 0 && (
        <section className={layout.formCard}>
          <h3 className={layout.formCardTitle}>Mis frascos</h3>
          <div className={styles.frascoLista}>
            {frascos.map(f => (
              <div key={f.id} className={`${styles.frascoCard} ${f.estado === 'cobrado' ? styles.frascoCobrado : ''}`}>
                <div className={styles.frascoFila}>
                  <strong>{f.estado === 'activo' ? '🔒 ' : '✅ '}{f.nombre}</strong>
                  <strong>{pesos(f.valor_actual)}</strong>
                </div>
                <div className={styles.frascoFila}>
                  <span>{pesos(Number(f.monto))} a {f.plazo_dias} días · TNA {Number(f.tna)}%</span>
                  <span className={styles.ganancia}>+{pesos(f.ganancia_actual)}</span>
                </div>
                {f.estado === 'activo' ? (
                  <>
                    <div className={styles.progreso}>
                      <div className={styles.progresoBarra} style={{ width: `${Math.min(100, (f.dias_transcurridos / f.plazo_dias) * 100)}%` }} />
                    </div>
                    <span className={styles.frascoDetalle}>
                      Día {f.dias_transcurridos} de {f.plazo_dias} · Disponible el {fecha(f.fecha_fin)} con {pesos(Number(f.monto_final))}
                    </span>
                  </>
                ) : (
                  <span className={styles.frascoDetalle}>Acreditado en tu cuenta el {fecha(f.fecha_cobro ?? f.fecha_fin)}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default SeccionFrascos;
