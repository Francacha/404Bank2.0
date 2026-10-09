import { useEffect, useRef, useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import styles from './Onboarding.module.css';

const API_URL = 'http://localhost:3000';

// Lista local: el alta no depende de ninguna API externa para conocer las provincias.
const PROVINCIAS = [
  'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba',
  'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones',
  'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe',
  'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

type Campo = 'nombre' | 'apellido' | 'dni' | 'fechaNac' | 'email' | 'telefono' | 'direccion' | 'provincia' | 'ciudad' | 'codigoPostal';

interface CuentaCreada {
  cbu: string;
  alias: string | null;
}

// Fecha máxima de nacimiento: hay que tener 18 años para abrir la cuenta.
const hoy = new Date();
const FECHA_MAXIMA = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate()).toISOString().slice(0, 10);

const validar = (form: Record<Campo, string>): Partial<Record<Campo, string>> => {
  const errores: Partial<Record<Campo, string>> = {};
  if (!form.nombre.trim()) errores.nombre = 'Escribí tu nombre.';
  if (!form.apellido.trim()) errores.apellido = 'Escribí tu apellido.';
  if (!/^\d{7,8}$/.test(form.dni)) errores.dni = 'El DNI tiene 7 u 8 números, sin puntos.';
  if (form.fechaNac && form.fechaNac > FECHA_MAXIMA) errores.fechaNac = 'Tenés que ser mayor de 18 años para abrir la cuenta.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errores.email = 'Revisá el email: tiene que tener la forma nombre@dominio.com.';
  if (form.telefono && !/^[\d\s+()-]{8,}$/.test(form.telefono)) errores.telefono = 'Revisá el teléfono: usá solo números, con código de área.';
  if (!form.provincia) errores.provincia = 'Elegí tu provincia.';
  if (!form.ciudad.trim()) errores.ciudad = 'Escribí tu ciudad o localidad.';
  return errores;
};

const ORDEN: Campo[] = ['nombre', 'apellido', 'dni', 'fechaNac', 'email', 'telefono', 'direccion', 'provincia', 'ciudad', 'codigoPostal'];

function Onboarding() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [form, setForm] = useState<Record<Campo, string>>({
    nombre: '', apellido: '', dni: '', fechaNac: '', email: '', telefono: '',
    direccion: '', provincia: '', ciudad: '', codigoPostal: '',
  });
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [loading, setLoading] = useState(false);
  const [cuenta, setCuenta] = useState<CuentaCreada | null>(null);
  const [copiado, setCopiado] = useState<'cbu' | 'alias' | null>(null);
  const [errorCopia, setErrorCopia] = useState(false);
  const exitoRef = useRef<HTMLHeadingElement>(null);
  const emailPrecargado = useRef(false);

  // El email ya se cargó al registrarse: lo traemos de Clerk para no pedirlo dos veces.
  useEffect(() => {
    const email = user?.primaryEmailAddress?.emailAddress;
    if (email && !emailPrecargado.current) {
      emailPrecargado.current = true;
      setForm(f => (f.email ? f : { ...f, email }));
    }
  }, [user]);

  useEffect(() => {
    if (cuenta) exitoRef.current?.focus();
  }, [cuenta]);

  useEffect(() => {
    if (!copiado) return;
    const timer = setTimeout(() => setCopiado(null), 1800);
    return () => clearTimeout(timer);
  }, [copiado]);

  const cambiar = (campo: Campo, valor: string) => {
    setForm(f => ({ ...f, [campo]: valor }));
    if (errores[campo]) setErrores(e => ({ ...e, [campo]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorEnvio('');
    const nuevosErrores = validar(form);
    setErrores(nuevosErrores);
    const primerError = ORDEN.find(c => nuevosErrores[c]);
    if (primerError) {
      document.getElementById(`campo-${primerError}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const datos = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
      const res = await fetch(`${API_URL}/api/onboarding/completar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ...datos, pais: 'Argentina' }),
      });

      let data: { error?: string; cbu?: string; alias?: string | null } = {};
      try {
        data = await res.json();
      } catch {
        // Sin JSON (p. ej. un error del proxy): se informa con el código de estado.
      }

      if (!res.ok) {
        if (res.status === 409) throw new Error('Ese DNI ya tiene una cuenta en 404Bank, o tu perfil ya estaba completo.');
        if (res.status === 502) throw new Error('El Banco Central (simulado) no respondió. Tus datos siguen acá: probá de nuevo en un momento.');
        throw new Error(data.error || 'No pudimos crear tu cuenta. Tus datos siguen acá: probá de nuevo.');
      }

      // El nombre en Clerk es un extra: si falla, la cuenta ya está creada igual.
      user?.update({ firstName: datos.nombre, lastName: datos.apellido }).catch(() => {});

      setCuenta({ cbu: data.cbu ?? '', alias: data.alias ?? null });
    } catch (err: unknown) {
      if (err instanceof TypeError) setErrorEnvio('No pudimos conectar con 404Bank. Revisá tu conexión: tus datos siguen acá.');
      else if (err instanceof Error) setErrorEnvio(err.message);
      else setErrorEnvio('No pudimos crear tu cuenta. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const copiar = async (texto: string, cual: 'cbu' | 'alias') => {
    setErrorCopia(false);
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(cual);
    } catch {
      setErrorCopia(true);
    }
  };

  const ayuda = (campo: Campo) => (errores[campo] ? `error-${campo}` : undefined);
  const error = (campo: Campo) =>
    errores[campo] ? <p id={`error-${campo}`} className={styles.errorCampo}>{errores[campo]}</p> : null;

  // ── Cuenta creada: el momento que promete la Landing (paso 3) ──
  if (cuenta) {
    return (
      <AuthShell
        title="¡Listo, tu cuenta está abierta!"
        paso={3}
        mensajeBan="¡Bienvenido a 404Bank! Ya podés recibir plata con tu alias."
      >
        <div className={styles.exito}>
          <h2 ref={exitoRef} tabIndex={-1} className={styles.exitoTitulo}>Estos son los datos de tu cuenta en pesos</h2>
          <p className={styles.exitoTexto}>Pasáselos a quien te quiera transferir. Los vas a ver siempre en tu Inicio.</p>

          <dl className={styles.datosCuenta}>
            <div className={styles.datoCuenta}>
              <dt>Alias</dt>
              <dd>
                {cuenta.alias ? (
                  <>
                    <span className={styles.pill}>{cuenta.alias}</span>
                    <button type="button" className={styles.btnCopiar} onClick={() => copiar(cuenta.alias!, 'alias')}>
                      {copiado === 'alias' ? 'Copiado' : 'Copiar'}
                      <span className={styles.srOnly}> alias</span>
                    </button>
                  </>
                ) : (
                  <span className={styles.sinAlias}>Todavía no tenés alias asignado. Mientras tanto, usá tu CBU.</span>
                )}
              </dd>
            </div>
            <div className={styles.datoCuenta}>
              <dt>CBU</dt>
              <dd>
                <span className={`${styles.pill} ${styles.pillMono}`}>{cuenta.cbu}</span>
                <button type="button" className={styles.btnCopiar} onClick={() => copiar(cuenta.cbu, 'cbu')}>
                  {copiado === 'cbu' ? 'Copiado' : 'Copiar'}
                  <span className={styles.srOnly}> CBU</span>
                </button>
              </dd>
            </div>
          </dl>
          <p className={styles.srOnly} aria-live="polite">
            {copiado === 'alias' ? 'Alias copiado' : copiado === 'cbu' ? 'CBU copiado' : ''}
          </p>
          {errorCopia && (
            <p className={styles.errorCampo} role="alert">No pudimos copiar. Mantené apretado el dato para seleccionarlo.</p>
          )}

          <button type="button" className={styles.btnPrincipal} onClick={() => navigate('/home', { replace: true })}>
            Ir a mi cuenta
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Completá tus datos"
      subtitle="Con esto abrimos tu cuenta en pesos y te asignamos CBU y alias. Es un banco simulado: los datos se usan solo dentro de 404Bank."
      paso={2}
      mensajeBan="Te lleva un par de minutos. Después ya tenés tu cuenta."
      ancho
    >
      <form onSubmit={handleSubmit} noValidate className={styles.form}>
        <fieldset className={styles.seccion}>
          <legend className={styles.leyenda}>Datos personales</legend>
          <p className={styles.porque}>Tu DNI identifica la cuenta ante el Banco Central (simulado).</p>
          <div className={styles.grilla}>
            <div className={styles.campo}>
              <label htmlFor="campo-nombre" className={styles.label}>Nombre</label>
              <input id="campo-nombre" className={styles.input} autoComplete="given-name" value={form.nombre}
                onChange={e => cambiar('nombre', e.target.value)} aria-invalid={!!errores.nombre} aria-describedby={ayuda('nombre')} />
              {error('nombre')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-apellido" className={styles.label}>Apellido</label>
              <input id="campo-apellido" className={styles.input} autoComplete="family-name" value={form.apellido}
                onChange={e => cambiar('apellido', e.target.value)} aria-invalid={!!errores.apellido} aria-describedby={ayuda('apellido')} />
              {error('apellido')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-dni" className={styles.label}>DNI</label>
              <input id="campo-dni" className={styles.input} inputMode="numeric" autoComplete="off" maxLength={8}
                placeholder="Sin puntos" value={form.dni}
                onChange={e => cambiar('dni', e.target.value.replace(/\D/g, ''))}
                aria-invalid={!!errores.dni} aria-describedby={ayuda('dni')} />
              {error('dni')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-fechaNac" className={styles.label}>
                Fecha de nacimiento <span className={styles.opcional}>(opcional)</span>
              </label>
              <input id="campo-fechaNac" className={styles.input} type="date" autoComplete="bday" max={FECHA_MAXIMA}
                value={form.fechaNac} onChange={e => cambiar('fechaNac', e.target.value)}
                aria-invalid={!!errores.fechaNac} aria-describedby={ayuda('fechaNac')} />
              {error('fechaNac')}
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.seccion}>
          <legend className={styles.leyenda}>Contacto</legend>
          <div className={styles.grilla}>
            <div className={styles.campo}>
              <label htmlFor="campo-email" className={styles.label}>Email</label>
              <input id="campo-email" className={styles.input} type="email" autoComplete="email" value={form.email}
                onChange={e => cambiar('email', e.target.value)} aria-invalid={!!errores.email} aria-describedby={ayuda('email')} />
              {error('email')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-telefono" className={styles.label}>
                Teléfono <span className={styles.opcional}>(opcional)</span>
              </label>
              <input id="campo-telefono" className={styles.input} type="tel" inputMode="tel" autoComplete="tel"
                placeholder="Ej: 11 2345 6789" value={form.telefono}
                onChange={e => cambiar('telefono', e.target.value)} aria-invalid={!!errores.telefono} aria-describedby={ayuda('telefono')} />
              {error('telefono')}
            </div>
          </div>
        </fieldset>

        <fieldset className={styles.seccion}>
          <legend className={styles.leyenda}>Domicilio en Argentina</legend>
          <div className={styles.grilla}>
            <div className={`${styles.campo} ${styles.campoAncho}`}>
              <label htmlFor="campo-direccion" className={styles.label}>
                Calle y número <span className={styles.opcional}>(opcional)</span>
              </label>
              <input id="campo-direccion" className={styles.input} autoComplete="street-address" value={form.direccion}
                onChange={e => cambiar('direccion', e.target.value)} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-provincia" className={styles.label}>Provincia</label>
              <select id="campo-provincia" className={styles.input} autoComplete="address-level1" value={form.provincia}
                onChange={e => cambiar('provincia', e.target.value)} aria-invalid={!!errores.provincia} aria-describedby={ayuda('provincia')}>
                <option value="">Elegí tu provincia</option>
                {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {error('provincia')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-ciudad" className={styles.label}>Ciudad o localidad</label>
              <input id="campo-ciudad" className={styles.input} autoComplete="address-level2" value={form.ciudad}
                onChange={e => cambiar('ciudad', e.target.value)} aria-invalid={!!errores.ciudad} aria-describedby={ayuda('ciudad')} />
              {error('ciudad')}
            </div>
            <div className={styles.campo}>
              <label htmlFor="campo-codigoPostal" className={styles.label}>
                Código postal <span className={styles.opcional}>(opcional)</span>
              </label>
              <input id="campo-codigoPostal" className={styles.input} autoComplete="postal-code" value={form.codigoPostal}
                onChange={e => cambiar('codigoPostal', e.target.value)} />
            </div>
          </div>
        </fieldset>

        <div aria-live="polite">
          {errorEnvio && <p className={styles.errorEnvio} role="alert">{errorEnvio}</p>}
        </div>

        <button type="submit" disabled={loading} className={styles.btnPrincipal}>
          {loading ? 'Creando tu cuenta…' : 'Crear mi cuenta'}
        </button>
      </form>
    </AuthShell>
  );
}

export default Onboarding;
