import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useViewMode } from '../context/ViewModeContext';

const API_URL = 'http://localhost:3000';

type Props = {
  children: ReactNode;
  // En la ruta de onboarding se invierte la condición: si ya hay perfil,
  // el usuario vuelve a su cuenta en vez de completar el formulario otra vez.
  onlyIncomplete?: boolean;
};

const ROLES_LABORALES = ['empleado', 'gerente'];

function OnboardingGuard({ children, onlyIncomplete = false }: Props) {
  const { getToken, isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { viewMode } = useViewMode();
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);
  const [errorVerificacion, setErrorVerificacion] = useState(false);

  const role = user?.publicMetadata?.role as string | undefined;

  // Determina si hay que chequear perfil: admin nunca, laborales solo en modo cliente
  const debeChequearPerfil =
    role !== 'admin' &&
    !(role && ROLES_LABORALES.includes(role) && viewMode === 'work');

  useEffect(() => {
    if (!debeChequearPerfil || !isAuthLoaded || !isUserLoaded || !isSignedIn) return;

    let cancelado = false;

    const verificar = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error('No se pudo obtener el token de sesión');

        const res = await fetch(`${API_URL}/api/onboarding/verificar`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('No se pudo verificar el perfil');

        const data = await res.json();
        if (typeof data.tienePerfil !== 'boolean') {
          throw new Error('Respuesta de perfil inválida');
        }

        if (!cancelado) setTienePerfil(data.tienePerfil);
      } catch {
        // Un problema de autenticación o de red no significa que el perfil no exista.
        // Así evitamos redirigir erróneamente a onboarding.
        if (!cancelado) setErrorVerificacion(true);
      }
    };
    verificar();

    return () => {
      cancelado = true;
    };
  }, [getToken, debeChequearPerfil, isAuthLoaded, isSignedIn, isUserLoaded, user?.id]);

  // Admin siempre va a su panel
  if (role === 'admin') return <Navigate to="/admin" replace />;

  // Laborales en modo trabajo van a su panel
  if (role === 'empleado' && viewMode === 'work') return <Navigate to="/empleado" replace />;
  if (role === 'gerente'  && viewMode === 'work') return <Navigate to="/gerente"  replace />;

  // Para clientes puros y laborales en modo cliente: verificar perfil
  if (!isAuthLoaded || !isUserLoaded || tienePerfil === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <p>{errorVerificacion ? 'No pudimos verificar tu perfil. Recargá la página e intentá nuevamente.' : 'Verificando tu perfil...'}</p>
      </div>
    );
  }

  if (onlyIncomplete && tienePerfil) return <Navigate to="/home" replace />;

  if (!tienePerfil) {
    return onlyIncomplete ? <>{children}</> : <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

export default OnboardingGuard;
