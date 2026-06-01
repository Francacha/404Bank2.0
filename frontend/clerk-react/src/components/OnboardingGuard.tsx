import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useViewMode } from '../context/ViewModeContext';

const API_URL = 'http://localhost:3000';

type Props = {
  children: ReactNode;
};

const ROLES_LABORALES = ['empleado', 'gerente'];

function OnboardingGuard({ children }: Props) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { viewMode } = useViewMode();
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);

  const role = user?.publicMetadata?.role as string | undefined;

  // Determina si hay que chequear perfil: admin nunca, laborales solo en modo cliente
  const debeChequearPerfil =
    role !== 'admin' &&
    !(role && ROLES_LABORALES.includes(role) && viewMode === 'work');

  useEffect(() => {
    if (!debeChequearPerfil) return;

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
  }, [getToken, debeChequearPerfil]);

  // Admin siempre va a su panel
  if (role === 'admin') return <Navigate to="/admin" replace />;

  // Laborales en modo trabajo van a su panel
  if (role === 'empleado' && viewMode === 'work') return <Navigate to="/empleado" replace />;
  if (role === 'gerente'  && viewMode === 'work') return <Navigate to="/gerente"  replace />;

  // Para clientes puros y laborales en modo cliente: verificar perfil
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
