import type { ReactNode } from 'react'
import { useAuth } from '@clerk/react'
import { Navigate } from 'react-router-dom'

// Este componente revisa si hay sesión activa.
// Si hay sesión → muestra el contenido (children)
// Si no hay sesión → redirige al login
type PrivateRouteProps = {
  children: ReactNode
}

function PrivateRoute({ children }: PrivateRouteProps) {
  const { isSignedIn, isLoaded } = useAuth()

  // isLoaded es false mientras Clerk verifica la sesión (evita parpadeos)
  if (!isLoaded) {
    return <p>Cargando...</p>
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default PrivateRoute