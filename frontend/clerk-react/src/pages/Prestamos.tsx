import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import AppLayout from '../components/AppLayout';
import styles from './Prestamos.module.css';

const API_URL = 'http://localhost:3000';

const CUOTAS_POR_DEFECTO = [1, 3, 6, 12, 24, 36];
const MONTO_MAXIMO_POR_DEFECTO = 5000000;

interface Cuota {
  id: number;
  numero_cuota: number;
  monto: number;
  capital: number | null;
  interes: number;
  iva: number;
  punitorios: number;
  fecha_vencimiento: string;
  estado: 'pendiente' | 'vencida' | 'pagada';
  fecha_pago: string | null;
}

interface Prestamo {
  id: number;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  cant_cuotas: number | null;
  tna: number;
  monto_total: number | null;
  motivo_rechazo?: string | null;
  cuotas: Cuota[];
}

interface Mora {
  en_mora: boolean;
  deuda: number;
  punitorios: number;
}

interface OpcionSimulada {
  cant_cuotas: number;
  monto_cuota: number;
  monto_total: number;
  recargo_porcentaje: number;
  tea: number;
  cftea: number;
}

interface Simulacion {
  tna: number;
  iva_intereses: number;
  recargo_punitorio: number;
  monto_maximo: number;
  cuotas_permitidas: number[];
  opciones: OpcionSimulada[];
}

interface SituacionCrediticia {
  dni: string;
  situacion: number;
  deudas: unknown[];
}

const pesos = (valor: number) =>
  `$ ${Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const porcentaje = (valor: number) => `${Number(valor).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

const SITUACION_INFO: Record<number, { etiqueta: string; icono: string; claseColor: string }> = {
  1: { etiqueta: 'Normal', icono: '🟢', claseColor: 'situacion1' },
  2: { etiqueta: 'Riesgo bajo', icono: '🟡', claseColor: 'situacion2' },
  3: { etiqueta: 'Riesgo medio', icono: '🟠', claseColor: 'situacion3' },
  4: { etiqueta: 'Riesgo alto', icono: '🔴', claseColor: 'situacion4' },
  5: { etiqueta: 'Irrecuperable', icono: '⚫', claseColor: 'situacion5' },
};

const IconAlert = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01" /><path d="m10.3 3.9-8 14A1.5 1.5 0 0 0 3.6 20h16.8a1.5 1.5 0 0 0 1.3-2.1l-8-14a1.5 1.5 0 0 0-2.6 0Z" /></svg>
);

