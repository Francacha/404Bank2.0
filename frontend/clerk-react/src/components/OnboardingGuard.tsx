import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const API_URL = 'http://localhost:3000';

type Props = {
  children: ReactNode;
};

function OnboardingGuard({ children }: Props) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);

  const role = user?.publicMetadata?.role as string | undefined;

  useEffect(() => {
    // Si es admin no necesita verificar perfil
    if (role === 'admin') return;

    const verificar = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/onboarding/verificar`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setTienePerfil(data.tienePerfil);
      } catch {
        setTienePerfil(false);
      }
    };
    verificar();
  }, [getToken, role]);

  // Admin va directo a su panel, nunca ve páginas de cliente
  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (tienePerfil === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>Verificando tu perfil...</p>
      </div>
    );
  }

  if (!tienePerfil) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default OnboardingGuard;
