import { useAuth } from '@clerk/clerk-react'
import { Navigate } from 'react-router-dom'

export const ProtectRouter = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }

  return children
}
