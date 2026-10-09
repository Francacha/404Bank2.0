import { ClerkFailed, ClerkLoaded, ClerkLoading, SignUp } from '@clerk/react'
import AuthShell from '../components/AuthShell'
import { clerkAppearance } from '../components/clerkAppearance'
import styles from './Registro.module.css'

function Register() {
  return (
    <AuthShell
      title="Abrí tu cuenta"
      subtitle="Primero creá tu usuario con tu email y una contraseña. Después completás tus datos y recibís tu CBU y alias."
      paso={1}
      mensajeBan="¡Bienvenido! En cuatro pasos tenés tu cuenta."
    >
      <ClerkLoading>
        <p className={styles.estado}>Cargando el formulario…</p>
      </ClerkLoading>
      <ClerkFailed>
        <p className={styles.error} role="alert">
          No pudimos cargar el formulario de registro. Recargá la página e intentá de nuevo.
        </p>
      </ClerkFailed>
      <ClerkLoaded>
        <SignUp
          routing="path"
          path="/register"
          signInUrl="/login"
          fallbackRedirectUrl="/onboarding"
          appearance={clerkAppearance}
        />
      </ClerkLoaded>
    </AuthShell>
  )
}

export default Register
