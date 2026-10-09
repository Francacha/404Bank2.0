import { ClerkFailed, ClerkLoaded, ClerkLoading, SignIn, useAuth } from "@clerk/react"
import { Navigate } from "react-router-dom"
import AuthShell from "../components/AuthShell"
import { clerkAppearance } from "../components/clerkAppearance"
import styles from "./Login.module.css"

function Login() {
  const { isLoaded, isSignedIn } = useAuth()

  if (isLoaded && isSignedIn) {
    return <Navigate to="/home" replace />
  }

  return (
    <AuthShell
      title="Ingresá a tu cuenta"
      subtitle="Usá el nombre de usuario y la contraseña con los que te registraste."
      mensajeBan="¡Hola de nuevo! Cuando entres, preguntame lo que necesites."
    >
      <ClerkLoading>
        <p className={styles.estado}>Cargando el ingreso…</p>
      </ClerkLoading>
      <ClerkFailed>
        <p className={styles.error} role="alert">
          No pudimos cargar el ingreso. Recargá la página e intentá de nuevo.
        </p>
      </ClerkFailed>
      <ClerkLoaded>
        <SignIn
          routing="hash"
          signUpUrl="/register"
          forceRedirectUrl="/home"
          fallbackRedirectUrl="/home"
          appearance={clerkAppearance}
        />
      </ClerkLoaded>
    </AuthShell>
  )
}

export default Login
