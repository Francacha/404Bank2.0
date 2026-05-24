import { useUser } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

type Props = {
  role: string;
  children: ReactNode;
};

// Verifica que el usuario tenga el rol requerido.
// Si no lo tiene → redirige al login.
// Si lo tiene → muestra el contenido.
function RoleGuard({ role, children }: Props) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>Verificando permisos...</p>
      </div>
    );
  }

  const userRole = user?.publicMetadata?.role as string | undefined;

  if (userRole !== role) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default RoleGuard;
