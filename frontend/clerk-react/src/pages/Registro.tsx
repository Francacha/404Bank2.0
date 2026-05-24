import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignUp,
} from '@clerk/react'
import styles from './Registro.module.css'

function Register() {
  return (
    <div className={styles.container}>
      <ClerkLoading>
        <div>Cargando Clerk...</div>
      </ClerkLoading>

      <ClerkFailed>
        <div>Clerk no pudo iniciar.</div>
      </ClerkFailed>

      <ClerkLoaded>
        <SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/home" />
      </ClerkLoaded>
    </div>
  )
}

export default Register
