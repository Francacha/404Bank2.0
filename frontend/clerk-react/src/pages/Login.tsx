import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"
import styles from './Login.module.css'

function Login() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <div className={styles.container}>
      <ClerkLoading>
        <div>Cargando Clerk...</div>
      </ClerkLoading>

      <ClerkFailed>
        <div className={styles.clerkFailedBox}>
          <h2>Clerk no pudo iniciar</h2>
          <p>
            Si la pantalla se queda en blanco o recarga sola, el problema suele estar en la
            clave publishable, el dominio permitido o la inicializacion de Clerk.
          </p>
        </div>
      </ClerkFailed>

      <ClerkDegraded>
        <div>Clerk inicio en modo degradado.</div>
      </ClerkDegraded>

      <ClerkLoaded>
        <SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl="/home" fallbackRedirectUrl="/home" />
      </ClerkLoaded>
    </div>
  )
}

export default Login
