import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { parsearMonto } from '../components/parsearMonto';
import styles from './Inversiones.module.css';
import SeccionFrascos, { type ResumenFrascos } from './Frascos';

const API_URL = 'http://localhost:3000';
const REFRESCO_COTIZACION_MS = 60_000;
const MINIMO_USD = 1;

interface Cuenta {
  cbu: string;
  saldo: number | string;
  moneda: 'ARS' | 'USD';
}

interface Cotizacion {
  compra: number;
  venta: number;
  fechaActualizacion?: string;
}

interface Recibo {
  montoUSD: number;
  montoARS: number;
  tasaCambio: number;
  saldoUSDActual: number;
  saldoARSActual: number;
  transaccionId: string;
  fechaHora: string;
}

type Pestania = 'dolares' | 'frascos';
type Paso = 'monto' | 'revision' | 'recibo';

const formatear = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda, minimumFractionDigits: 2 }).format(monto);

const hora = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : null;

const redondear = (valor: number) => Math.round(valor * 100) / 100;

function Inversiones() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const pestania: Pestania = searchParams.get('tab') === 'frascos' ? 'frascos' : 'dolares';

  // Cuentas y cotización se cargan por separado: si la API del dólar se cae, tus cuentas igual se ven.
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [estadoCuentas, setEstadoCuentas] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [estadoCotizacion, setEstadoCotizacion] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [resumenFrascos, setResumenFrascos] = useState<ResumenFrascos | null>(null);

  const [paso, setPaso] = useState<Paso>('monto');
  const [montoTexto, setMontoTexto] = useState('');
  const [tocado, setTocado] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [errorCompra, setErrorCompra] = useState('');
  const [avisoCotizacion, setAvisoCotizacion] = useState('');
  const [recibo, setRecibo] = useState<Recibo | null>(null);

  const [abriendoCuenta, setAbriendoCuenta] = useState(false);
  const [errorCuenta, setErrorCuenta] = useState('');

  const tituloPasoRef = useRef<HTMLHeadingElement>(null);

  const cuentaARS = cuentas.find(c => c.moneda === 'ARS');
  const cuentaUSD = cuentas.find(c => c.moneda === 'USD');
  const saldoARS = Number(cuentaARS?.saldo ?? 0);

  const montoUSD = parsearMonto(montoTexto);
  const montoValido = Number.isFinite(montoUSD) && montoUSD >= MINIMO_USD;
  const precio = cotizacion ? Number(cotizacion.venta) : null;
  const totalARS = precio && montoValido ? redondear(montoUSD * precio) : 0;
  const alcanza = totalARS <= saldoARS;

  const errorMonto = !tocado || !montoTexto
    ? ''
    : !Number.isFinite(montoUSD)
      ? 'Escribí el monto con números, por ejemplo 150 o 150,50.'
      : montoUSD < MINIMO_USD
        ? `El mínimo es ${formatear(MINIMO_USD, 'USD')}.`
        : precio && !alcanza
          ? `No te alcanza: necesitás ${formatear(totalARS, 'ARS')} y tenés ${formatear(saldoARS, 'ARS')}.`
          : '';

  const cargarCuentas = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/mis-cuentas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setCuentas(data.cuentas || []);
      setEstadoCuentas('ok');
    } catch {
      setEstadoCuentas('error');
    }
  }, [getToken]);

  const cargarCotizacion = useCallback(async (): Promise<Cotizacion | null> => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/divisas/cotizacion`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.cotizacion) throw new Error();
      setCotizacion(data.cotizacion);
      setEstadoCotizacion('ok');
      return data.cotizacion;
    } catch {
      setEstadoCotizacion('error');
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  // La cotización se refresca sola cada minuto mientras estás eligiendo el monto.
  useEffect(() => {
    cargarCotizacion();
    if (paso !== 'monto') return;
    const intervalo = window.setInterval(cargarCotizacion, REFRESCO_COTIZACION_MS);
    return () => window.clearInterval(intervalo);
  }, [cargarCotizacion, paso]);

  useEffect(() => {
    if (paso !== 'monto') tituloPasoRef.current?.focus();
  }, [paso]);

  const cambiarPestania = (p: Pestania) => {
    setSearchParams(p === 'frascos' ? { tab: 'frascos' } : {}, { replace: true });
  };

  const abrirCuentaUSD = async () => {
    setAbriendoCuenta(true);
    setErrorCuenta('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/caja-ahorro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ moneda: 'USD' }),
      });
      if (!res.ok && res.status !== 409) throw new Error();
      await cargarCuentas();
    } catch {
      setErrorCuenta('No pudimos abrir tu cuenta en dólares. Probá de nuevo en un momento.');
    } finally {
      setAbriendoCuenta(false);
    }
  };

  // Antes de revisar se trae la cotización del momento: lo que ves en la revisión es lo que se cobra.
  const irARevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setErrorCompra('');
    setAvisoCotizacion('');
    if (!montoValido) return;
    const actual = await cargarCotizacion();
    if (!actual) {
      setErrorCompra('No pudimos consultar la cotización. Probá de nuevo en un momento.');
      return;
    }
    if (redondear(montoUSD * Number(actual.venta)) > saldoARS) {
      setErrorCompra(`Con la cotización actual no te alcanza: tenés ${formatear(saldoARS, 'ARS')}.`);
      return;
    }
    setPaso('revision');
  };

  const confirmarCompra = async () => {
    if (!precio) return;
    setComprando(true);
    setErrorCompra('');
    setAvisoCotizacion('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/divisas/operar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tipoOperacion: 'COMPRA', montoUSD: redondear(montoUSD), cotizacionAceptada: precio }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.cotizacion) {
        // Cambió el precio: mostramos el nuevo total y pedimos confirmar de nuevo.
        setCotizacion(data.cotizacion);
        setAvisoCotizacion(data.error);
        return;
      }
      if (!res.ok) {
        throw new Error(res.status === 422 || res.status === 400 ? data?.error : '');
      }
      setRecibo(data.operacion);
      setPaso('recibo');
      setMontoTexto('');
      setTocado(false);
      cargarCuentas();
    } catch (err) {
      setErrorCompra(
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos completar la compra. No se movió plata; probá de nuevo.'
      );
    } finally {
      setComprando(false);
    }
  };

  const nuevaCompra = () => {
    setRecibo(null);
    setPaso('monto');
    requestAnimationFrame(() => document.getElementById('monto-usd')?.focus());
  };

  const horaCotizacion = hora(cotizacion?.fechaActualizacion);

  return (
    <AppLayout title="Inversiones" subtitle="Comprá dólares al oficial y hacé crecer tus pesos en frascos.">
      <div className={styles.wrapper}>
        <section className={styles.resumen} aria-label="Tus saldos">
          <div className={styles.saldo}>
            <span className={styles.saldoEtiqueta}>En pesos</span>
            <strong className={styles.saldoValor}>
              {estadoCuentas === 'cargando' ? '…' : cuentaARS ? formatear(saldoARS, 'ARS') : '—'}
            </strong>
          </div>
          <div className={styles.saldo}>
            <span className={styles.saldoEtiqueta}>En dólares</span>
            <strong className={styles.saldoValor}>
              {estadoCuentas === 'cargando' ? '…' : cuentaUSD ? formatear(Number(cuentaUSD.saldo), 'USD') : 'Sin cuenta'}
            </strong>
          </div>
          <div className={styles.saldo}>
            <span className={styles.saldoEtiqueta}>En frascos</span>
            <strong className={styles.saldoValor}>{resumenFrascos ? formatear(resumenFrascos.valorHoy, 'ARS') : '…'}</strong>
            {resumenFrascos && resumenFrascos.ganado > 0 && (
              <span className={styles.saldoGanancia}>+ {formatear(resumenFrascos.ganado, 'ARS')} ganados</span>
            )}
          </div>
        </section>
        {estadoCuentas === 'error' && (
          <div className={styles.aviso} role="alert">
            <p>No pudimos cargar tus cuentas.</p>
            <button type="button" className={styles.btnSecundario} onClick={cargarCuentas}>Reintentar</button>
          </div>
        )}

        <div className={styles.pestanias} role="tablist" aria-label="Inversiones">
          {([
            { id: 'dolares', etiqueta: 'Dólares' },
            { id: 'frascos', etiqueta: 'Frascos de ahorro' },
          ] as const).map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={pestania === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={pestania === t.id ? 0 : -1}
              className={styles.pestania}
              onClick={() => cambiarPestania(t.id)}
              onKeyDown={e => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  const otra = t.id === 'dolares' ? 'frascos' : 'dolares';
                  cambiarPestania(otra);
                  requestAnimationFrame(() => document.getElementById(`tab-${otra}`)?.focus());
                }
              }}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        <div id="panel-dolares" role="tabpanel" aria-labelledby="tab-dolares" hidden={pestania !== 'dolares'} className={styles.panel}>
          <section className={styles.cotizacion} aria-labelledby="titulo-cotizacion">
            <div className={styles.cotizacionCabecera}>
              <h2 id="titulo-cotizacion" className={styles.tituloSeccion}>Dólar oficial</h2>
              {estadoCotizacion === 'ok' && horaCotizacion && (
                <span className={styles.cotizacionHora}>Actualizada {horaCotizacion} h</span>
              )}
            </div>
            {estadoCotizacion === 'error' && !cotizacion ? (
              <div className={styles.aviso} role="alert">
                <p>No pudimos consultar la cotización. Mientras tanto no se puede comprar.</p>
                <button type="button" className={styles.btnSecundario} onClick={() => cargarCotizacion()}>Reintentar</button>
              </div>
            ) : (
              <dl className={styles.precios}>
                <div className={styles.precioPrincipal}>
                  <dt>Comprás a</dt>
                  <dd>{cotizacion ? formatear(Number(cotizacion.venta), 'ARS') : '…'}</dd>
                </div>
                <div className={styles.precioSecundario}>
                  <dt>Vendés a</dt>
                  <dd>{cotizacion ? formatear(Number(cotizacion.compra), 'ARS') : '…'}</dd>
                </div>
              </dl>
            )}
          </section>

          {estadoCuentas === 'ok' && !cuentaUSD && (
            <section className={styles.tarjeta} aria-labelledby="titulo-abrir">
              <h2 id="titulo-abrir" className={styles.tituloSeccion}>Abrí tu cuenta en dólares</h2>
              <p className={styles.texto}>Es gratis y queda lista al instante. Ahí se acreditan los dólares que compres.</p>
              <button type="button" className={styles.btnPrincipal} onClick={abrirCuentaUSD} disabled={abriendoCuenta}>
                {abriendoCuenta ? 'Abriendo tu cuenta…' : 'Abrir cuenta en dólares'}
              </button>
              {errorCuenta && <p className={styles.errorLinea} role="alert">{errorCuenta}</p>}
            </section>
          )}

          {estadoCuentas === 'ok' && cuentaUSD && cuentaARS && paso === 'monto' && (
            <section className={styles.tarjeta} aria-labelledby="titulo-compra">
              <h2 id="titulo-compra" className={styles.tituloSeccion}>Comprar dólares</h2>
              <form onSubmit={irARevision} className={styles.form} noValidate>
                <div className={styles.campo}>
                  <label htmlFor="monto-usd" className={styles.label}>¿Cuántos dólares querés?</label>
                  <div className={styles.inputMonto}>
                    <span className={styles.prefijo} aria-hidden="true">US$</span>
                    <input
                      id="monto-usd"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className={styles.input}
                      placeholder="100"
                      value={montoTexto}
                      onChange={e => setMontoTexto(e.target.value)}
                      onBlur={() => setTocado(true)}
                      aria-invalid={!!errorMonto}
                      aria-describedby={errorMonto ? 'monto-usd-error' : 'monto-usd-ayuda'}
                    />
                  </div>
                  {errorMonto ? (
                    <p id="monto-usd-error" className={styles.errorLinea}>{errorMonto}</p>
                  ) : (
                    <p id="monto-usd-ayuda" className={styles.ayuda}>Tenés {formatear(saldoARS, 'ARS')} en pesos.</p>
                  )}
                </div>

                <div className={styles.estimado} aria-live="polite">
                  <span>Pagás</span>
                  <strong>{formatear(totalARS, 'ARS')}</strong>
                  {montoValido && precio && alcanza && (
                    <small>Te quedan {formatear(redondear(saldoARS - totalARS), 'ARS')} en pesos.</small>
                  )}
                </div>

                <button
                  type="submit"
                  className={styles.btnPrincipal}
                  disabled={!precio || (tocado && !!errorMonto)}
                >
                  Revisar compra
                </button>
                {errorCompra && <p className={styles.errorLinea} role="alert">{errorCompra}</p>}
              </form>
            </section>
          )}

          {paso === 'revision' && precio && (
            <section className={styles.tarjeta} aria-labelledby="titulo-revision">
              <h2 id="titulo-revision" ref={tituloPasoRef} tabIndex={-1} className={styles.tituloSeccion}>Revisá tu compra</h2>
              <dl className={styles.detalle}>
                <div><dt>Recibís</dt><dd className={styles.cifraGrande}>{formatear(redondear(montoUSD), 'USD')}</dd></div>
                <div><dt>Pagás</dt><dd className={styles.cifra}>{formatear(totalARS, 'ARS')}</dd></div>
                <div>
                  <dt>Cotización</dt>
                  <dd className={styles.cifra}>{formatear(precio, 'ARS')}{horaCotizacion && <span className={styles.ayudaInline}> · {horaCotizacion} h</span>}</dd>
                </div>
                <div><dt>Te quedan en pesos</dt><dd className={styles.cifra}>{formatear(redondear(saldoARS - totalARS), 'ARS')}</dd></div>
              </dl>
              {avisoCotizacion && <p className={styles.avisoCambio} role="alert">{avisoCotizacion}</p>}
              {!alcanza && <p className={styles.errorLinea} role="alert">Con este precio no te alcanza el saldo en pesos.</p>}
              <div className={styles.acciones}>
                <button type="button" className={styles.btnPrincipal} onClick={confirmarCompra} disabled={comprando || !alcanza}>
                  {comprando ? 'Comprando…' : `Confirmar compra de ${formatear(redondear(montoUSD), 'USD')}`}
                </button>
                <button type="button" className={styles.btnSecundario} onClick={() => { setPaso('monto'); setAvisoCotizacion(''); }} disabled={comprando}>
                  Cambiar monto
                </button>
              </div>
              {errorCompra && <p className={styles.errorLinea} role="alert">{errorCompra}</p>}
            </section>
          )}

          {paso === 'recibo' && recibo && (
            <section className={styles.recibo} aria-labelledby="titulo-recibo">
              <span className={styles.reciboCheck} aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </span>
              <h2 id="titulo-recibo" ref={tituloPasoRef} tabIndex={-1} className={styles.tituloRecibo}>Compraste dólares</h2>
              <p className={styles.reciboMonto}>{formatear(recibo.montoUSD, 'USD')}</p>
              <dl className={styles.detalle}>
                <div><dt>Pagaste</dt><dd className={styles.cifra}>{formatear(recibo.montoARS, 'ARS')}</dd></div>
                <div><dt>Cotización</dt><dd className={styles.cifra}>{formatear(recibo.tasaCambio, 'ARS')}</dd></div>
                <div><dt>Ahora tenés en dólares</dt><dd className={styles.cifra}>{formatear(recibo.saldoUSDActual, 'USD')}</dd></div>
                <div><dt>N.º de operación</dt><dd className={styles.operacion}>{recibo.transaccionId}</dd></div>
              </dl>
              <div className={styles.acciones}>
                <button type="button" className={styles.btnSecundario} onClick={() => navigate(`/historial?op=${encodeURIComponent(`${recibo.transaccionId}-entrada`)}`)}>
                  Ver en Historial
                </button>
                <button type="button" className={styles.btnSecundario} onClick={nuevaCompra}>Hacer otra compra</button>
              </div>
            </section>
          )}
        </div>

        <div id="panel-frascos" role="tabpanel" aria-labelledby="tab-frascos" hidden={pestania !== 'frascos'} className={styles.panel}>
          <SeccionFrascos
            saldoARS={cuentaARS ? saldoARS : null}
            onSaldoCambiado={cargarCuentas}
            onResumen={setResumenFrascos}
          />
        </div>
      </div>
    </AppLayout>
  );
}

export default Inversiones;
