import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/react';
import { parsearMonto } from '../components/parsearMonto';
import styles from './Inversiones.module.css';

const API_URL = 'http://localhost:3000';

interface Frasco {
  id: number;
  nombre: string;
  monto: number | string;
  tna: number | string;
  plazo_dias: number;
  monto_final: number | string;
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

export interface ResumenFrascos {
  valorHoy: number;
  ganado: number;
}

interface Props {
  saldoARS: number | null;
  onSaldoCambiado: () => void;
  onResumen: (resumen: ResumenFrascos) => void;
}

const pesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 }).format(valor);

const fechaLarga = (valor: string | Date) =>
  new Date(valor).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

const porcentaje = (valor: number) => `${valor.toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`;

// Fecha estimada de vencimiento para la revisión (el backend fija la real al crear el frasco).
const vencimientoEstimado = (dias: number) => new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

// Frascos de ahorro: el cliente aparta pesos por un plazo, el dinero queda bloqueado
// y crece con interés compuesto diario hasta que vence y vuelve solo a su cuenta.
function SeccionFrascos({ saldoARS, onSaldoCambiado, onResumen }: Props) {
  const { getToken } = useAuth();
  const [frascos, setFrascos] = useState<Frasco[]>([]);
  const [estadoLista, setEstadoLista] = useState<'cargando' | 'ok' | 'error'>('cargando');
  const [plazos, setPlazos] = useState<Plazo[]>([]);
  const [errorPlazos, setErrorPlazos] = useState(false);
  const [montoMinimo, setMontoMinimo] = useState(1000);

  const [nombre, setNombre] = useState('');
  const [montoTexto, setMontoTexto] = useState('');
  const [plazoDias, setPlazoDias] = useState(30);
  const [tocado, setTocado] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');
  const [creado, setCreado] = useState<Frasco | null>(null);

  const cobradosRef = useRef<Set<number> | null>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const monto = parsearMonto(montoTexto);
  const montoValido = Number.isFinite(monto) && monto >= montoMinimo;
  const alcanza = saldoARS === null || monto <= saldoARS;
  const nombreValido = nombre.trim().length > 0;

  const errorMonto = !tocado || !montoTexto
    ? ''
    : !Number.isFinite(monto)
      ? 'Escribí el monto con números, por ejemplo 15000 o 15.000,50.'
      : monto < montoMinimo
        ? `El mínimo para un frasco es ${pesos(montoMinimo)}.`
        : !alcanza
          ? `No te alcanza: tenés ${pesos(saldoARS ?? 0)} en pesos.`
          : '';
  const errorNombre = tocado && !nombreValido ? 'Ponele un nombre, por ejemplo "Vacaciones".' : '';

  const cargarFrascos = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frascos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      const lista: Frasco[] = data.frascos || [];
      setFrascos(lista);
      setEstadoLista('ok');

      // Si un frasco venció desde la última carga, la plata volvió a la cuenta: se actualiza el saldo.
      const cobrados = new Set(lista.filter(f => f.estado === 'cobrado').map(f => f.id));
      if (cobradosRef.current && [...cobrados].some(id => !cobradosRef.current!.has(id))) onSaldoCambiado();
      cobradosRef.current = cobrados;
    } catch {
      setEstadoLista(prev => (prev === 'ok' ? 'ok' : 'error'));
    }
  }, [getToken, onSaldoCambiado]);

  // Se recargan cada 30 segundos para ver crecer los intereses y acreditar los que vencen.
  useEffect(() => {
    cargarFrascos();
    const intervalo = window.setInterval(cargarFrascos, 30000);
    return () => window.clearInterval(intervalo);
  }, [cargarFrascos]);

  const activos = frascos.filter(f => f.estado === 'activo');
  const cobrados = frascos.filter(f => f.estado === 'cobrado');
  const totalAhorrado = activos.reduce((acc, f) => acc + Number(f.monto), 0);
  const totalHoy = activos.reduce((acc, f) => acc + Number(f.valor_actual), 0);

  useEffect(() => {
    if (estadoLista === 'ok') onResumen({ valorHoy: totalHoy, ganado: Math.max(0, totalHoy - totalAhorrado) });
  }, [estadoLista, totalHoy, totalAhorrado, onResumen]);

  // Simulación de lo que ganaría en cada plazo mientras escribe el monto.
  const simular = useCallback(async (valor: number) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frascos/simular?monto=${valor > 0 ? valor : 0}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setPlazos(data.plazos);
      setMontoMinimo(data.monto_minimo);
      setErrorPlazos(false);
    } catch {
      setErrorPlazos(true);
    }
  }, [getToken]);

  useEffect(() => {
    const timeout = window.setTimeout(() => simular(Number.isFinite(monto) ? monto : 0), 300);
    return () => window.clearTimeout(timeout);
  }, [monto, simular]);

  const plazoElegido = plazos.find(p => p.dias === plazoDias);

  useEffect(() => {
    if (revisando || creado) tituloRef.current?.focus();
  }, [revisando, creado]);

  const irARevision = (e: React.FormEvent) => {
    e.preventDefault();
    setTocado(true);
    setErrorCrear('');
    if (!nombreValido || !montoValido || !alcanza || !plazoElegido) return;
    setRevisando(true);
  };

  const crearFrasco = async () => {
    setCreando(true);
    setErrorCrear('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/frascos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ nombre: nombre.trim(), monto: Math.round(monto * 100) / 100, plazo_dias: plazoDias }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(res.status >= 400 && res.status < 500 ? data?.error : '');
      setCreado(data.frasco);
      setRevisando(false);
      setNombre('');
      setMontoTexto('');
      setTocado(false);
      await cargarFrascos();
      onSaldoCambiado();
    } catch (err) {
      setErrorCrear(
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos crear el frasco. No se movió plata; probá de nuevo.'
      );
    } finally {
      setCreando(false);
    }
  };

  return (
    <>
      {estadoLista === 'error' && (
        <div className={styles.aviso} role="alert">
          <p>No pudimos cargar tus frascos.</p>
          <button type="button" className={styles.btnSecundario} onClick={cargarFrascos}>Reintentar</button>
        </div>
      )}

      {frascos.length > 0 && (
        <section className={styles.tarjeta} aria-labelledby="titulo-mis-frascos">
          <h2 id="titulo-mis-frascos" className={styles.tituloSeccion}>Tus frascos</h2>
          <ul className={styles.frascos}>
            {[...activos, ...cobrados].map(f => {
              const progreso = Math.min(100, Math.round((f.dias_transcurridos / f.plazo_dias) * 100));
              const activo = f.estado === 'activo';
              return (
                <li key={f.id} className={styles.frasco}>
                  <div className={styles.frascoFila}>
                    <span className={styles.frascoNombre}>{f.nombre}</span>
                    <span className={activo ? styles.chipAhorrando : styles.chipAcreditado}>
                      {activo ? 'Ahorrando' : 'Acreditado'}
                    </span>
                  </div>
                  <div className={styles.frascoFila}>
                    <span className={styles.frascoValor}>{pesos(Number(f.valor_actual))}</span>
                    <span className={styles.ganancia}>+ {pesos(Number(f.ganancia_actual))}</span>
                  </div>
                  {activo ? (
                    <>
                      <div
                        className={styles.progreso}
                        role="progressbar"
                        aria-label={`Avance de ${f.nombre}`}
                        aria-valuemin={0}
                        aria-valuemax={f.plazo_dias}
                        aria-valuenow={f.dias_transcurridos}
                        aria-valuetext={`Día ${f.dias_transcurridos} de ${f.plazo_dias}`}
                      >
                        <div className={styles.progresoBarra} style={{ width: `${progreso}%` }} />
                      </div>
                      <p className={styles.frascoDetalle}>
                        Día {f.dias_transcurridos} de {f.plazo_dias} · {pesos(Number(f.monto))} al {porcentaje(Number(f.tna))} TNA ·
                        vuelve el {fechaLarga(f.fecha_fin)} con {pesos(Number(f.monto_final))}
                      </p>
                    </>
                  ) : (
                    <p className={styles.frascoDetalle}>
                      Volvió a tu cuenta el {fechaLarga(f.fecha_cobro ?? f.fecha_fin)} · {pesos(Number(f.monto))} a {f.plazo_dias} días
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {creado && (
        <section className={styles.recibo} aria-labelledby="titulo-frasco-creado">
          <span className={styles.reciboCheck} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
          </span>
          <h2 id="titulo-frasco-creado" ref={tituloRef} tabIndex={-1} className={styles.tituloRecibo}>
            Guardaste plata en “{creado.nombre}”
          </h2>
          <p className={styles.reciboMonto}>{pesos(Number(creado.monto))}</p>
          <p className={styles.texto}>
            El {fechaLarga(creado.fecha_fin)} vuelven solos a tu cuenta {pesos(Number(creado.monto_final))}.
          </p>
          <div className={styles.acciones}>
            <button type="button" className={styles.btnSecundario} onClick={() => setCreado(null)}>Crear otro frasco</button>
          </div>
        </section>
      )}

      {!creado && revisando && plazoElegido && (
        <section className={styles.tarjeta} aria-labelledby="titulo-revision-frasco">
          <h2 id="titulo-revision-frasco" ref={tituloRef} tabIndex={-1} className={styles.tituloSeccion}>Revisá tu frasco</h2>
          <dl className={styles.detalle}>
            <div><dt>Apartás</dt><dd className={styles.cifraGrande}>{pesos(monto)}</dd></div>
            <div><dt>Nombre</dt><dd>{nombre.trim()}</dd></div>
            <div><dt>Plazo</dt><dd>{plazoElegido.dias} días · TNA {porcentaje(plazoElegido.tna)}</dd></div>
            <div><dt>Vuelve a tu cuenta</dt><dd>{fechaLarga(vencimientoEstimado(plazoElegido.dias))}</dd></div>
            <div>
              <dt>Recibís</dt>
              <dd className={styles.cifra}>
                {pesos(plazoElegido.monto_final ?? monto)}
                {plazoElegido.ganancia != null && <span className={styles.ganancia}> (+ {pesos(plazoElegido.ganancia)})</span>}
              </dd>
            </div>
          </dl>
          <p className={styles.nota}>No vas a poder retirar la plata antes de que venza.</p>
          <div className={styles.acciones}>
            <button type="button" className={styles.btnPrincipal} onClick={crearFrasco} disabled={creando}>
              {creando ? 'Guardando…' : `Guardar ${pesos(monto)}`}
            </button>
            <button type="button" className={styles.btnSecundario} onClick={() => setRevisando(false)} disabled={creando}>
              Cambiar datos
            </button>
          </div>
          {errorCrear && <p className={styles.errorLinea} role="alert">{errorCrear}</p>}
        </section>
      )}

      {!creado && !revisando && (
        <section className={styles.tarjeta} aria-labelledby="titulo-nuevo-frasco">
          <h2 id="titulo-nuevo-frasco" className={styles.tituloSeccion}>
            {estadoLista === 'ok' && frascos.length === 0 ? 'Armá tu primer frasco' : 'Nuevo frasco'}
          </h2>
          <p className={styles.texto}>
            Apartás pesos por un plazo y ganan interés todos los días. Cuando vence, la plata vuelve sola a tu cuenta con lo ganado.
          </p>
          <form onSubmit={irARevision} className={styles.form} noValidate>
            <div className={styles.grillaCampos}>
              <div className={styles.campo}>
                <label htmlFor="frasco-nombre" className={styles.label}>Nombre</label>
                <input
                  id="frasco-nombre"
                  className={`${styles.input} ${styles.inputSuelto}`}
                  maxLength={40}
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Vacaciones"
                  aria-invalid={!!errorNombre}
                  aria-describedby={errorNombre ? 'frasco-nombre-error' : undefined}
                />
                {errorNombre && <p id="frasco-nombre-error" className={styles.errorLinea}>{errorNombre}</p>}
              </div>
              <div className={styles.campo}>
                <label htmlFor="frasco-monto" className={styles.label}>Monto</label>
                <div className={styles.inputMonto}>
                  <span className={styles.prefijo} aria-hidden="true">$</span>
                  <input
                    id="frasco-monto"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className={styles.input}
                    value={montoTexto}
                    onChange={e => setMontoTexto(e.target.value)}
                    onBlur={() => setTocado(true)}
                    placeholder={montoMinimo.toLocaleString('es-AR')}
                    aria-invalid={!!errorMonto}
                    aria-describedby={errorMonto ? 'frasco-monto-error' : 'frasco-monto-ayuda'}
                  />
                </div>
                {errorMonto ? (
                  <p id="frasco-monto-error" className={styles.errorLinea}>{errorMonto}</p>
                ) : (
                  <p id="frasco-monto-ayuda" className={styles.ayuda}>
                    Mínimo {pesos(montoMinimo)}{saldoARS !== null && ` · tenés ${pesos(saldoARS)}`}
                  </p>
                )}
              </div>
            </div>

            <fieldset className={styles.plazos}>
              <legend className={styles.label}>Plazo</legend>
              {errorPlazos && plazos.length === 0 ? (
                <div className={styles.aviso} role="alert">
                  <p>No pudimos cargar los plazos.</p>
                  <button type="button" className={styles.btnSecundario} onClick={() => simular(Number.isFinite(monto) ? monto : 0)}>Reintentar</button>
                </div>
              ) : (
                <div className={styles.plazosGrilla}>
                  {plazos.map(p => (
                    <label key={p.dias} className={`${styles.plazo} ${plazoDias === p.dias ? styles.plazoElegido : ''}`}>
                      <input
                        type="radio"
                        name="plazo"
                        className={styles.radio}
                        checked={plazoDias === p.dias}
                        onChange={() => setPlazoDias(p.dias)}
                      />
                      <span className={styles.plazoDias}>{p.dias} días</span>
                      <span className={styles.plazoTasa}>TNA {porcentaje(p.tna)}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <div className={styles.estimado} aria-live="polite">
              <span>Al vencer recibís</span>
              <strong>{plazoElegido?.monto_final != null && montoValido ? pesos(plazoElegido.monto_final) : pesos(0)}</strong>
              {plazoElegido?.ganancia != null && montoValido && (
                <small>
                  Ganás {pesos(plazoElegido.ganancia)} · TEA {porcentaje(plazoElegido.tea)}
                </small>
              )}
            </div>

            <button type="submit" className={styles.btnPrincipal} disabled={!plazoElegido || (tocado && (!!errorMonto || !!errorNombre))}>
              Revisar frasco
            </button>
          </form>
        </section>
      )}
    </>
  );
}

export default SeccionFrascos;
