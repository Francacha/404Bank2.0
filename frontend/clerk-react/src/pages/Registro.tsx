import { ClerkFailed, ClerkLoaded, ClerkLoading, SignUp } from '@clerk/react'
import styles from './Registro.module.css'
import logoF from '../assets/404log.png'

function Register() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src={logoF} alt="404Bank" className={styles.logo} />
        <h1 className={styles.title}>Creá tu cuenta</h1>
        <p className={styles.subtitle}>Gratis, rápido y 100% digital.</p>

        <ClerkLoading><div /></ClerkLoading>
        <ClerkFailed><p className={styles.error}>No se pudo iniciar el formulario.</p></ClerkFailed>

        <ClerkLoaded>
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            fallbackRedirectUrl="/onboarding"
            appearance={{
              variables: {
                colorPrimary: '#4F0919',
                colorText: '#111827',
                colorTextSecondary: '#6b7280',
                colorBackground: '#f4f6f9',
                colorInputBackground: '#ffffff',
                colorInputText: '#111827',
                borderRadius: '8px',
                fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
              },
              elements: {
                card: {
                  boxShadow: 'none',
                  borderRadius: '0',
                  border: 'none',
                  padding: '0',
                  background: 'transparent',
                },
                headerTitle: { display: 'none' },
                headerSubtitle: { display: 'none' },
                formButtonPrimary: {
                  backgroundColor: '#4F0919',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '700',
                },
                footerActionLink: { color: '#4F0919' },
                formFieldInput: {
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  borderRadius: '8px',
                  fontSize: '15px',
                  padding: '12px 14px',
                  border: '2px solid #4F0919',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), 0 1px 6px rgba(79,9,25,0.08)',
                },
                formFieldLabel: {
                  color: '#374151',
                  fontWeight: '600',
                  fontSize: '13px',
                },
              },
            }}
          />
        </ClerkLoaded>
      </div>
    </div>
  )
}

export default Register
