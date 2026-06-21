import { useState, useEffect } from "react"
import { useAuth } from "@clerk/react"
import { Navigate, Link } from "react-router-dom"
import {
  Landmark, ArrowLeftRight, Banknote, CreditCard,
  Car, Tag, TrendingUp, Briefcase, ShieldCheck, Building2,
  Lock, Zap, Smartphone,
} from "lucide-react"

const IconInstagram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

const IconYoutube = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
  </svg>
)

const IconX = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.737-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
import styles from "./Landing.module.css"
import logoF from "../assets/404log.png"
import banImg from "../assets/Ban.png"

interface Cotizacion {
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion: string
}

const CASAS_VISIBLES = ["oficial", "blue", "bolsa", "tarjeta"]

const NOMBRE_DISPLAY: Record<string, string> = {
  bolsa: "MEP",
}

const formatPeso = (n: number | null) =>
  n != null ? `$${n.toLocaleString("es-AR")}` : "—"

const formatFecha = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

function Landing() {
  const { isLoaded, isSignedIn } = useAuth()
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loadingCot, setLoadingCot] = useState(true)

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares")
      .then(r => r.json())
      .then((data: Cotizacion[]) => {
        setCotizaciones(data.filter(d => CASAS_VISIBLES.includes(d.casa)))
      })
      .catch(() => {})
      .finally(() => setLoadingCot(false))
  }, [])

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className={styles.page}>

      {/* ── NAVBAR ── */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <img src={logoF} alt="404Bank" className={styles.navLogo} />
        </div>
        <ul className={styles.navLinks}>
          <li><a href="#servicios">Servicios</a></li>
          <li><a href="#beneficios">Beneficios</a></li>
          <li><a href="#nosotros">Nosotros</a></li>
        </ul>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.btnLogin}>Iniciar sesión</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.heroBadge}>Banking del futuro</span>
          <h1 className={styles.heroTitle}>
            Donde tus ahorros<br />toman vuelo.
          </h1>
          <p className={styles.heroSubtitle}>
            Administrá tu dinero, realizá transferencias y solicitá préstamos —<br />
            todo desde un solo lugar, sin papeles ni filas.
          </p>
          <div className={styles.heroActions}>
            <Link to="/register" className={styles.heroBtnPrimary}>Abrir tu cuenta gratis</Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.heroBanWrapper}>
            <img src={banImg} alt="Ban - mascota 404Bank" className={styles.heroBan} />
            <div className={styles.heroBubble}>
              ¡Hola! Soy Ban, tu asistente virtual.
              <br />Bienvenido a 404Bank 👋
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section className={styles.services} id="servicios">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Conocé todo lo que tenemos para vos</h2>
          <p className={styles.sectionSubtitle}>
            Accedé a todos los servicios bancarios desde tu celular o computadora.
          </p>
        </div>
        <div className={styles.servicesGrid}>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Landmark size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Cuentas</h3>
            <p className={styles.serviceDesc}>Abrí tu cuenta en minutos, sin papeles ni turnos. 100% digital y gratuita.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><ArrowLeftRight size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Transferencias</h3>
            <p className={styles.serviceDesc}>Enviá y recibí dinero al instante, sin comisiones ocultas, las 24 horas.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Banknote size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Préstamos Personales</h3>
            <p className={styles.serviceDesc}>Solicitá préstamos con tasas competitivas y aprobación rápida desde la app.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><CreditCard size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Tarjetas</h3>
            <p className={styles.serviceDesc}>Tarjetas de débito y crédito con beneficios exclusivos para cada perfil.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Car size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Préstamos Prendarios</h3>
            <p className={styles.serviceDesc}>Financiá tu vehículo con cuotas flexibles y tasas preferenciales.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Tag size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Promociones</h3>
            <p className={styles.serviceDesc}>Descuentos y beneficios exclusivos en comercios adheridos con tu tarjeta.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><TrendingUp size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Inversiones</h3>
            <p className={styles.serviceDesc}>Hacé crecer tu dinero con plazos fijos, fondos y opciones de inversión.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Briefcase size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Cuenta Sueldo</h3>
            <p className={styles.serviceDesc}>Recibí tu sueldo sin costo de mantenimiento y con beneficios adicionales.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><ShieldCheck size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Seguros y Asistencias</h3>
            <p className={styles.serviceDesc}>Protegé lo que más importa con seguros de vida, hogar y accidentes.</p>
          </div>
          <div className={styles.serviceCard}>
            <div className={styles.serviceIconWrap}><Building2 size={36} strokeWidth={1.5} color="#4F0919" /></div>
            <h3 className={styles.serviceTitle}>Pymes y Empresas</h3>
            <p className={styles.serviceDesc}>Soluciones financieras a medida para potenciar tu negocio o empresa.</p>
          </div>
        </div>
      </section>

      {/* ── COTIZACIONES ── */}
      <section className={styles.cotizaciones}>
        <div className={styles.cotHeader}>
          <h3 className={styles.cotTitle}>Cotización del dólar</h3>
          {!loadingCot && cotizaciones.length > 0 && (
            <span className={styles.cotFecha}>
              Actualizado: {formatFecha(cotizaciones[0].fechaActualizacion)}
            </span>
          )}
        </div>
        <div className={styles.cotGrid}>
          {loadingCot ? (
            <span className={styles.cotLoading}>Cargando cotizaciones...</span>
          ) : cotizaciones.length === 0 ? (
            <span className={styles.cotLoading}>No se pudo obtener la cotización.</span>
          ) : (
            cotizaciones.map(c => (
              <div key={c.casa} className={styles.cotCard}>
                <span className={styles.cotNombre}>{NOMBRE_DISPLAY[c.casa] ?? c.nombre}</span>
                <div className={styles.cotRow}>
                  <span className={styles.cotRowLabel}>Compra</span>
                  <span className={styles.cotRowValue}>{formatPeso(c.compra)}</span>
                </div>
                <div className={styles.cotDivider} />
                <div className={styles.cotRow}>
                  <span className={styles.cotRowLabel}>Venta</span>
                  <span className={styles.cotRowValue}>{formatPeso(c.venta)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── BENEFICIOS ── */}
      <section className={styles.benefits} id="beneficios">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>¿Por qué elegir 404Bank?</h2>
          <p className={styles.sectionSubtitle}>Construido para la nueva generación de ahorradores.</p>
        </div>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIconWrap}><Lock size={32} strokeWidth={1.5} color="#4F0919" /></div>
            <h4 className={styles.benefitTitle}>Seguridad bancaria</h4>
            <p className={styles.benefitDesc}>
              Tus datos y tu dinero protegidos con cifrado de nivel bancario y autenticación en dos pasos.
            </p>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIconWrap}><Zap size={32} strokeWidth={1.5} color="#4F0919" /></div>
            <h4 className={styles.benefitTitle}>Operaciones instantáneas</h4>
            <p className={styles.benefitDesc}>
              Transferencias, pagos y movimientos en segundos, sin demoras ni burocracia.
            </p>
          </div>
          <div className={styles.benefitItem}>
            <div className={styles.benefitIconWrap}><Smartphone size={32} strokeWidth={1.5} color="#4F0919" /></div>
            <h4 className={styles.benefitTitle}>100% digital</h4>
            <p className={styles.benefitDesc}>
              Sin sucursales, sin filas. Todo desde tu dispositivo, cuando y donde quieras.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className={styles.cta} id="nosotros">
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>¿Listo para empezar?</h2>
          <p className={styles.ctaSubtitle}>Abrí tu cuenta gratis en menos de 5 minutos.</p>
          <Link to="/register" className={styles.ctaBtn}>Crear mi cuenta</Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.footerBrandName}>404Bank</span>
            <div className={styles.footerSocial}>
              <a href="#" className={styles.footerSocialLink} aria-label="Instagram"><IconInstagram /></a>
              <a href="#" className={styles.footerSocialLink} aria-label="YouTube"><IconYoutube /></a>
              <a href="#" className={styles.footerSocialLink} aria-label="X / Twitter"><IconX /></a>
            </div>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h5 className={styles.footerColTitle}>Servicios</h5>
              <ul>
                <li><a href="#servicios">Cuentas</a></li>
                <li><a href="#servicios">Transferencias</a></li>
                <li><a href="#servicios">Préstamos</a></li>
                <li><a href="#servicios">Tarjetas</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h5 className={styles.footerColTitle}>Empresa</h5>
              <ul>
                <li><a href="#nosotros">Nosotros</a></li>
                <li><a href="#beneficios">Beneficios</a></li>
              </ul>
            </div>
            <div className={styles.footerCol}>
              <h5 className={styles.footerColTitle}>Cuenta</h5>
              <ul>
                <li><Link to="/login">Iniciar sesión</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© 2026 404Bank. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  )
}

export default Landing
