import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import layout from './Transferir.module.css';
import styles from './Inversiones.module.css';
import SeccionFrascos from './Frascos';

const API_URL = 'http://localhost:3000';

interface Cuenta {
  cbu: string;
  saldo: number;
  moneda: 'ARS' | 'USD';
}

interface Cotizacion {
  compra: number;
  venta: number;
  fechaActualizacion?: string;
}

const formatear = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

function Inversiones() {
  const { getToken } = useAuth();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [montoUSD, setMontoUSD] = useState('');
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [abriendoCuenta, setAbriendoCuenta] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cuentaARS = cuentas.find(cuenta => cuenta.moneda === 'ARS');
  const cuentaUSD = cuentas.find(cuenta => cuenta.moneda === 'USD');
  const montoNumerico = Number(montoUSD);
  const totalARS = useMemo(
    () => (cotizacion && montoNumerico > 0 ? montoNumerico * Number(cotizacion.venta) : 0),
    [cotizacion, montoNumerico],
  );

  const cargarDatos = useCallback(async () => {
    const token = await getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const [cuentasRes, cotizacionRes] = await Promise.all([
      fetch(`${API_URL}/api/cuentas/mis-cuentas`, { headers }),
      fetch(`${API_URL}/api/divisas/cotizacion`, { headers }),
    ]);
    const cuentasData = await cuentasRes.json();
    const cotizacionData = await cotizacionRes.json();

    if (!cuentasRes.ok) throw new Error(cuentasData.error || 'No se pudieron cargar tus cuentas.');
    if (!cotizacionRes.ok) throw new Error(cotizacionData.error || 'No se pudo obtener la cotización del dólar.');

    setCuentas(cuentasData.cuentas || []);
    setCotizacion(cotizacionData.cotizacion);
  }, [getToken]);

  useEffect(() => {
    const iniciar = async () => {
      try {
        await cargarDatos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error al cargar Inversiones.');
      } finally {
        setCargando(false);
      }
    };
    iniciar();
  }, [cargarDatos]);

  const abrirCuentaUSD = async () => {
    setAbriendoCuenta(true);
    setError('');
    setExito('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/caja-ahorro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ moneda: 'USD' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la cuenta en dólares.');
      await cargarDatos();
      setExito(data.mensaje || 'Tu cuenta en dólares fue creada correctamente. Ya podés comprar dólares.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la cuenta en dólares.');
    } finally {
      setAbriendoCuenta(false);
    }
  };

  const comprarDolares = async () => {
    if (!cuentaARS || !cuentaUSD || montoNumerico <= 0) return;
    setComprando(true);
    setError('');
    setExito('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/divisas/operar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tipoOperacion: 'COMPRA', montoUSD: montoNumerico }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la compra.');
      setExito(`Compraste ${formatear(data.operacion.montoUSD, 'USD')} por ${formatear(Number(data.operacion.montoARS), 'ARS')}.`);
      setMontoUSD('');
      await cargarDatos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra.');
    } finally {
      setComprando(false);
    }
  };

  return (
    <AppLayout title="Compra de dólares" subtitle="Convertí pesos de tu cuenta en dólares al tipo de cambio oficial vigente.">

        <div className={layout.pageContent}>
          <div className={`${layout.pageWrapper} ${styles.pageWrapper}`}>

            {error && <p className={layout.errorMsg}>{error}</p>}
            {exito && <p className={layout.successMsg}>{exito}</p>}

            <section className={`${layout.formCard} ${styles.summaryCard}`}>
              <h3 className={layout.formCardTitle}>Cotización y saldos</h3>
              {cargando ? <p className={styles.muted}>Cargando información...</p> : <div className={styles.summaryGrid}>
                <div><span className={styles.metricLabel}>Dólar vendedor</span><strong>{cotizacion ? formatear(Number(cotizacion.venta), 'ARS') : 'No disponible'}</strong></div>
                <div><span className={styles.metricLabel}>Saldo en pesos</span><strong>{cuentaARS ? formatear(Number(cuentaARS.saldo), 'ARS') : 'Sin cuenta ARS'}</strong></div>
                <div><span className={styles.metricLabel}>Saldo en dólares</span><strong>{cuentaUSD ? formatear(Number(cuentaUSD.saldo), 'USD') : 'Sin cuenta USD'}</strong></div>
              </div>}
            </section>

            {!cargando && !cuentaUSD ? (
              <section className={layout.formCard}>
                <h3 className={layout.formCardTitle}>Necesitás una cuenta en dólares</h3>
                <p className={styles.muted}>Abrila sin salir de esta pantalla para poder acreditar allí tus dólares.</p>
                <button className={layout.btnTransferir} onClick={abrirCuentaUSD} disabled={abriendoCuenta}>{abriendoCuenta ? 'Abriendo cuenta...' : 'Abrir cuenta en dólares'}</button>
              </section>
            ) : !cargando && (
              <section className={layout.formCard}>
                <h3 className={layout.formCardTitle}>¿Cuántos dólares querés comprar?</h3>
                <div className={layout.inputGroup}>
                  <label className={layout.label} htmlFor="monto-usd">Monto en USD</label>
                  <input id="monto-usd" className={layout.input} type="number" min="0.01" step="0.01" inputMode="decimal" value={montoUSD} onChange={event => setMontoUSD(event.target.value)} placeholder="Ej.: 100" />
                </div>
                <div className={styles.estimate}><span>Vas a debitar aproximadamente</span><strong>{formatear(totalARS, 'ARS')}</strong><small>La cotización final la confirma el servidor al operar.</small></div>
                <button className={layout.btnTransferir} onClick={comprarDolares} disabled={comprando || !cuentaARS || montoNumerico <= 0 || totalARS > Number(cuentaARS.saldo)}>{comprando ? 'Comprando...' : 'Comprar dólares'}</button>
                {cuentaARS && totalARS > Number(cuentaARS.saldo) && <p className={layout.errorMsg}>No contás con saldo suficiente en pesos para esta compra.</p>}
              </section>
            )}

            <SeccionFrascos onSaldoCambiado={() => { cargarDatos().catch(() => {}); }} />
          </div>
        </div>
      </AppLayout>
  );
}

export default Inversiones;
