import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const API_URL = 'http://localhost:3000';

type Props = {
  children: ReactNode;
};

// Verifica si el usuario ya completó el onboarding.
// Si no lo hizo → lo redirige a /onboarding.
// Si ya lo hizo → muestra la página normalmente.
function OnboardingGuard({ children }: Props) {
  const { getToken } = useAuth();
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);

  useEffect(() => {
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
  }, [getToken]);

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
