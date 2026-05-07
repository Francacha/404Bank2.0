import { SignOutButton } from "@clerk/react";


function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        backgroundColor: '#f4f7fb',
        fontFamily: 'Arial, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '100%',
        }}
      >
        <h1 style={{ marginBottom: '12px', color: '#1f3b73' }}>
          Bienvenido a tu Homebanking
        </h1>v
        <p style={{ margin: 0, color: '#4b5563' }}>
          La autenticacion funciona correctamente y ya estas dentro del area privada.
        </p>
      </div>
      <SignOutButton signOutOptions={{ redirectUrl: '/login' }} >
        <button style={{
          backgroundColor: '#d73a49',
          color: '#ffffff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
        }}>
          Cerrar Sesión
        </button>
      </SignOutButton>
    </div>
  )
}

export default Home
