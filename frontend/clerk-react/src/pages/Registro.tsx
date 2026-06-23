import { ClerkFailed, ClerkLoaded, ClerkLoading, SignUp } from '@clerk/react'
import styles from './Registro.module.css'
import logoF from '../assets/404log.png'

function Register() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <img src={logoF} alt="404Bank" className={styles.logo} />
        <h1 className={styles.title}>Regístrate en 404Bank</h1>

        <ClerkLoading><div /></ClerkLoading>
        <ClerkFailed><p className={styles.error}>No se pudo iniciar el formulario.</p></ClerkFailed>

        <ClerkLoaded>
          <div className={styles.clerkPanel}>
            <SignUp
              routing="path"
              path="/register"
              signInUrl="/login"
              fallbackRedirectUrl="/onboarding"
              appearance={{
                variables: {
                  colorPrimary: '#7e0827',
                  colorText: '#17121a',
                  colorTextSecondary: '#5f5b63',
                  colorBackground: '#ffffff',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#17121a',
                  borderRadius: '7px',
                  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                },
                elements: {
                  rootBox: {
                    width: '100%',
                  },
                  cardBox: {
                    width: '100%',
                    maxWidth: '100%',
                    boxShadow: 'none',
                  },
                  card: {
                    width: '100%',
                    maxWidth: '100%',
                    boxShadow: 'none',
                    borderRadius: '0',
                    border: 'none',
                    padding: '0',
                    background: 'transparent',
                  },
                  header: { display: 'none' },
                  headerTitle: { display: 'none' },
                  headerSubtitle: { display: 'none' },
                  formButtonPrimary: {
                    background: 'linear-gradient(180deg, #8a0828 0%, #67051e 100%)',
                    color: '#ffffff',
                    borderRadius: '7px',
                    fontSize: '14px',
                    fontWeight: '600',
                    minHeight: '40px',
                    width: '100%',
                    boxShadow: '0 9px 18px rgba(93, 4, 26, 0.18)',
                  },
                  footer: {
                    background: 'transparent',
                    padding: '18px 0 0',
                  },
                  footerActionLink: {
                    color: '#7e0827',
                    fontWeight: '700',
                  },
                },
              }}
            />
          </div>
        </ClerkLoaded>
      </div>
    </div>
  )
}

export default Register