function Prestamos() {
  const { getToken } = useAuth();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [cantCuotas, setCantCuotas] = useState<number>(1);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [mora, setMora] = useState<Mora | null>(null);
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null);
  // Monto para el que se calculó la simulación: si no coincide con lo escrito, los números están desactualizados.
  const [montoSimulado, setMontoSimulado] = useState<number | null>(null);
  const [revisando, setRevisando] = useState(false);
  const simulacionIdRef = useRef(0);
  const resultadoRef = useRef<HTMLDivElement>(null);

  const [situacionCrediticia, setSituacionCrediticia] = useState<SituacionCrediticia | null>(null);
  const [loadingSituacion, setLoadingSituacion] = useState(true);
  const [errorSituacion, setErrorSituacion] = useState('');
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const cargarPrestamos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/mis-prestamos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar préstamos');
      setPrestamos(data.prestamos);
      setMora(data.mora ?? null);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarPrestamos();
  }, [cargarPrestamos]);

  const montoNumero = Number(monto) || 0;
  const montoMaximo = simulacion?.monto_maximo ?? MONTO_MAXIMO_POR_DEFECTO;
  const superaMaximo = montoNumero > montoMaximo;

  // Simula el préstamo mientras el cliente escribe el monto (con una pequeña espera entre teclas).
  // Cada simulación tiene un número: si llega una respuesta vieja, se descarta.
  useEffect(() => {
    setRevisando(false);
    const simulacionId = ++simulacionIdRef.current;
    const timeout = setTimeout(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/prestamos/simular?monto=${montoNumero}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (simulacionId !== simulacionIdRef.current) return;
        setSimulacion(data);
        setMontoSimulado(montoNumero);
      } catch {
        if (simulacionId === simulacionIdRef.current) setMontoSimulado(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [montoNumero, getToken]);

  const opcionesCuotas = simulacion?.cuotas_permitidas ?? CUOTAS_POR_DEFECTO;
  const simulacionAlDia = montoSimulado === montoNumero && montoNumero > 0;
  const opcionElegida = simulacionAlDia ? simulacion?.opciones.find(o => o.cant_cuotas === cantCuotas) : undefined;
  const calculando = montoNumero > 0 && !superaMaximo && !simulacionAlDia;
  // Tasa anual que se cobra sobre la deuda atrasada: la TNA más el recargo punitorio.
  const tnaPunitoria = simulacion ? simulacion.tna * (1 + simulacion.recargo_punitorio / 100) : null;

  useEffect(() => {
    const cargarSituacion = async () => {
      setLoadingSituacion(true);
      setErrorSituacion('');
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/prestamos/mi-situacion-crediticia`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo consultar la situación crediticia');
        setSituacionCrediticia(data.situacion_crediticia);
      } catch (err: unknown) {
        if (err instanceof Error) setErrorSituacion(err.message);
        else setErrorSituacion('Error inesperado');
      } finally {
        setLoadingSituacion(false);
      }
    };
    cargarSituacion();
  }, [getToken]);

  const situacionBloquea = !!situacionCrediticia && situacionCrediticia.situacion > 2;
  const bloqueado = !!mora?.en_mora || situacionBloquea;

  // El primer paso solo muestra el resumen; la deuda se pide recién al confirmar.
  const revisarSolicitud = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opcionElegida || bloqueado || superaMaximo) return;
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setRevisando(true);
    requestAnimationFrame(() => resultadoRef.current?.focus());
  };

  const confirmarSolicitud = async () => {
    if (!opcionElegida) return;
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ monto: Number(monto), cant_cuotas: cantCuotas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No pudimos enviar tu solicitud. Probá de nuevo.');
      setMensajeSolicitud(
        `Listo, enviaste tu solicitud de ${pesos(montoNumero)} en ${cantCuotas === 1 ? 'un pago' : `${cantCuotas} cuotas`}. ` +
        'La vas a ver en "Mis solicitudes" mientras se revisa.'
      );
      setRevisando(false);
      setMonto('');
      setCantCuotas(1);
      cargarPrestamos();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorSolicitud(err.message);
      else setErrorSolicitud('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  const badgeClass = (estado: string) => {
    if (estado === 'aprobado' || estado === 'finalizado') return styles.badgeAprobado;
    if (estado === 'rechazado') return styles.badgeRechazado;
    if (estado === 'pre_aprobado') return styles.badgePreAprobado;
    return styles.badgePendiente;
  };

  const badgeCuotaClass = (estado: Cuota['estado']) => {
    if (estado === 'pagada') return styles.badgeCuotaPagada;
    if (estado === 'vencida') return styles.badgeCuotaVencida;
    return styles.badgeCuotaPendiente;
  };

  const toggleExpandido = (id: number) => {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout title="Solicitá un préstamo" subtitle="Completá el formulario y seguí el estado de tus solicitudes.">

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>

            {!loadingSituacion && !errorSituacion && situacionCrediticia && (
              <div className={`${styles.situacionCard} ${styles[SITUACION_INFO[situacionCrediticia.situacion]?.claseColor ?? 'situacion1']}`}>
                <span className={styles.situacionIcono}>
                  {SITUACION_INFO[situacionCrediticia.situacion]?.icono ?? '⚪'}
                </span>
                <div className={styles.situacionTexto}>
                  <span className={styles.situacionTitulo}>
                    Tu situación crediticia: {SITUACION_INFO[situacionCrediticia.situacion]?.etiqueta ?? 'Desconocida'}
                  </span>
                  <span className={styles.situacionSubtitulo}>
                    {situacionCrediticia.deudas.length === 0
                      ? 'Sin deudas registradas en el BCRA'
                      : `${situacionCrediticia.deudas.length} deuda(s) registrada(s) en el BCRA`}
                  </span>
                </div>
              </div>
            )}
            {!loadingSituacion && errorSituacion && (
              <p className={styles.errorMsg}>{errorSituacion}</p>
            )}

            {mora?.en_mora && (
              <div className={`${styles.situacionCard} ${styles.situacion4}`}>
                <span className={styles.situacionIconoAlerta}><IconAlert /></span>
                <div className={styles.situacionTexto}>
                  <span className={styles.situacionTitulo}>
                    Tenés cuotas impagas: debés {pesos(mora.deuda)}
                  </span>
                  <span className={styles.situacionSubtitulo}>
                    La deuda está en el saldo negativo de tu cuenta y se descuenta sola cuando ingresa dinero.
                    {mora.punitorios > 0 && ` Incluye ${pesos(mora.punitorios)} de intereses punitorios, que siguen aumentando mientras no la canceles.`}
                    {' '}Hasta regularizarla no podés pedir préstamos ni tarjetas.
                  </span>
                </div>
              </div>
            )}

            {situacionBloquea && !mora?.en_mora && (
              <div className={`${styles.situacionCard} ${styles.situacion4}`} role="alert">
                <span className={styles.situacionIconoAlerta}><IconAlert /></span>
                <div className={styles.situacionTexto}>
                  <span className={styles.situacionTitulo}>Por ahora no podés pedir un préstamo</span>
                  <span className={styles.situacionSubtitulo}>
                    Tu situación crediticia es {SITUACION_INFO[situacionCrediticia!.situacion]?.etiqueta.toLowerCase()}.
                    Solo se otorgan préstamos con situación normal o de riesgo bajo.
                  </span>
                </div>
              </div>
            )}

            <div className={styles.formCard}>
              <h2 className={styles.formCardTitle}>Nueva solicitud</h2>
              <form onSubmit={revisarSolicitud} className={styles.form}>
                <fieldset disabled={bloqueado || enviando} className={styles.fieldset}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="monto-prestamo">¿Cuánto necesitás?</label>
                    <div className={styles.montoField}>
                      <span className={styles.montoPrefijo} aria-hidden="true">$</span>
                      <input
                        id="monto-prestamo"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={monto ? Number(monto).toLocaleString('es-AR') : ''}
                        onChange={e => setMonto(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="500.000"
                        className={`${styles.input} ${styles.montoInput}`}
                        aria-invalid={superaMaximo}
                        aria-describedby="monto-ayuda"
                        required
                      />
                    </div>
                    <p id="monto-ayuda" className={superaMaximo ? styles.errorMsg : styles.ayuda}>
                      {superaMaximo
                        ? `El monto máximo es ${pesos(montoMaximo)}.`
                        : `Podés pedir hasta ${pesos(montoMaximo)}.`}
                    </p>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="cuotas-prestamo">Cantidad de cuotas</label>
                    <select
                      id="cuotas-prestamo"
                      value={cantCuotas}
                      onChange={e => { setCantCuotas(Number(e.target.value)); setRevisando(false); }}
                      className={styles.input}
                    >
                      {opcionesCuotas.map(opcion => (
                        <option key={opcion} value={opcion}>
                          {opcion === 1 ? 'Pago único (1 cuota)' : `${opcion} cuotas`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div aria-live="polite">
                    {calculando && <p className={styles.ayuda}>Calculando cuánto vas a pagar…</p>}
                    {opcionElegida && (
                      <div className={styles.simulacion}>
                        <span className={styles.simulacionEtiqueta}>Vas a devolver en total</span>
                        <span className={styles.simulacionTotal}>{pesos(opcionElegida.monto_total)}</span>
                        <span className={styles.simulacionCuota}>
                          {cantCuotas === 1
                            ? 'En un pago único'
                            : <>{cantCuotas} cuotas fijas de <strong>{pesos(opcionElegida.monto_cuota)}</strong></>}
                          {' · '}
                          {pesos(opcionElegida.monto_total - montoNumero)} de intereses e IVA (+{porcentaje(opcionElegida.recargo_porcentaje)})
                        </span>

                        <dl className={styles.tasas}>
                          <div className={styles.tasaPrincipal}>
                            <dt>CFTEA</dt>
                            <dd>{porcentaje(opcionElegida.cftea)}</dd>
                            <span className={styles.tasaAyuda}>Costo total anual, con intereses e IVA. Es el número para comparar préstamos.</span>
                          </div>
                          <div className={styles.tasa}>
                            <dt>TNA</dt>
                            <dd>{porcentaje(simulacion!.tna)}</dd>
                          </div>
                          <div className={styles.tasa}>
                            <dt>TEA</dt>
                            <dd>{porcentaje(opcionElegida.tea)}</dd>
                          </div>
                        </dl>
                        <p className={styles.simulacionTasas}>
                          Sistema francés: la cuota es fija y el interés se calcula sobre lo que te queda por pagar.
                          {cantCuotas > 1 && ' La última cuota puede variar unos centavos por redondeo.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {!revisando && (
                    <button
                      type="submit"
                      disabled={!opcionElegida || superaMaximo || bloqueado}
                      className={styles.btnSolicitar}
                    >
                      Revisar solicitud
                    </button>
                  )}
                </fieldset>
              </form>

              {revisando && opcionElegida && (
                <div className={styles.revision} ref={resultadoRef} tabIndex={-1} role="region" aria-label="Revisá tu solicitud">
                  <h3 className={styles.revisionTitulo}>Antes de confirmar</h3>
                  <ul className={styles.revisionLista}>
                    <li>
                      Recibís <strong>{pesos(montoNumero)}</strong> en tu cuenta en pesos cuando la solicitud se apruebe.
                    </li>
                    <li>
                      Devolvés <strong>{pesos(opcionElegida.monto_total)}</strong>
                      {cantCuotas === 1 ? ' en un pago único' : <> en {cantCuotas} cuotas de <strong>{pesos(opcionElegida.monto_cuota)}</strong></>},
                      {' '}que se debitan solas de tu cuenta cada mes.
                    </li>
                    {tnaPunitoria !== null && (
                      <li>
                        Si una cuota no se puede cobrar, la deuda atrasada suma intereses punitorios del{' '}
                        <strong>{porcentaje(tnaPunitoria)} anual</strong> hasta que la pagues.
                      </li>
                    )}
                    <li>Primero la revisa un empleado y después la aprueba un gerente.</li>
                  </ul>
                  <div className={styles.revisionAcciones}>
                    <button type="button" className={styles.btnConfirmar} onClick={confirmarSolicitud} disabled={enviando}>
                      {enviando ? 'Enviando…' : 'Confirmar solicitud'}
                    </button>
                    <button type="button" className={styles.btnVolver} onClick={() => setRevisando(false)} disabled={enviando}>
                      Volver y cambiar
                    </button>
                  </div>
                </div>
              )}

              <div aria-live="polite">
                {mensajeSolicitud && <p className={styles.successMsg} role="status">{mensajeSolicitud}</p>}
              </div>
              {errorSolicitud && <p className={styles.errorMsg} role="alert">{errorSolicitud}</p>}
            </div>

            <div className={styles.listSection}>
              <h3 className={styles.listTitle}>Mis solicitudes</h3>
              {loading && <p className={styles.loadingText}>Cargando...</p>}
              {error && <p className={styles.errorMsg}>{error}</p>}
              {!loading && !error && prestamos.length === 0 && (
                <p className={styles.emptyText}>No tenés solicitudes de préstamos todavía.</p>
              )}
              <div className={styles.lista}>
                {prestamos.map(p => {
                  const tieneCuotas = (p.estado === 'aprobado' || p.estado === 'finalizado') && p.cuotas?.length > 0;
                  const abierto = expandidos.has(p.id);
                  return (
                    <div key={p.id} className={styles.prestamoCard}>
                      <button
                        type="button"
                        className={`${styles.prestamoCardHeader} ${tieneCuotas ? styles.clickable : ''}`}
                        onClick={() => tieneCuotas && toggleExpandido(p.id)}
                      >
                        <div className={styles.prestamoInfo}>
                          <span className={styles.prestamoMonto}>
                            $ {Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                          </span>
                          <span className={styles.prestamoFecha}>
                            Solicitado: {new Date(p.fecha_solicitud).toLocaleDateString('es-AR')}
                          </span>
                          {p.cant_cuotas && (
                            <span className={styles.prestamoFecha}>
                              {p.cant_cuotas === 1 ? 'Pago único' : `${p.cant_cuotas} cuotas`}
                              {Number(p.tna) > 0 && ` · TNA ${Number(p.tna)}%`}
                            </span>
                          )}
                          {p.monto_total && Number(p.monto_total) !== Number(p.monto) && (
                            <span className={styles.prestamoFecha}>
                              Total a devolver: {pesos(p.monto_total)}
                            </span>
                          )}
                          {p.fecha_resolucion && (
                            <span className={styles.prestamoFecha}>
                              Resuelto: {new Date(p.fecha_resolucion).toLocaleDateString('es-AR')}
                            </span>
                          )}
                          {p.estado === 'rechazado' && p.motivo_rechazo && (
                            <span className={styles.prestamoMotivo}>Motivo: {p.motivo_rechazo}</span>
                          )}
                        </div>
                        <div className={styles.prestamoHeaderRight}>
                          <span className={badgeClass(p.estado)}>{p.estado.replace('_', ' ')}</span>
                          {tieneCuotas && (
                            <span className={`${styles.cuotasToggleIcon} ${abierto ? styles.open : ''}`}>▾</span>
                          )}
                        </div>
                      </button>

                      {tieneCuotas && abierto && (
                        <div className={styles.cuotasList}>
                          <p className={styles.cuotasListTitle}>Plan de cuotas</p>
                          {p.cuotas.map(c => (
                            <div key={c.id} className={styles.cuotaRow}>
                              <div className={styles.cuotaInfo}>
                                <span className={styles.cuotaNumero}>Cuota {c.numero_cuota}</span>
                                <span className={styles.cuotaVencimiento}>
                                  Vence: {new Date(c.fecha_vencimiento).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                                {Number(c.interes) > 0 && (
                                  <span className={styles.cuotaDetalle}>
                                    Capital {pesos(Number(c.capital))} · Interés {pesos(c.interes)} · IVA {pesos(c.iva)}
                                  </span>
                                )}
                                {Number(c.punitorios) > 0 && (
                                  <span className={`${styles.cuotaDetalle} ${styles.cuotaPunitorios}`}>
                                    + {pesos(c.punitorios)} de intereses punitorios
                                  </span>
                                )}
                              </div>
                              <span className={styles.cuotaMonto}>
                                {/* En mora lo que se debe es la cuota más los punitorios acumulados. */}
                                {pesos(c.estado === 'vencida' ? Number(c.monto) + Number(c.punitorios || 0) : Number(c.monto))}
                              </span>
                              <span className={badgeCuotaClass(c.estado)}>
                                {c.estado === 'vencida' ? 'en mora' : c.estado}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
  );
}

export default Prestamos;
