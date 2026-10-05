import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth, useUser } from "@clerk/react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

type FormData = {
  nombre: string;
  apellido: string;
  dni: string;
  direccion: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
};

type FormErrors = Partial<Record<keyof FormData, string>>;

export default function UserForm() {
  const { user } = useUser();
  const { getToken, isLoaded: isAuthLoaded } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    nombre: "",
    apellido: "",
    dni: "",
    direccion: "",
    email: "",
    telefono: "",
    fecha_nacimiento: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email) {
      setFormData((prev) => ({ ...prev, email: prev.email || email }));
    }
  }, [user]);

  const validate = (): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.nombre.trim()) newErrors.nombre = "El nombre es requerido";
    if (!formData.apellido.trim()) newErrors.apellido = "El apellido es requerido";
    if (!formData.dni.trim()) newErrors.dni = "El DNI es requerido";
    else if (!/^\d{7,8}$/.test(formData.dni)) newErrors.dni = "DNI invalido (7-8 digitos)";
    if (!formData.direccion.trim()) newErrors.direccion = "La direccion es requerida";
    if (!formData.email.trim()) newErrors.email = "El email es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Email invalido";
    if (!formData.telefono.trim()) newErrors.telefono = "El telefono es requerido";
    else if (!/^\+?[\d\s-]{8,15}$/.test(formData.telefono)) newErrors.telefono = "Telefono invalido";
    if (!formData.fecha_nacimiento) newErrors.fecha_nacimiento = "La fecha de nacimiento es requerida";

    return newErrors;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fieldName = e.target.name as keyof FormData;
    const { value } = e.target;

    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: "" }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setSubmitError("");

    try {
      if (!isAuthLoaded) {
        throw new Error("La sesion aun se esta cargando");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("No se pudo obtener el token de Clerk");
      }

      const response = await fetch(`${API_URL}/api/onboarding/completar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          dni: formData.dni,
          direccion: formData.direccion,
          email: formData.email,
          telefono: formData.telefono,
          fechaNac: formData.fecha_nacimiento,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Error al guardar los datos");
      }

      navigate("/home");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Ocurrio un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .uf-root {
          min-height: 100vh;
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          font-family: 'DM Sans', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .uf-root::before {
          content: '';
          position: fixed;
          top: -30%;
          right: -20%;
          width: 700px;
          height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(99, 76, 175, 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .uf-root::after {
          content: '';
          position: fixed;
          bottom: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 130, 210, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .uf-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 24px;
          padding: 48px 52px;
          width: 100%;
          max-width: 680px;
          backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
          animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .uf-header {
          margin-bottom: 40px;
          text-align: center;
        }

        .uf-eyebrow {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #7c6ae0;
          margin-bottom: 10px;
        }

        .uf-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 600;
          color: #f0eeff;
          line-height: 1.2;
          margin-bottom: 10px;
        }

        .uf-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.35);
          font-weight: 300;
        }

        .uf-divider {
          width: 40px;
          height: 1px;
          background: linear-gradient(90deg, transparent, #7c6ae0, transparent);
          margin: 18px auto 0;
        }

        .uf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .uf-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
          animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .uf-field:nth-child(1) { animation-delay: 0.05s; }
        .uf-field:nth-child(2) { animation-delay: 0.10s; }
        .uf-field:nth-child(3) { animation-delay: 0.15s; }
        .uf-field:nth-child(4) { animation-delay: 0.20s; }
        .uf-field:nth-child(5) { animation-delay: 0.25s; }
        .uf-field:nth-child(6) { animation-delay: 0.30s; }
        .uf-field:nth-child(7) { animation-delay: 0.35s; }

        .uf-field.full { grid-column: 1 / -1; }

        .uf-label {
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
        }

        .uf-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          padding: 13px 16px;
          font-size: 14.5px;
          font-family: 'DM Sans', sans-serif;
          color: #f0eeff;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          width: 100%;
          outline: none;
        }

        .uf-input::placeholder { color: rgba(255,255,255,0.2); }

        .uf-input:focus {
          border-color: rgba(124, 106, 224, 0.6);
          background: rgba(124, 106, 224, 0.06);
          box-shadow: 0 0 0 3px rgba(124, 106, 224, 0.1);
        }

        .uf-input.error {
          border-color: rgba(244, 95, 95, 0.5);
          background: rgba(244, 95, 95, 0.04);
        }

        .uf-input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(0.5);
          cursor: pointer;
        }

        .uf-error-msg {
          font-size: 12px;
          color: #f47171;
          font-weight: 400;
        }

        .uf-submit-error {
          background: rgba(244, 95, 95, 0.08);
          border: 1px solid rgba(244, 95, 95, 0.2);
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13.5px;
          color: #f47171;
          text-align: center;
          margin-top: 4px;
          grid-column: 1 / -1;
        }

        .uf-btn {
          margin-top: 32px;
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #7c6ae0, #5a4fcf);
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          letter-spacing: 0.5px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 8px 30px rgba(124, 106, 224, 0.3);
        }

        .uf-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .uf-btn:hover:not(:disabled)::before { opacity: 1; }
        .uf-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 40px rgba(124, 106, 224, 0.4); }
        .uf-btn:active:not(:disabled) { transform: translateY(0); }
        .uf-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        .uf-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .uf-user-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(124, 106, 224, 0.1);
          border: 1px solid rgba(124, 106, 224, 0.2);
          border-radius: 999px;
          padding: 5px 14px 5px 8px;
          font-size: 12.5px;
          color: rgba(255,255,255,0.6);
          margin-bottom: 28px;
        }

        .uf-user-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c6ae0, #3882d2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: #fff;
        }

        @media (max-width: 560px) {
          .uf-card { padding: 32px 24px; }
          .uf-grid { grid-template-columns: 1fr; }
          .uf-field.full { grid-column: 1; }
          .uf-title { font-size: 26px; }
        }
      `}</style>

      <div className="uf-root">
        <div className="uf-card">
          <div className="uf-header">
            {user && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                <div className="uf-user-chip">
                  <div className="uf-user-avatar">
                    {user.firstName?.[0] || user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || "U"}
                  </div>
                  {user.primaryEmailAddress?.emailAddress}
                </div>
              </div>
            )}
            <p className="uf-eyebrow">Bienvenido</p>
            <h1 className="uf-title">Completa tu perfil</h1>
            <p className="uf-subtitle">Necesitamos algunos datos para comenzar</p>
            <div className="uf-divider" />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="uf-grid">
              <div className="uf-field">
                <label className="uf-label" htmlFor="nombre">Nombre</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  className={`uf-input${errors.nombre ? " error" : ""}`}
                  placeholder="Ej: Juan"
                  value={formData.nombre}
                  onChange={handleChange}
                  autoComplete="given-name"
                />
                {errors.nombre && <span className="uf-error-msg">{errors.nombre}</span>}
              </div>

              <div className="uf-field">
                <label className="uf-label" htmlFor="apellido">Apellido</label>
                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  className={`uf-input${errors.apellido ? " error" : ""}`}
                  placeholder="Ej: Garcia"
                  value={formData.apellido}
                  onChange={handleChange}
                  autoComplete="family-name"
                />
                {errors.apellido && <span className="uf-error-msg">{errors.apellido}</span>}
              </div>

              <div className="uf-field">
                <label className="uf-label" htmlFor="dni">DNI</label>
                <input
                  id="dni"
                  name="dni"
                  type="text"
                  className={`uf-input${errors.dni ? " error" : ""}`}
                  placeholder="Ej: 38456789"
                  value={formData.dni}
                  onChange={handleChange}
                  maxLength={8}
                />
                {errors.dni && <span className="uf-error-msg">{errors.dni}</span>}
              </div>

              <div className="uf-field">
                <label className="uf-label" htmlFor="telefono">Telefono</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  className={`uf-input${errors.telefono ? " error" : ""}`}
                  placeholder="Ej: +54 9 351 123 4567"
                  value={formData.telefono}
                  onChange={handleChange}
                  autoComplete="tel"
                />
                {errors.telefono && <span className="uf-error-msg">{errors.telefono}</span>}
              </div>

              <div className="uf-field full">
                <label className="uf-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className={`uf-input${errors.email ? " error" : ""}`}
                  placeholder="Ej: juan@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                {errors.email && <span className="uf-error-msg">{errors.email}</span>}
              </div>

              <div className="uf-field full">
                <label className="uf-label" htmlFor="direccion">Direccion</label>
                <input
                  id="direccion"
                  name="direccion"
                  type="text"
                  className={`uf-input${errors.direccion ? " error" : ""}`}
                  placeholder="Ej: Av. Colon 1234, Cordoba"
                  value={formData.direccion}
                  onChange={handleChange}
                  autoComplete="street-address"
                />
                {errors.direccion && <span className="uf-error-msg">{errors.direccion}</span>}
              </div>

              <div className="uf-field full">
                <label className="uf-label" htmlFor="fecha_nacimiento">Fecha de Nacimiento</label>
                <input
                  id="fecha_nacimiento"
                  name="fecha_nacimiento"
                  type="date"
                  className={`uf-input${errors.fecha_nacimiento ? " error" : ""}`}
                  value={formData.fecha_nacimiento}
                  onChange={handleChange}
                  max={new Date().toISOString().split("T")[0]}
                />
                {errors.fecha_nacimiento && <span className="uf-error-msg">{errors.fecha_nacimiento}</span>}
              </div>

              {submitError && <div className="uf-submit-error">{submitError}</div>}
            </div>

            <button type="submit" className="uf-btn" disabled={loading}>
              {loading && <span className="uf-spinner" />}
              {loading ? "Guardando..." : "Guardar y continuar ->"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
