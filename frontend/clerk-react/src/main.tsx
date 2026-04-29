import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Falta la clave VITE_CLERK_PUBLISHABLE_KEY en .env.local')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ClerkProvider
    publishableKey={PUBLISHABLE_KEY}
    signInUrl="/login"
    signUpUrl="/register"
    afterSignOutUrl="/login"
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ClerkProvider>,
)
