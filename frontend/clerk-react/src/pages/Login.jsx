import {
  ClerkDegraded,
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignIn,
} from '@clerk/clerk-react'

function Login() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
      <ClerkLoading>
        <div>Cargando Clerk...</div>
      </ClerkLoading>

      <ClerkFailed>
        <div style={{ maxWidth: '520px', textAlign: 'center' }}>
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
        <SignIn routing="path" path="/login" signUpUrl="/register" fallbackRedirectUrl="/home" />
      </ClerkLoaded>
    </div>
  )
}

export default Login
