import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import styles from './Onboarding.module.css';
import logo404Bank from '../assets/404log.png';

const API_URL = 'http://localhost:3000';
const GEO_API_URL = 'https://countriesnow.space/api/v0.1';

function Onboarding() {
  const { getToken } = useAuth();
  const { user } = useUser();
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

  const [paises, setPaises] = useState<string[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [ciudades, setCiudades] = useState<string[]>([]);
  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingCiudades, setLoadingCiudades] = useState(false);

  // Al montar, traemos la lista completa de países desde la API.
  useEffect(() => {
    const fetchPaises = async () => {
      setLoadingPaises(true);
      try {
        const res = await fetch(`${GEO_API_URL}/countries/iso`);
        const data = await res.json();
        const nombres = (data?.data || [])
          .map((c: { name: string }) => c.name)
          .sort((a: string, b: string) => a.localeCompare(b));
        setPaises(nombres);
      } catch {
        setPaises([]);
      } finally {
        setLoadingPaises(false);
      }
    };

    fetchPaises();
  }, []);

  // Cuando cambia el país, traemos sus provincias/estados desde la API.
  useEffect(() => {
    if (!form.pais) {
      setProvincias([]);
      return;
    }

    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const res = await fetch(`${GEO_API_URL}/countries/states`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.pais }),
        });
        const data = await res.json();
        const nombres = (data?.data?.states || []).map((s: { name: string }) => s.name);
        setProvincias(nombres);
      } catch {
        setProvincias([]);
      } finally {
        setLoadingProvincias(false);
      }
    };

    fetchProvincias();
  }, [form.pais]);

  // Cuando cambia la provincia, traemos sus ciudades desde la API.
  useEffect(() => {
    if (!form.pais || !form.provincia) {
      setCiudades([]);
      return;
    }

    const fetchCiudades = async () => {
      setLoadingCiudades(true);
      try {
        const res = await fetch(`${GEO_API_URL}/countries/state/cities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.pais, state: form.provincia }),
        });
        const data = await res.json();
        setCiudades(data?.data || []);
      } catch {
        setCiudades([]);
      } finally {
        setLoadingCiudades(false);
      }
    };

    fetchCiudades();
  }, [form.pais, form.provincia]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'pais') {
      setForm({ ...form, pais: value, provincia: '', ciudad: '' });
      return;
    }

    if (name === 'provincia') {
      setForm({ ...form, provincia: value, ciudad: '' });
      return;
    }

    setForm({ ...form, [name]: value });
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

      await user?.update({ firstName: form.nombre, lastName: form.apellido });

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
              <label className={styles.label}>País *</label>
              <select className={styles.input} name="pais" value={form.pais} onChange={handleChange} disabled={loadingPaises} required>
                <option value="">{loadingPaises ? 'Cargando países...' : 'Seleccioná un país'}</option>
                {paises.map((pais) => (
                  <option key={pais} value={pais}>{pais}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>Provincia *</label>
              <select className={styles.input} name="provincia" value={form.provincia} onChange={handleChange} disabled={!form.pais || loadingProvincias} required>
                <option value="">{loadingProvincias ? 'Cargando provincias...' : 'Seleccioná una provincia'}</option>
                {provincias.map((provincia) => (
                  <option key={provincia} value={provincia}>{provincia}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={styles.label}>Ciudad *</label>
              <select className={styles.input} name="ciudad" value={form.ciudad} onChange={handleChange} disabled={!form.provincia || loadingCiudades} required>
                <option value="">{loadingCiudades ? 'Cargando ciudades...' : 'Seleccioná una ciudad'}</option>
                {ciudades.map((ciudad) => (
                  <option key={ciudad} value={ciudad}>{ciudad}</option>
                ))}
              </select>
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