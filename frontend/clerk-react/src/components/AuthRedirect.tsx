import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import { Navigate, useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function AuthRedirect() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const token = await getToken();

        if (!token) {
          setError("No se pudo validar la sesion con Clerk.");
          return;
        }

        const response = await fetch(`${API_URL}/api/onboarding/verificar`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "No se pudo verificar el perfil.");
        }

        const data = await response.json();
        navigate(data.tienePerfil ? "/home" : "/completar-perfil", { replace: true });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrio un error validando la sesion.");
      }
    };

    if (isLoaded && isSignedIn) {
      void checkProfile();
    }
  }, [getToken, isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return <p>Cargando...</p>;
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return <p>Validando tu perfil...</p>;
}

export default AuthRedirect;
