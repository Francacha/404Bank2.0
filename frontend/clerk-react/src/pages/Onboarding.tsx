import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

function Onboarding() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    telefono: '',
    fechaNac: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    pais: '',
    codigoPostal: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/onboarding/completar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el perfil');

      navigate('/home');
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '4px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  };

  const groupStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1f3b73',
    marginBottom: '12px',
    marginTop: '24px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '6px',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f4f7fb',
        fontFamily: 'Arial, sans-serif',
        padding: '40px 24px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '36px',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ color: '#1f3b73', marginBottom: '4px', fontSize: '22px' }}>
          Completá tu perfil
        </h1>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '8px' }}>
          Necesitamos algunos datos para abrir tu cuenta en 404Bank.
        </p>

        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <p style={sectionTitleStyle}>Datos personales</p>
          <div style={groupStyle}>
            <div>
              <label style={labelStyle}>Nombre *</label>
              <input style={inputStyle} name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Apellido *</label>
              <input style={inputStyle} name="apellido" value={form.apellido} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>DNI *</label>
              <input style={inputStyle} name="dni" value={form.dni} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Fecha de nacimiento</label>
              <input style={inputStyle} type="date" name="fechaNac" value={form.fechaNac} onChange={handleChange} />
            </div>
          </div>

          <p style={sectionTitleStyle}>Contacto</p>
          <div style={groupStyle}>
            <div>
              <label style={labelStyle}>Email *</label>
              <input style={inputStyle} type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
          </div>

          <p style={sectionTitleStyle}>Domicilio</p>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Dirección</label>
            <input style={inputStyle} name="direccion" value={form.direccion} onChange={handleChange} />
          </div>
          <div style={groupStyle}>
            <div>
              <label style={labelStyle}>Ciudad *</label>
              <input style={inputStyle} name="ciudad" value={form.ciudad} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Provincia *</label>
              <input style={inputStyle} name="provincia" value={form.provincia} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>País *</label>
              <input style={inputStyle} name="pais" value={form.pais} onChange={handleChange} required />
            </div>
            <div>
              <label style={labelStyle}>Código postal</label>
              <input style={inputStyle} name="codigoPostal" value={form.codigoPostal} onChange={handleChange} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '28px',
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#1f3b73',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Guardando...' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Onboarding;
