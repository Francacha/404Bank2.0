import {
  ClerkFailed,
  ClerkLoaded,
  ClerkLoading,
  SignUp,
} from '@clerk/react'

function Register() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
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