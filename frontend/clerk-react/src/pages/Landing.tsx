import { useEffect, useRef, useState } from "react"
import { useAuth } from "@clerk/react"
import { Navigate, Link } from "react-router-dom"
import styles from "./Landing.module.css"
import logo404Bank from "../assets/logo404bank.png"
import logoClaro from "../assets/logo404bank-claro.png"
import banImg from "../assets/banLanding.png"

const API_URL = "http://localhost:3000"

interface Cotizacion {
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

interface OpcionSimulada {
  cant_cuotas: number
  monto_cuota: number
  monto_total: number
  recargo_porcentaje: number
  tea: number
  cftea: number
}

interface Simulacion {
  tna: number
  monto_maximo: number
  cuotas_permitidas: number[]
  opciones: OpcionSimulada[]
}

const CASAS_VISIBLES = ["oficial", "blue", "bolsa", "tarjeta"]
const NOMBRE_CASA: Record<string, string> = {
  oficial: "Oficial",
  blue: "Blue",
  bolsa: "MEP",
  tarjeta: "Tarjeta",
}

const CUOTAS = [1, 3, 6, 12, 24, 36]
const MONTO_INICIAL = "500000"

const pesos = (valor: number, decimales = 2) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valor)

const porcentaje = (valor: number) => `${valor.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`

// Lo que existe hoy en 404Bank. Cada línea tiene que poder mostrarse en la demo.
const SERVICIOS = [
  { nombre: "Cuenta en pesos y en dólares", detalle: "CBU y alias propios desde el primer día.", dato: "CBU + alias" },
  { nombre: "Transferencias", detalle: "Por CBU o alias, con tus contactos guardados.", dato: "Al instante" },
  { nombre: "Préstamos personales", detalle: "Cuota fija con sistema francés, simulá antes de pedir.", dato: "1 a 36 cuotas" },
  { nombre: "Frascos de ahorro", detalle: "Apartás plata a plazo fijo, de 7 a 365 días, desde $ 1.000.", dato: "TNA 28–35%" },
  { nombre: "Tarjetas", detalle: "Débito y crédito, las pedís desde la app.", dato: "Débito · crédito" },
  { nombre: "Compra de dólares", detalle: "Convertís pesos de tu cuenta al tipo de cambio oficial.", dato: "USD" },
  { nombre: "Comprobantes", detalle: "El PDF de cada transferencia, cuando lo necesites.", dato: "PDF" },
  { nombre: "Ban", detalle: "Tu asistente: le preguntás y te responde con IA.", dato: "Chat" },
]

const PASOS = [
  { titulo: "Creá tu usuario", texto: "Con tu email y una contraseña." },
  { titulo: "Completá tus datos", texto: "DNI y datos personales, una sola vez." },
  { titulo: "Recibí tu CBU y alias", texto: "Tu cuenta en pesos queda abierta." },
  { titulo: "Hacé tu primera transferencia", texto: "O simulá tu primer préstamo." },
]

