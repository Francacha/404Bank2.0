import { useUser } from '@clerk/react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import PantallaCarga from './PantallaCarga';

type Props = {
  role: string;
  children: ReactNode;
};

// Verifica que el usuario tenga el rol requerido. El admin entra a todos los paneles,
// igual que lo permite el backend. Sin el rol, se explica en vez de mandar al login
// (la persona ya inició sesión: el problema es el permiso, no la sesión).
function RoleGuard({ role, children }: Props) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <PantallaCarga mensaje="Verificando permisos…" />;

  const userRole = user?.publicMetadata?.role as string | undefined;
  if (userRole === role || userRole === 'admin') return <>{children}</>;

  return (
    <main
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#f4f2ee',
        fontFamily: "'Manrope', 'Segoe UI', Arial, sans-serif",
        color: '#1a1512',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Esta sección es para el personal del banco</p>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: '#6f665e' }}>
          Tu usuario no tiene el rol necesario. Si creés que es un error, pedíselo a un administrador.
        </p>
        <Link to="/home" style={{ marginTop: 8, color: '#7a1128', fontWeight: 800 }}>Volver a mi cuenta</Link>
      </div>
    </main>
  );
}

export default RoleGuard;
