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
  const { getToken, isLoaded: isAuthLoaded, isSignedIn, signOut } = useAuth();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { viewMode } = useViewMode();
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);
  const [errorVerificacion, setErrorVerificacion] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  const role = user?.publicMetadata?.role as string | undefined;

  // Determina si hay que chequear perfil: admin nunca, laborales solo en modo cliente.
  const debeChequearPerfil =
    role !== 'admin' &&
    !(role && ROLES_LABORALES.includes(role) && viewMode === 'work');

  useEffect(() => {
    if (!debeChequearPerfil || !isAuthLoaded || !isUserLoaded || !isSignedIn) return;

    let cancelado = false;

    const verificar = async () => {
      try {
        setErrorVerificacion(null);
        const token = await getToken();
        if (!token) {
          throw new Error('No se pudo obtener el token de sesión. Cerrá sesión e ingresá nuevamente.');
        }

        const res = await fetch(`${API_URL}/api/onboarding/verificar`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `No se pudo verificar el perfil (HTTP ${res.status}).`);
        }

        const data = await res.json();
        if (typeof data.tienePerfil !== 'boolean') {
          throw new Error('Respuesta de perfil inválida.');
        }

        if (!cancelado) setTienePerfil(data.tienePerfil);
      } catch (error) {
        // No inferimos que el perfil no existe frente a un error de red o sesión.
        if (!cancelado) {
          setErrorVerificacion(error instanceof Error ? error.message : 'No se pudo verificar el perfil.');
        }
      }
    };
    verificar();

    return () => {
      cancelado = true;
    };
  }, [getToken, debeChequearPerfil, isAuthLoaded, isSignedIn, isUserLoaded, user?.id, intento]);

  // Admin siempre va a su panel.
  if (role === 'admin') return <Navigate to="/admin" replace />;

  // Laborales en modo trabajo van a su panel.
  if (role === 'empleado' && viewMode === 'work') return <Navigate to="/empleado" replace />;
  if (role === 'gerente' && viewMode === 'work') return <Navigate to="/gerente" replace />;

  if (!isAuthLoaded || !isUserLoaded) {
    return <LoadingProfile />;
  }

  if (errorVerificacion) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <p>{errorVerificacion}</p>
          <button type="button" onClick={() => setIntento((valor) => valor + 1)}>Reintentar</button>
          <button
            type="button"
            style={{ marginLeft: 12 }}
            onClick={() => void signOut({ redirectUrl: '/login' })}
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (tienePerfil === null) return <LoadingProfile />;

  if (onlyIncomplete && tienePerfil) return <Navigate to="/home" replace />;

  if (!tienePerfil) {
    return onlyIncomplete ? <>{children}</> : <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function LoadingProfile() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <p>Verificando tu perfil...</p>
    </div>
  );
}

export default OnboardingGuard;
