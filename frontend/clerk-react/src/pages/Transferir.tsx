import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { descargarComprobante } from '../components/descargarComprobante';
import AppLayout from '../components/AppLayout';
import styles from './Transferir.module.css';
import banListo from '../assets/banListo.png';

const API_URL = 'http://localhost:3000';

type Moneda = 'ARS' | 'USD';

interface Destinatario {
  nombre: string;
  apellido: string;
  cbu: string;
  alias?: string;
  // Solo se conoce para cuentas de 404Bank; las externas (Banco Central) no la informan.
  moneda?: Moneda;
}

interface Cuenta {
  cbu: string;
  saldo: number;
  moneda: Moneda;
}

interface Comprobante {
  importe: number;
  moneda: Moneda;
  nombre: string;
  apellido: string;
  cbu: string;
  transaccionId: string | null;
  estado: string | null;
  fecha: Date;
  // Las cuentas de 404Bank se acreditan al instante; las de otros bancos dependen del Banco Central.
  esInterna: boolean;
}

const MONEDA_NOMBRE: Record<Moneda, string> = { ARS: 'pesos', USD: 'dólares' };
const MONEDAS: Moneda[] = ['ARS', 'USD'];

// Interpreta montos escritos a la argentina: "5.000,50", "5000,5", "5000.50" o "5.000".
const parsearImporte = (texto: string): number | null => {
  const limpio = texto.replace(/\s|\$/g, '');
  if (!limpio) return null;
  let normalizado = limpio;
  if (limpio.includes(',')) {
    normalizado = limpio.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    normalizado = limpio.replace(/\./g, '');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Number(normalizado);
};

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// El backend a veces responde HTML (p. ej. un 502 del proxy): sin JSON se sigue con un objeto vacío.
const leerJson = async (res: Response): Promise<Record<string, unknown>> => {
  try {
    return await res.json();
  } catch {
    return {};
  }
};

const ERROR_CONEXION = 'No pudimos conectar con 404Bank. Revisá tu conexión e intentá de nuevo.';
const ERROR_SESION = 'Tu sesión venció. Volvé a iniciar sesión para seguir.';

// Traduce las respuestas de la búsqueda de destinatario a mensajes claros y en voseo.
const mensajeErrorBusqueda = (err: unknown): string => {
  if (err instanceof TypeError) return ERROR_CONEXION;
  if (!(err instanceof ApiError)) return 'No pudimos buscar al destinatario. Intentá de nuevo.';
  if (err.status === 401) return ERROR_SESION;
  if (err.status === 404) return 'No encontramos ninguna cuenta con ese CBU o alias. Revisá que esté bien escrito.';
  if (err.status === 400) return 'Escribí un CBU de 22 números o un alias para buscar.';
  return 'No pudimos consultar el sistema interbancario. Probá de nuevo en unos minutos.';
};

// Traduce las respuestas del envío según el código HTTP, sin prometer lo que no sabemos.
const mensajeErrorTransferencia = (err: unknown, moneda: Moneda): string => {
  if (err instanceof TypeError) return ERROR_CONEXION;
  if (!(err instanceof ApiError)) return 'No pudimos completar la transferencia. Revisá Historial antes de volver a intentar.';
  const { status, message } = err;
  if (status === 401) return ERROR_SESION;
  if (status === 422) return 'No te alcanza el saldo para esta transferencia. Revisá el monto e intentá de nuevo.';
  if (status === 400 && message.includes('Incompatibilidad de moneda')) {
    return 'La cuenta destino está en otra moneda. Elegí la misma moneda que la cuenta que recibe.';
  }
  if (status === 400 && message.includes('misma cuenta')) {
    return 'Esa es tu propia cuenta. Elegí la cuenta de otra persona.';
  }
  if (status === 400) return 'Revisá los datos de la transferencia e intentá de nuevo.';
  if (status === 404 && message.includes('cuenta activa')) {
    return `No tenés una cuenta activa en ${MONEDA_NOMBRE[moneda]} para hacer esta transferencia.`;
  }
  if (status === 404) return 'No encontramos la cuenta destino. Revisá el CBU o alias.';
  // 500/502: el Banco Central pudo haber procesado la operación, así que no afirmamos que no se movió.
  return 'No pudimos confirmar si la transferencia se hizo. Revisá Historial antes de volver a intentar.';
};

interface Contacto {
  id: number;
  cbu: string;
  alias: string | null;
  nombre: string;
  apellido: string;
}

function Transferir() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [busqueda, setBusqueda] = useState('');
  const [destinatario, setDestinatario] = useState<Destinatario | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [importe, setImporte] = useState('');
  const [moneda, setMoneda] = useState<Moneda>('ARS');
  const [enviando, setEnviando] = useState(false);
  const [comprobante, setComprobante] = useState<Comprobante | null>(null);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState(false);
  const [errorTransferencia, setErrorTransferencia] = useState('');
  const tituloExitoRef = useRef<HTMLHeadingElement>(null);
  // Cada búsqueda tiene un número: si el usuario escribe otra cosa mientras espera, la respuesta vieja se descarta.
  const busquedaIdRef = useRef(0);
  // Bloquea el doble toque antes de que React vuelva a renderizar el botón deshabilitado.
  const enviandoRef = useRef(false);

  // Lleva el foco al recibo para que teclado y lector de pantalla lleguen directo al resultado.
  useEffect(() => {
    if (comprobante) tituloExitoRef.current?.focus();
  }, [comprobante]);

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [contactosCargados, setContactosCargados] = useState(false);
  const [agendarContacto, setAgendarContacto] = useState(false);

  const [cuentas, setCuentas] = useState<Cuenta[]>([]);

  const cargarCuentas = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/mis-cuentas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setCuentas(data.cuentas || []);
    } catch {
      // Sin cuentas cargadas no se muestra el saldo; el backend igual valida al enviar.
    }
  }, [getToken]);

  useEffect(() => {
    cargarCuentas();
  }, [cargarCuentas]);

  const cuentaOrigen = cuentas.find(c => c.moneda === moneda);
  const saldoDisponible = cuentaOrigen ? Number(cuentaOrigen.saldo) : null;
  const montoNumerico = parsearImporte(importe);
  const importeInvalido = importe.trim() !== '' && montoNumerico === null;
  const sinCuentaEnMoneda = cuentas.length > 0 && !cuentaOrigen;
  const superaSaldo = montoNumerico !== null && saldoDisponible !== null && montoNumerico > saldoDisponible;
  const montoValido = montoNumerico !== null && montoNumerico > 0;
  const montoEnCero = montoNumerico === 0;
  const puedeEnviar = !!destinatario && montoValido && !superaSaldo && !sinCuentaEnMoneda && !enviando;

  const elegirDestinatario = (nuevo: Destinatario) => {
    if (cuentas.some(c => c.cbu === nuevo.cbu)) {
      setErrorBusqueda('Esa es tu propia cuenta. Elegí la cuenta de otra persona.');
      return;
    }
    setDestinatario(nuevo);
    if (nuevo.moneda) setMoneda(nuevo.moneda);
  };

  const limpiarDestinatario = () => {
    busquedaIdRef.current += 1;
    setDestinatario(null);
    setMoneda('ARS');
    setAgendarContacto(false);
    setErrorTransferencia('');
  };

  const cargarContactos = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/contactos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setContactos(data.contactos || []);
    } catch {
      // Si falla la carga de contactos, simplemente no se muestran.
    } finally {
      setContactosCargados(true);
    }
  }, [getToken]);

  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  const seleccionarContacto = (contacto: Contacto) => {
    setErrorBusqueda('');
    setComprobante(null);
    setErrorPdf(false);
    setErrorTransferencia('');
    setAgendarContacto(false);
    setBusqueda(contacto.alias || contacto.cbu);
    // El contacto pasa por la misma búsqueda: así se valida que la cuenta siga activa y se conoce su moneda.
    buscarDestinatario(contacto.cbu, contacto.alias || undefined);
  };

  const formatearImporte = (monto: number, monedaOperacion: Moneda) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: monedaOperacion,
      minimumFractionDigits: 2,
    }).format(monto);

  const buscarDestinatario = async (identificadorDirecto?: string, aliasConocido?: string) => {
    const escrito = (identificadorDirecto ?? busqueda).trim();
    if (!escrito) return;
    // Un CBU pegado con espacios o guiones ("0000003100 0123…") sigue siendo un CBU.
    const identificador = /^[\d\s-]+$/.test(escrito) ? escrito.replace(/[\s-]/g, '') : escrito;
    setErrorBusqueda('');
    setDestinatario(null);
    setComprobante(null);
    setErrorPdf(false);
    setErrorTransferencia('');
    setAgendarContacto(false);

    const esCbu = /^\d+$/.test(identificador);
    if (esCbu && identificador.length !== 22) {
      setErrorBusqueda(`El CBU tiene 22 dígitos y escribiste ${identificador.length}. Revisalo o buscá por alias.`);
      return;
    }

    const busquedaId = ++busquedaIdRef.current;
    setBuscando(true);
    try {
      const token = await getToken();
      const param = `${esCbu ? 'cbu' : 'alias'}=${encodeURIComponent(identificador)}`;
      const res = await fetch(`${API_URL}/api/transferencias/destinatario?${param}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await leerJson(res);
      if (busquedaId !== busquedaIdRef.current) return;
      if (!res.ok) throw new ApiError(res.status, String(data.error ?? ''));
      elegirDestinatario({
        nombre: String(data.nombre ?? ''),
        apellido: String(data.apellido ?? ''),
        cbu: String(data.cbu ?? identificador),
        alias: aliasConocido ?? (esCbu ? (data.alias as string | undefined) : identificador),
        moneda: data.moneda === 'ARS' || data.moneda === 'USD' ? data.moneda : undefined,
      });
    } catch (err: unknown) {
      if (busquedaId === busquedaIdRef.current) setErrorBusqueda(mensajeErrorBusqueda(err));
    } finally {
      if (busquedaId === busquedaIdRef.current) setBuscando(false);
    }
  };

  const realizarTransferencia = async () => {
    if (!destinatario || !puedeEnviar || montoNumerico === null || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setErrorTransferencia('');
    setComprobante(null);
    setErrorPdf(false);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/transferencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cbuDestino: destinatario.cbu,
          importe: montoNumerico,
          moneda,
        }),
      });
      const data = await leerJson(res);
      if (!res.ok) throw new ApiError(res.status, String(data.error ?? ''));
      setComprobante({
        importe: montoNumerico,
        moneda,
        nombre: destinatario.nombre,
        apellido: destinatario.apellido,
        cbu: destinatario.cbu,
        transaccionId: data.transaccionId ? String(data.transaccionId) : null,
        estado: data.estado ? String(data.estado) : null,
        fecha: new Date(),
        esInterna: !!destinatario.moneda,
      });
      cargarCuentas();

      if (agendarContacto) {
        try {
          const token2 = await getToken();
          await fetch(`${API_URL}/api/contactos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
            },
            body: JSON.stringify({
              cbu: destinatario.cbu,
              alias: destinatario.alias || null,
              nombre: destinatario.nombre,
              apellido: destinatario.apellido,
            }),
          });
          cargarContactos();
        } catch {
          // Si falla el guardado del contacto, la transferencia ya se realizó igual.
        }
      }

      setImporte('');
      setDestinatario(null);
      setBusqueda('');
      setAgendarContacto(false);
    } catch (err: unknown) {
      setErrorTransferencia(mensajeErrorTransferencia(err, moneda));
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <AppLayout title="Nueva transferencia" subtitle="Buscá al destinatario por CBU o alias e ingresá el monto.">

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>
            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                {comprobante ? (
                  <section className={styles.recibo} aria-labelledby="recibo-titulo">
                    <div className={styles.reciboBan}>
                      <img src={banListo} alt="" width={240} height={324} className={styles.reciboBanImg} />
                      <p className={styles.reciboBubble}>
                        {comprobante.estado && comprobante.estado !== 'aprobada'
                          ? `Tu transferencia quedó ${comprobante.estado}. Te avisamos cuando se acredite.`
                          : comprobante.esInterna
                            ? `¡Listo! Ya le llegó a ${comprobante.nombre}.`
                            : `¡Listo! Ya la enviamos a ${comprobante.nombre}.`}
                      </p>
                    </div>

                    <div className={styles.reciboBody}>
                      <span className={styles.reciboCheck} aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path className={styles.reciboCheckPath} d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                      <h2 id="recibo-titulo" ref={tituloExitoRef} tabIndex={-1} className={styles.reciboTitulo}>
                        Transferencia enviada
                      </h2>
                      <p className={styles.reciboMonto}>{formatearImporte(comprobante.importe, comprobante.moneda)}</p>
                      <p className={styles.reciboPara}>
                        a <strong>{comprobante.nombre} {comprobante.apellido}</strong>
                      </p>

                      <dl className={styles.reciboDatos}>
                        <div className={styles.reciboDato}>
                          <dt>CBU destino</dt>
                          <dd><span className={styles.cbuPill}>{comprobante.cbu}</span></dd>
                        </div>
                        <div className={styles.reciboDato}>
                          <dt>Fecha y hora</dt>
                          <dd>
                            {comprobante.fecha.toLocaleString('es-AR', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })} hs
                          </dd>
                        </div>
                        {comprobante.transaccionId && (
                          <div className={styles.reciboDato}>
                            <dt>N.º de operación</dt>
                            <dd className={styles.reciboId}>{comprobante.transaccionId}</dd>
                          </div>
                        )}
                      </dl>

                      <div className={styles.reciboAcciones}>
                        {comprobante.transaccionId ? (
                          <button
                            type="button"
                            className={styles.btnReciboPrimario}
                            disabled={descargandoPdf}
                            onClick={async () => {
                              setErrorPdf(false);
                              setDescargandoPdf(true);
                              try {
                                await descargarComprobante(comprobante.transaccionId!, await getToken());
                              } catch {
                                setErrorPdf(true);
                              } finally {
                                setDescargandoPdf(false);
                              }
                            }}
                          >
                            {descargandoPdf ? 'Generando comprobante…' : 'Descargar comprobante'}
                          </button>
                        ) : (
                          <button type="button" className={styles.btnReciboPrimario} onClick={() => navigate('/historial')}>
                            Ver en Historial
                          </button>
                        )}
                        <button
                          type="button"
                          className={styles.btnReciboSecundario}
                          onClick={() => {
                            setComprobante(null);
                            setErrorPdf(false);
                            setErrorTransferencia('');
                            // El recibo se desmonta: devolvemos el foco al primer campo del formulario.
                            requestAnimationFrame(() => document.getElementById('busqueda')?.focus());
                          }}
                        >
                          Nueva transferencia
                        </button>
                        <button type="button" className={styles.btnReciboTexto} onClick={() => navigate('/home')}>
                          Volver al inicio
                        </button>
                      </div>
                      {errorPdf && (
                        <p className={styles.reciboErrorPdf} role="alert">
                          No pudimos generar el comprobante. Probá de nuevo o descargalo desde Historial.
                        </p>
                      )}
                    </div>
                  </section>
                ) : (
                <>
                <div className={styles.formCard}>
                  <h2 className={styles.formCardTitle}>Destinatario</h2>

                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="busqueda">CBU o alias</label>
                    <div className={styles.searchRow}>
                      <input
                        id="busqueda"
                        value={busqueda}
                        onChange={e => {
                          setBusqueda(e.target.value);
                          setErrorBusqueda('');
                          // Si cambia lo escrito, el destinatario encontrado (o la búsqueda en curso) ya no corresponde.
                          if (destinatario) limpiarDestinatario();
                          else if (buscando) { busquedaIdRef.current += 1; setBuscando(false); }
                        }}
                        onKeyDown={e => e.key === 'Enter' && !buscando && buscarDestinatario()}
                        placeholder="Ej: 0000003100012345678901 o mi.alias"
                        className={styles.searchInput}
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={!!errorBusqueda}
                        aria-describedby="busqueda-ayuda"
                      />
                      <button
                        onClick={() => buscarDestinatario()}
                        disabled={buscando || !busqueda.trim()}
                        className={styles.btnBuscar}
                      >
                        {buscando ? 'Buscando…' : 'Buscar'}
                      </button>
                    </div>
                    <div id="busqueda-ayuda" aria-live="polite">
                      {errorBusqueda ? (
                        <p className={styles.errorMsg}>{errorBusqueda}</p>
                      ) : destinatario ? (
                        // La tarjeta ya lo muestra; este texto es para que el lector de pantalla lo anuncie.
                        <p className={styles.srOnly}>
                          Encontramos a {destinatario.nombre} {destinatario.apellido}
                          {destinatario.moneda ? `, cuenta en ${MONEDA_NOMBRE[destinatario.moneda]}` : ''}.
                        </p>
                      ) : (
                        <p className={styles.hint}>El CBU son 22 números. El alias son palabras separadas por puntos.</p>
                      )}
                    </div>
                  </div>

                  {destinatario && (
                    <div className={styles.destinatarioCard}>
                      <div className={styles.destinatarioAvatar}>
                        {`${destinatario.nombre.charAt(0)}${destinatario.apellido.charAt(0)}`.toUpperCase()}
                      </div>
                      <div className={styles.destinatarioInfo}>
                        <span className={styles.destinatarioNombre}>
                          {destinatario.nombre} {destinatario.apellido}
                        </span>
                        <span className={styles.destinatarioCbu}>
                          CBU {destinatario.cbu}
                          {destinatario.moneda && ` · Cuenta en ${MONEDA_NOMBRE[destinatario.moneda]}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className={styles.btnCambiar}
                        onClick={() => { limpiarDestinatario(); setBusqueda(''); document.getElementById('busqueda')?.focus(); }}
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  {destinatario && !contactos.some(c => c.cbu === destinatario.cbu) && (
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={agendarContacto}
                        onChange={e => setAgendarContacto(e.target.checked)}
                      />
                      Agendar este CBU/alias como contacto
                    </label>
                  )}
                </div>

                {destinatario && (
                  <div className={styles.formCard}>
                    <h2 className={styles.formCardTitle}>Importe</h2>
                    <div className={styles.inputGroup}>
                      <span className={styles.label} id="moneda-label">Enviar en</span>
                      <div
                        className={styles.currencyToggle}
                        role="radiogroup"
                        aria-labelledby="moneda-label"
                        onKeyDown={e => {
                          // Patrón de radiogroup: las flechas cambian la opción y mueven el foco.
                          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
                          e.preventDefault();
                          const habilitadas = MONEDAS.filter(m => !destinatario.moneda || destinatario.moneda === m);
                          const paso = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
                          const siguiente = habilitadas[(habilitadas.indexOf(moneda) + paso + habilitadas.length) % habilitadas.length];
                          setMoneda(siguiente);
                          e.currentTarget.querySelector<HTMLButtonElement>(`[data-moneda="${siguiente}"]`)?.focus();
                        }}
                      >
                        {MONEDAS.map(opcion => {
                          const bloqueada = !!destinatario.moneda && destinatario.moneda !== opcion;
                          return (
                            <button
                              key={opcion}
                              type="button"
                              role="radio"
                              data-moneda={opcion}
                              aria-checked={moneda === opcion}
                              tabIndex={moneda === opcion ? 0 : -1}
                              disabled={bloqueada}
                              onClick={() => setMoneda(opcion)}
                              className={`${styles.currencyOption} ${moneda === opcion ? styles.currencyOptionActive : ''}`}
                            >
                              {opcion === 'ARS' ? 'Pesos (ARS)' : 'Dólares (USD)'}
                            </button>
                          );
                        })}
                      </div>
                      {destinatario.moneda && (
                        <p className={styles.hint}>
                          Esta cuenta recibe solo {MONEDA_NOMBRE[destinatario.moneda]}, por eso la moneda quedó fija.
                        </p>
                      )}
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="importe">
                        Monto a transferir
                      </label>
                      <div className={styles.amountField}>
                        <span className={styles.amountPrefix} aria-hidden="true">{moneda === 'USD' ? 'US$' : '$'}</span>
                        <input
                          id="importe"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={importe}
                          onChange={e => setImporte(e.target.value.replace(/[^\d.,]/g, ''))}
                          placeholder="0,00"
                          className={`${styles.input} ${styles.amountInput}`}
                          aria-invalid={importeInvalido || superaSaldo || sinCuentaEnMoneda}
                          aria-describedby="importe-estado"
                        />
                      </div>
                      <div id="importe-estado" aria-live="polite">
                        {sinCuentaEnMoneda ? (
                          <p className={styles.errorMsg}>
                            No tenés una cuenta en {MONEDA_NOMBRE[moneda]}. Podés abrirla desde Cuentas.
                          </p>
                        ) : montoEnCero ? (
                          <p className={styles.errorMsg}>Ingresá un monto mayor a $ 0.</p>
                        ) : importeInvalido ? (
                          <p className={styles.errorMsg}>Escribí el monto con números, por ejemplo 5.000,50.</p>
                        ) : superaSaldo && saldoDisponible !== null ? (
                          <p className={styles.errorMsg}>
                            Supera tu saldo disponible de {formatearImporte(saldoDisponible, moneda)}.
                          </p>
                        ) : saldoDisponible !== null ? (
                          <p className={styles.hint}>
                            Disponible: <strong className={styles.hintAmount}>{formatearImporte(saldoDisponible, moneda)}</strong>
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {destinatario && montoNumerico !== null && montoNumerico > 0 && (
                  <div className={styles.summaryCard}>
                    <h2 className={styles.formCardTitle}>Resumen de la operación</h2>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Destinatario</span>
                      <span className={styles.summaryValue}>
                        {destinatario.nombre} {destinatario.apellido}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>CBU</span>
                      <span className={styles.cbuPill}>{destinatario.cbu}</span>
                    </div>
                    {cuentaOrigen && (
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Desde</span>
                        <span className={styles.summaryValue}>Tu cuenta en {MONEDA_NOMBRE[moneda]}</span>
                      </div>
                    )}
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Monto a transferir</span>
                      <span className={styles.summaryAmount}>{formatearImporte(montoNumerico, moneda)}</span>
                    </div>
                    {saldoDisponible !== null && !superaSaldo && (
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Te quedan</span>
                        <span className={styles.summaryValue}>
                          {formatearImporte(saldoDisponible - montoNumerico, moneda)}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={realizarTransferencia}
                      disabled={!puedeEnviar}
                      className={styles.btnTransferir}
                    >
                      {enviando
                        ? 'Enviando…'
                        : `Enviar ${formatearImporte(montoNumerico, moneda)} a ${destinatario.nombre} ${destinatario.apellido}`}
                    </button>
                  </div>
                )}

                <div aria-live="polite">
                  {errorTransferencia && <p className={styles.errorMsg}>{errorTransferencia}</p>}
                </div>
                </>
                )}
              </div>

              <aside
                className={`${styles.contactsSidebar} ${
                  // En celular los contactos van arriba como fichas; se ocultan si no hay o durante el recibo.
                  comprobante || (contactosCargados && contactos.length === 0) ? styles.contactsOcultosMovil : ''
                }`}
              >
                <h2 className={styles.contactsSidebarTitle}>Contactos guardados</h2>
                {!contactosCargados ? (
                  <p className={styles.contactsSidebarEmpty}>Cargando contactos…</p>
                ) : contactos.length === 0 ? (
                  <p className={styles.contactsSidebarEmpty}>
                    Todavía no agendaste contactos. Al confirmar una transferencia vas a poder guardarlos acá.
                  </p>
                ) : (
                  <div className={styles.contactsSidebarList}>
                    {contactos.map(contacto => (
                      <button
                        key={contacto.id}
                        type="button"
                        onClick={() => seleccionarContacto(contacto)}
                        className={styles.contactoRow}
                      >
                        <span className={styles.contactoRowAvatar}>
                          {`${contacto.nombre.charAt(0)}${contacto.apellido.charAt(0)}`.toUpperCase()}
                        </span>
                        <span className={styles.contactoRowInfo}>
                          <span className={styles.contactoRowNombre}>
                            {contacto.nombre} {contacto.apellido}
                          </span>
                          <span className={styles.contactoRowDato}>{contacto.alias || contacto.cbu}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </AppLayout>
  );
}

export default Transferir;
