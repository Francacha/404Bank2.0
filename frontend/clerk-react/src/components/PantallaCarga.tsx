// Pantalla de espera entre rutas (sesión y perfil): papel y tinta del sistema, nunca texto suelto sobre blanco.
function PantallaCarga({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="status"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#f4f2ee',
        color: '#6f665e',
        fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif",
        fontSize: '15px',
        fontWeight: 600,
        textAlign: 'center',
      }}
    >
      <p style={{ margin: 0, maxWidth: '36ch' }}>{mensaje}</p>
    </div>
  );
}

export default PantallaCarga;
