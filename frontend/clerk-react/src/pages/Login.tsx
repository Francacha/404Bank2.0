import { useState } from "react"
import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"
import styles from './Login.module.css'
import logoF from '../assets/404log.png'
import banImg from '../assets/Ban.png'
import banSImg from '../assets/banS.png'

/*
 * Login — Layout visual de dos columnas inspirado en banca corporativa.
 * Panel izquierdo: marca + título decorativo (sin lógica).
 * Panel derecho: componente Clerk <SignIn> con colores adaptados.
 * La lógica de autenticación (routing, redirect, guards) no fue modificada.
 */
function Login() {
  const { isLoaded, isSignedIn } = useAuth()
  const [banHabla, setBanHabla] = useState(false)

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className={styles.container}>

      {/* ── PANEL IZQUIERDO ── */}
      <div className={styles.leftPanel}>
        <img src={logoF} alt="404Bank logo" className={styles.logoImg} />
        <h1 className={styles.leftTitle}>
          Online<br />Banking
        </h1>
        <div className={styles.leftDivider} />
        <p className={styles.leftSubtitle}>
          Donde tus ahorros<br />toman vuelo.
        </p>
        <div className={styles.banWrapper}>
          {banHabla && (
            <div className={styles.banBubble}>
              ¡Hola! Soy Ban, tu asistente virtual.<br />Bienvenido a 404Bank 👋
            </div>
          )}
          <img
            src={banHabla ? banSImg : banImg}
            alt="Mascota 404Bank"
            className={styles.banImg}
            onClick={() => setBanHabla(prev => !prev)}
          />
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className={styles.rightPanel}>

        <div className={styles.rightWelcome}>
          <h2 className={styles.rightTitle}>¡Bienvenido 404User!</h2>
          <p className={styles.rightSubtitle}>
            Ingresá tus datos para acceder a tu cuenta.
          </p>
        </div>

        <div className={styles.clerkWrapper}>
          <ClerkLoading>
            <div />
          </ClerkLoading>

          <ClerkFailed>
            <div className={styles.clerkFailedBox}>
              <h2>Clerk no pudo iniciar</h2>
              <p>
                Si la pantalla se queda en blanco o recarga sola, el problema suele
                estar en la clave publishable, el dominio permitido o la
                inicialización de Clerk.
              </p>
            </div>
          </ClerkFailed>

          <ClerkDegraded>
            <div />
          </ClerkDegraded>

          <ClerkLoaded>
            <SignIn
              routing="hash"
              signUpUrl="/register"
              forceRedirectUrl="/home"
              fallbackRedirectUrl="/home"
              appearance={{
                variables: {
                  colorPrimary: '#BABABA',
                  colorText: '#111827',
                  colorTextSecondary: '#6b7280',
                  colorBackground: '#4F0919',
                  colorInputBackground: '#f9fafb',
                  colorInputText: '#111827',
                  borderRadius: '8px',
                  fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
                },
                elements: {
                  card: {
                    boxShadow: '0 4px 28px rgba(0, 0, 0, 0.10)',
                    borderRadius: '14px',
                    border: 'none',
                  },
                  headerTitle: { display: 'none' },
                  headerSubtitle: { display: 'none' },
                  formButtonPrimary: {
                    backgroundColor: '#4F0919',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    letterSpacing: '0.2px',
                  },
                  footerActionLink: { color: '#4F0919' },
                  formFieldInput: {
                    borderRadius: '8px',
                    fontSize: '15px',
                  },
                },
              }}
            />
          </ClerkLoaded>
        </div>

      </div>
    </div>
  )
}

export default Login
