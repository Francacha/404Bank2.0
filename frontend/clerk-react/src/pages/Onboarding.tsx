import { useState } from 'react';
import { useAuth } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import styles from './Onboarding.module.css';
import logo404Bank from '../assets/404log.png';

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img className={styles.logo} src={logo404Bank} alt="404Bank" />
        <h1 className={styles.title}>Completá tu perfil</h1>
        <p className={styles.subtitle}>
          Necesitamos algunos datos para abrir tu cuenta en 404Bank.
        </p>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <p className={styles.sectionTitle}>Datos personales</p>
          <div className={styles.group}>
            <div>
              <label className={styles.label}>Nombre *</label>
              <input className={styles.input} name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>Apellido *</label>
              <input className={styles.input} name="apellido" value={form.apellido} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>DNI *</label>
              <input className={styles.input} name="dni" value={form.dni} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>Fecha de nacimiento</label>
              <input className={styles.input} type="date" name="fechaNac" value={form.fechaNac} onChange={handleChange} />
            </div>
          </div>

          <p className={styles.sectionTitle}>Contacto</p>
          <div className={styles.group}>
            <div>
              <label className={styles.label}>Email *</label>
              <input className={styles.input} type="email" name="email" value={form.email} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>Teléfono</label>
              <input className={styles.input} name="telefono" value={form.telefono} onChange={handleChange} />
            </div>
          </div>

          <p className={styles.sectionTitle}>Domicilio</p>
          <div className={styles.directionField}>
            <label className={styles.label}>Dirección</label>
            <input className={styles.input} name="direccion" value={form.direccion} onChange={handleChange} />
          </div>
          <div className={styles.group}>
            <div>
              <label className={styles.label}>Ciudad *</label>
              <input className={styles.input} name="ciudad" value={form.ciudad} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>Provincia *</label>
              <input className={styles.input} name="provincia" value={form.provincia} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>País *</label>
              <input className={styles.input} name="pais" value={form.pais} onChange={handleChange} required />
            </div>
            <div>
              <label className={styles.label}>Código postal</label>
              <input className={styles.input} name="codigoPostal" value={form.codigoPostal} onChange={handleChange} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.submitBtn} ${loading ? styles.submitBtnLoading : ''}`}
          >
            {loading ? 'Guardando...' : 'Crear mi cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Onboarding;