function Landing() {
  const { isLoaded, isSignedIn } = useAuth()

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [estadoCot, setEstadoCot] = useState<"cargando" | "ok" | "error">("cargando")

  const [monto, setMonto] = useState(MONTO_INICIAL)
  const [cuotas, setCuotas] = useState(12)
  const [simulacion, setSimulacion] = useState<Simulacion | null>(null)
  const [montoSimulado, setMontoSimulado] = useState<number | null>(null)
  const [errorSim, setErrorSim] = useState(false)
  const simulacionIdRef = useRef(0)

  const montoNumero = Number(monto) || 0
  const montoMaximo = simulacion?.monto_maximo ?? 5000000
  const superaMaximo = montoNumero > montoMaximo

  const cargarCotizaciones = () => {
    setEstadoCot("cargando")
    fetch("https://dolarapi.com/v1/dolares")
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data: Cotizacion[]) => {
        setCotizaciones(data.filter(d => CASAS_VISIBLES.includes(d.casa)))
        setEstadoCot("ok")
      })
      .catch(() => setEstadoCot("error"))
  }

  useEffect(() => {
    // Con sesión iniciada se redirige a /home: no hace falta pedir nada.
    if (isSignedIn) return
    cargarCotizaciones()
  }, [isSignedIn])

  // Simulación con las mismas cuentas que hace el backend al pedir un préstamo.
  // Cada pedido tiene un número: si llega una respuesta vieja, se descarta.
  useEffect(() => {
    if (isSignedIn) return
    const simulacionId = ++simulacionIdRef.current
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/simular?monto=${montoNumero}`)
        if (!res.ok) throw new Error()
        const data: Simulacion = await res.json()
        if (simulacionId !== simulacionIdRef.current) return
        setSimulacion(data)
        setMontoSimulado(montoNumero)
        setErrorSim(false)
      } catch {
        if (simulacionId === simulacionIdRef.current) setErrorSim(true)
      }
    }, 250)
    return () => clearTimeout(timeout)
  }, [montoNumero, isSignedIn])

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  // Se muestra el último resultado mientras llega el nuevo (atenuado), en lugar de vaciar el panel en cada tecla.
  const opcion = montoNumero > 0 && !superaMaximo
    ? simulacion?.opciones.find(o => o.cant_cuotas === cuotas)
    : undefined
  const desactualizado = !!opcion && montoSimulado !== montoNumero && !errorSim
  const montoDelResultado = montoSimulado ?? montoNumero
  const calculando = montoNumero > 0 && !superaMaximo && !opcion && !errorSim
  const actualizado = cotizaciones[0]?.fechaActualizacion

  return (
    <div className={styles.page}>
      <a href="#contenido" className={styles.skipLink}>Saltar al contenido</a>

      {/* ── Hero: el titular y el simulador ── */}
      <header className={styles.hero}>
        <nav className={styles.nav} aria-label="Principal">
          <Link to="/" className={styles.marca} aria-label="404Bank, inicio">
            <img src={logoClaro} alt="" width={160} height={32} className={styles.logo} />
          </Link>
          <div className={styles.navLinks}>
            <a href="#servicios">Qué podés hacer</a>
            <a href="#nosotros">Nosotros</a>
          </div>
          <div className={styles.navAcciones}>
            <Link to="/login" className={styles.btnIngresar}>Iniciar sesión</Link>
            <Link to="/register" className={styles.btnAbrirNav}>Abrir cuenta</Link>
          </div>
        </nav>

        <div className={styles.heroGrid} id="contenido">
          <div className={styles.heroTexto}>
            <h1 className={styles.titular}>
              Filas, papeles y letra chica:
              <span className={styles.titular404}> error 404.</span>
            </h1>
            <p className={styles.bajada}>
              Una cuenta digital con CBU y alias, transferencias, préstamos y frascos de ahorro.
              Y los números a la vista antes de firmar nada.
            </p>
            <Link to="/register" className={styles.btnPrincipal}>Abrir mi cuenta gratis</Link>
            <p className={styles.notaSimulado}>Banco simulado: no opera con dinero real.</p>
          </div>

          <section className={styles.simulador} aria-labelledby="sim-titulo">
            <img src={banImg} alt="" width={300} height={598} className={styles.banSimulador} />
            <h2 id="sim-titulo" className={styles.simTitulo}>Simulá un préstamo</h2>

            <label className={styles.simLabel} htmlFor="sim-monto">¿Cuánto necesitás?</label>
            <div className={styles.simMontoField}>
              <span className={styles.simPrefijo} aria-hidden="true">$</span>
              <input
                id="sim-monto"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={monto ? Number(monto).toLocaleString("es-AR") : ""}
                onChange={e => setMonto(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className={styles.simMonto}
                aria-invalid={superaMaximo}
                aria-describedby="sim-ayuda"
              />
            </div>
            <p id="sim-ayuda" className={superaMaximo ? styles.simError : styles.simAyuda}>
              {superaMaximo ? `El máximo es ${pesos(montoMaximo, 0)}.` : `Hasta ${pesos(montoMaximo, 0)}.`}
            </p>

            <span className={styles.simLabel} id="sim-cuotas">Cuotas</span>
            <div className={styles.simCuotas} role="radiogroup" aria-labelledby="sim-cuotas">
              {CUOTAS.map(n => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={cuotas === n}
                  className={`${styles.simCuota} ${cuotas === n ? styles.simCuotaActiva : ""}`}
                  onClick={() => setCuotas(n)}
                >
                  {n === 1 ? "1 pago" : n}
                </button>
              ))}
            </div>

            <div
              className={`${styles.simResultado} ${desactualizado ? styles.simDesactualizado : ""}`}
              aria-live="polite"
              aria-busy={desactualizado}
            >
              {errorSim && (
                <p className={styles.simError}>
                  {opcion
                    ? "No pudimos recalcular: estos números son del monto anterior. Probá de nuevo en un momento."
                    : "No pudimos calcular ahora. Probá de nuevo en un momento."}
                </p>
              )}
              {opcion ? (
                <>
                  <span className={styles.simEtiqueta}>Vas a devolver</span>
                  {/* Cada cifra entra con una transición corta cuando cambia su valor. */}
                  <span key={opcion.monto_total} className={styles.simTotal}>{pesos(opcion.monto_total)}</span>
                  <span key={`c${opcion.monto_cuota}`} className={`${styles.simCuotaTexto} ${styles.cifraNueva}`}>
                    {cuotas === 1 ? "En un pago" : <>{cuotas} cuotas de <strong>{pesos(opcion.monto_cuota)}</strong></>}
                  </span>
                  <dl className={styles.simTasas}>
                    <div>
                      <dt>CFTEA</dt>
                      <dd key={`f${opcion.cftea}`} className={styles.cifraNueva}>{porcentaje(opcion.cftea)}</dd>
                    </div>
                    <div>
                      <dt>TNA</dt>
                      <dd>{porcentaje(simulacion!.tna)}</dd>
                    </div>
                    <div>
                      <dt>Intereses e IVA</dt>
                      <dd key={`i${opcion.monto_total}`} className={styles.cifraNueva}>
                        {pesos(opcion.monto_total - montoDelResultado, 0)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : calculando && !errorSim ? (
                <p className={styles.simAyuda}>Calculando…</p>
              ) : !superaMaximo && !errorSim ? (
                <p className={styles.simAyuda}>Escribí un monto para ver cuánto devolvés.</p>
              ) : null}
            </div>
            <p className={styles.simNota}>
              Es la misma cuenta que hace 404Bank cuando pedís el préstamo: sistema francés, con IVA sobre los intereses.
            </p>
          </section>
        </div>

        {/* ── El dólar de hoy, como prueba en vivo ── */}
        <section className={styles.dolar} aria-labelledby="dolar-titulo">
          <div className={styles.dolarCabecera}>
            <h2 id="dolar-titulo" className={styles.dolarTitulo}>Dólar hoy</h2>
            {estadoCot === "ok" && actualizado && (
              <span className={styles.dolarHora}>
                Actualizado {new Date(actualizado).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <div aria-live="polite" className={styles.dolarFila}>
            {estadoCot === "cargando" && <p className={styles.dolarEstado}>Cargando cotizaciones…</p>}
            {estadoCot === "error" && (
              <p className={styles.dolarEstado}>
                No pudimos traer la cotización.{" "}
                <button type="button" className={styles.dolarReintentar} onClick={cargarCotizaciones}>Reintentar</button>
              </p>
            )}
            {estadoCot === "ok" && cotizaciones.map(c => (
              <div key={c.casa} className={styles.dolarItem}>
                <span className={styles.dolarCasa}>{NOMBRE_CASA[c.casa] ?? c.nombre}</span>
                <span className={styles.dolarValores}>
                  <span><small>Compra</small> {c.compra != null ? pesos(c.compra, 0) : "—"}</span>
                  <span><small>Venta</small> {c.venta != null ? pesos(c.venta, 0) : "—"}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </header>

      <main>
        {/* ── Lo que existe de verdad ── */}
        <section className={styles.servicios} id="servicios" aria-labelledby="servicios-titulo">
          <div className={styles.seccionCabecera}>
            <h2 id="servicios-titulo" className={styles.seccionTitulo}>Lo que sí vas a encontrar</h2>
            <p className={styles.seccionBajada}>Todo esto funciona hoy, desde tu cuenta.</p>
          </div>
          <ul className={styles.listaServicios}>
            {SERVICIOS.map(s => (
              <li key={s.nombre} className={styles.servicio}>
                <span className={styles.servicioNombre}>{s.nombre}</span>
                <span className={styles.servicioDetalle}>{s.detalle}</span>
                <span className={styles.servicioDato}>{s.dato}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Cómo abrir la cuenta ── */}
        <section className={styles.pasos} aria-labelledby="pasos-titulo">
          <div className={styles.seccionCabecera}>
            <h2 id="pasos-titulo" className={styles.seccionTitulo}>Abrir tu cuenta lleva cuatro pasos</h2>
          </div>
          <ol className={styles.listaPasos}>
            {PASOS.map((p, i) => (
              <li key={p.titulo} className={styles.paso}>
                <span className={styles.pasoNumero} aria-hidden="true">{i + 1}</span>
                <span className={styles.pasoCuerpo}>
                  <span className={styles.pasoTitulo}>{p.titulo}</span>
                  <span className={styles.pasoTexto}>{p.texto}</span>
                </span>
                {i === 2 && (
                  <span className={styles.aliasEjemplo}>
                    <span className={styles.aliasEtiqueta}>Ejemplo</span>
                    <span className={styles.aliasPill}>tu.alias.404</span>
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ── Nosotros: honesto sobre qué es esto ── */}
        <section className={styles.nosotros} id="nosotros" aria-labelledby="nosotros-titulo">
          <div className={styles.nosotrosTexto}>
            <h2 id="nosotros-titulo" className={styles.nosotrosTitulo}>Un banco de práctica, hecho en serio</h2>
            <p>
              404Bank es un banco digital simulado, desarrollado por Franco y Mateo para Práctica Profesionalizante I.
              No opera con dinero real: las cuentas, los préstamos y los frascos funcionan con datos de prueba y un
              Banco Central simulado.
            </p>
            <p>
              Lo que sí es real son las cuentas: las tasas, el IVA, las cuotas y los punitorios se calculan como en un
              banco de verdad.
            </p>
            <Link to="/register" className={styles.btnPrincipal}>Abrir mi cuenta gratis</Link>
          </div>
          <div className={styles.nosotrosBan}>
            <p className={styles.globo}>¿Dudas? Cuando entres, preguntame a mí.</p>
            <img src={banImg} alt="Ban, el asistente de 404Bank, saludando" width={300} height={598} className={styles.banNosotros} />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <img src={logo404Bank} alt="404Bank" width={140} height={28} className={styles.footerLogo} />
        <p className={styles.footerTexto}>© 2026 404Bank · Proyecto académico de Práctica Profesionalizante I</p>
        <div className={styles.footerLinks}>
          <Link to="/login">Iniciar sesión</Link>
          <Link to="/register">Abrir cuenta</Link>
        </div>
      </footer>
    </div>
  )
}

export default Landing
