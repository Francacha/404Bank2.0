import { useCallback, useEffect, useRef, useState } from 'react';
import { SignOutButton, useAuth, useUser } from '@clerk/react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { PROVINCIAS } from '../components/provincias';
import styles from './Perfil.module.css';

const API_URL = 'http://localhost:3000';
const FOTO_MAXIMA_MB = 10;
const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

interface Persona {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string | null;
  fechaNac: string | null;
  direccion: string | null;
  ciudad: string | null;
  provincia: string | null;
  pais: string | null;
  codigoPostal: string | null;
}

interface Cuenta {
  cbu: string;
  alias: string | null;
  moneda: 'ARS' | 'USD';
}

interface Sesion {
  id: string;
  lastActiveAt: Date;
  latestActivity?: { browserName?: string; deviceType?: string; city?: string; country?: string; isMobile?: boolean };
  revoke: () => Promise<unknown>;
}

type Estado = 'cargando' | 'ok' | 'error';

// 'YYYY-MM-DD…' → '10 de mayo de 1990', sin pasar por Date (que en Argentina puede correr un día).
const fechaDeNacimiento = (valor: string | null) => {
  if (!valor) return '—';
  const [anio, mes, dia] = valor.slice(0, 10).split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
};

const dniLegible = (dni: string) => (/^\d+$/.test(dni) ? Number(dni).toLocaleString('es-AR') : dni);

const domicilio = (p: Persona) => {
  const linea1 = p.direccion || '';
  const linea2 = [p.ciudad, p.provincia].filter(Boolean).join(', ') + (p.codigoPostal ? ` (${p.codigoPostal})` : '');
  return [linea1, linea2].filter(Boolean).join(' · ') || '—';
};

const haceCuanto = (fecha: Date) => {
  const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
  if (minutos < 2) return 'activa ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
};

// Mensajes de Clerk al cambiar la contraseña, en el voseo de la app.
const errorDeContrasenia = (err: unknown) => {
  const codigo = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code ?? '';
  if (codigo === 'form_password_incorrect') return 'La contraseña actual no es correcta.';
  if (codigo === 'form_password_pwned') return 'Esa contraseña apareció en una filtración de datos. Elegí otra.';
  if (codigo === 'form_password_length_too_short') return 'La contraseña nueva es muy corta: usá al menos 8 caracteres.';
  if (codigo.startsWith('form_password')) return 'La contraseña nueva es muy débil. Sumale largo o variedad.';
  if (codigo.includes('reverification')) return 'Por seguridad, cerrá sesión y volvé a entrar antes de cambiarla.';
  return 'No pudimos cambiar la contraseña. Probá de nuevo en un momento.';
};

const IconCamara = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /></svg>
);
const IconCopiar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
);

function Perfil() {
  const { user, isLoaded } = useUser();
  const { getToken, sessionId } = useAuth();
  const location = useLocation();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [estadoPersona, setEstadoPersona] = useState<Estado>('cargando');
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [estadoCuentas, setEstadoCuentas] = useState<Estado>('cargando');
  const [copiado, setCopiado] = useState<string | null>(null);

  // Foto
  const fotoRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [avisoFoto, setAvisoFoto] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Contacto
  const [editando, setEditando] = useState(false);
  const [contacto, setContacto] = useState({ telefono: '', direccion: '', ciudad: '', provincia: '', codigoPostal: '' });
  const [guardando, setGuardando] = useState(false);
  const [errorContacto, setErrorContacto] = useState<{ texto: string; campo?: string } | null>(null);
  const [contactoGuardado, setContactoGuardado] = useState(false);

  // Contraseña
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [clave, setClave] = useState({ actual: '', nueva: '', repetida: '' });
  const [cerrarOtras, setCerrarOtras] = useState(true);
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [errorClave, setErrorClave] = useState('');
  const [claveCambiada, setClaveCambiada] = useState(false);

  // Sesiones
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [estadoSesiones, setEstadoSesiones] = useState<Estado>('cargando');
  const [cerrandoSesion, setCerrandoSesion] = useState<string | null>(null);

  const conToken = useCallback(async (): Promise<Record<string, string>> => {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getToken]);

  const cargarPersona = useCallback(async () => {
    setEstadoPersona('cargando');
    try {
      const res = await fetch(`${API_URL}/api/onboarding/perfil`, { headers: await conToken() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setPersona(data);
      setEstadoPersona('ok');
    } catch {
      setEstadoPersona('error');
    }
  }, [conToken]);

  const cargarCuentas = useCallback(async () => {
    setEstadoCuentas('cargando');
    try {
      const res = await fetch(`${API_URL}/api/cuentas/mis-cuentas`, { headers: await conToken() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error();
      setCuentas(data.cuentas || []);
      setEstadoCuentas('ok');
    } catch {
      setEstadoCuentas('error');
    }
  }, [conToken]);

  const cargarSesiones = useCallback(async () => {
    if (!user) return;
    try {
      const lista = (await user.getSessions()) as unknown as Sesion[];
      setSesiones([...lista].sort((a, b) => (a.id === sessionId ? -1 : b.id === sessionId ? 1 : 0)));
      setEstadoSesiones('ok');
    } catch {
      setEstadoSesiones('error');
    }
  }, [user, sessionId]);

  useEffect(() => { cargarPersona(); cargarCuentas(); }, [cargarPersona, cargarCuentas]);
  useEffect(() => { cargarSesiones(); }, [cargarSesiones]);

  // Llegar con #seguridad (desde "Contraseña" del menú) lleva directo a esa sección.
  useEffect(() => {
    if (location.hash === '#seguridad') {
      requestAnimationFrame(() => document.getElementById('seguridad')?.scrollIntoView({ block: 'start' }));
    }
  }, [location.hash]);

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      window.setTimeout(() => setCopiado(c => (c === clave ? null : c)), 2500);
    } catch {
      setCopiado(null);
    }
  };

  const cambiarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (fotoRef.current) fotoRef.current.value = '';
    if (!archivo || !user) return;
    if (!TIPOS_FOTO.includes(archivo.type)) {
      setAvisoFoto({ tipo: 'error', texto: 'Usá una imagen JPG, PNG o WebP.' });
      return;
    }
    if (archivo.size > FOTO_MAXIMA_MB * 1024 * 1024) {
      setAvisoFoto({ tipo: 'error', texto: `La imagen pesa más de ${FOTO_MAXIMA_MB} MB. Probá con una más liviana.` });
      return;
    }
    setSubiendoFoto(true);
    setAvisoFoto(null);
    try {
      await user.setProfileImage({ file: archivo });
      setAvisoFoto({ tipo: 'ok', texto: 'Listo, actualizamos tu foto.' });
    } catch {
      setAvisoFoto({ tipo: 'error', texto: 'No pudimos subir la foto. Probá con otra imagen.' });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const quitarFoto = async () => {
    if (!user) return;
    setSubiendoFoto(true);
    setAvisoFoto(null);
    try {
      await user.setProfileImage({ file: null });
      setAvisoFoto({ tipo: 'ok', texto: 'Quitamos tu foto.' });
    } catch {
      setAvisoFoto({ tipo: 'error', texto: 'No pudimos quitar la foto. Probá de nuevo.' });
    } finally {
      setSubiendoFoto(false);
    }
  };

  const empezarEdicion = () => {
    if (!persona) return;
    setContacto({
      telefono: persona.telefono ?? '',
      direccion: persona.direccion ?? '',
      ciudad: persona.ciudad ?? '',
      provincia: persona.provincia ?? '',
      codigoPostal: persona.codigoPostal ?? '',
    });
    setErrorContacto(null);
    setContactoGuardado(false);
    setEditando(true);
  };

  const guardarContacto = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setErrorContacto(null);
    try {
      const res = await fetch(`${API_URL}/api/onboarding/perfil/contacto`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await conToken()) },
        body: JSON.stringify(contacto),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorContacto({
          texto: res.status < 500 && data?.error ? data.error : 'No pudimos guardar los cambios. Probá de nuevo en un momento.',
          campo: data?.campo,
        });
        if (data?.campo) document.getElementById(`contacto-${data.campo}`)?.focus();
        return;
      }
      setPersona(p => (p ? { ...p, ...data } : p));
      setEditando(false);
      setContactoGuardado(true);
    } catch {
      setErrorContacto({ texto: 'No pudimos guardar los cambios. Revisá tu conexión.' });
    } finally {
      setGuardando(false);
    }
  };

  const errorNuevaClave =
    clave.nueva && clave.nueva.length < 8
      ? 'Usá al menos 8 caracteres.'
      : clave.repetida && clave.repetida !== clave.nueva
        ? 'Las contraseñas no coinciden.'
        : '';

  const guardarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || errorNuevaClave || !clave.actual || !clave.nueva) return;
    setGuardandoClave(true);
    setErrorClave('');
    try {
      await user.updatePassword({ currentPassword: clave.actual, newPassword: clave.nueva, signOutOfOtherSessions: cerrarOtras });
      setClave({ actual: '', nueva: '', repetida: '' });
      setCambiandoClave(false);
      setClaveCambiada(true);
      cargarSesiones();
    } catch (err) {
      setErrorClave(errorDeContrasenia(err));
    } finally {
      setGuardandoClave(false);
    }
  };

  const cerrarSesionRemota = async (s: Sesion) => {
    setCerrandoSesion(s.id);
    try {
      await s.revoke();
      setSesiones(lista => lista.filter(x => x.id !== s.id));
    } catch {
      setEstadoSesiones('error');
    } finally {
      setCerrandoSesion(null);
    }
  };

  const nombreCompleto = persona ? `${persona.nombre} ${persona.apellido}` : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const iniciales = nombreCompleto.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  const email = user?.primaryEmailAddress;
  const emailVerificado = email?.verification?.status === 'verified';

  return (
    <AppLayout ancho="lectura" title="Mi perfil" subtitle="Tus datos, tus cuentas y la seguridad de tu acceso.">
      <div className={styles.wrapper}>
        {/* ── Encabezado con la foto ── */}
        <section className={styles.cabecera} aria-label="Tu foto de perfil">
          <div className={styles.foto}>
            {user?.hasImage ? (
              <img src={user.imageUrl} alt="" className={styles.fotoImg} />
            ) : (
              <span className={styles.fotoIniciales} aria-hidden="true">{iniciales || '·'}</span>
            )}
            {subiendoFoto && <span className={styles.fotoCargando} aria-hidden="true" />}
          </div>
          <div className={styles.cabeceraTexto}>
            <p className={styles.nombre}>{nombreCompleto || (isLoaded ? 'Tu perfil' : '…')}</p>
            <div className={styles.accionesFoto}>
              <button type="button" className={styles.btnSecundario} onClick={() => fotoRef.current?.click()} disabled={subiendoFoto}>
                <IconCamara /> {subiendoFoto ? 'Subiendo…' : user?.hasImage ? 'Cambiar foto' : 'Subir foto'}
              </button>
              {user?.hasImage && (
                <button type="button" className={styles.btnTexto} onClick={quitarFoto} disabled={subiendoFoto}>
                  Quitar foto
                </button>
              )}
              <input
                ref={fotoRef}
                type="file"
                accept={TIPOS_FOTO.join(',')}
                onChange={cambiarFoto}
                className={styles.srOnly}
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
            <p className={avisoFoto?.tipo === 'error' ? styles.avisoError : styles.avisoOk} role="status">
              {avisoFoto?.texto ?? ''}
            </p>
          </div>
        </section>

        {estadoPersona === 'error' && (
          <div className={styles.aviso} role="alert">
            <p>No pudimos cargar tus datos.</p>
            <button type="button" className={styles.btnSecundario} onClick={cargarPersona}>Reintentar</button>
          </div>
        )}

        {/* ── Identidad ── */}
        <section className={styles.seccion} aria-labelledby="titulo-identidad">
          <h2 id="titulo-identidad" className={styles.seccionTitulo}>Identidad</h2>
          <dl className={styles.libro}>
            <div className={styles.fila}><dt>Nombre</dt><dd>{persona ? nombreCompleto : '…'}</dd></div>
            <div className={styles.fila}><dt>DNI</dt><dd className={styles.cifra}>{persona ? dniLegible(persona.dni) : '…'}</dd></div>
            <div className={styles.fila}><dt>Fecha de nacimiento</dt><dd>{persona ? fechaDeNacimiento(persona.fechaNac) : '…'}</dd></div>
          </dl>
          <p className={styles.nota}>
            Están registrados en el Banco Central, así que no se cambian desde la app.
          </p>
        </section>

        {/* ── Contacto ── */}
        <section className={styles.seccion} aria-labelledby="titulo-contacto">
          <div className={styles.seccionCabecera}>
            <h2 id="titulo-contacto" className={styles.seccionTitulo}>Contacto</h2>
            {!editando && persona && (
              <button type="button" className={styles.btnTexto} onClick={empezarEdicion}>Editar teléfono y domicilio</button>
            )}
          </div>

          {!editando ? (
            <>
              <dl className={styles.libro}>
                <div className={styles.fila}>
                  <dt>Email</dt>
                  <dd>
                    {email?.emailAddress ?? persona?.email ?? '—'}
                    {emailVerificado && <span className={styles.chipOk}>Verificado</span>}
                  </dd>
                </div>
                <div className={styles.fila}><dt>Teléfono</dt><dd>{persona ? persona.telefono || 'Sin cargar' : '…'}</dd></div>
                <div className={styles.fila}><dt>Domicilio</dt><dd>{persona ? domicilio(persona) : '…'}</dd></div>
              </dl>
              <p className={styles.avisoOk} role="status">{contactoGuardado ? 'Listo, guardamos tus datos de contacto.' : ''}</p>
            </>
          ) : (
            <form className={styles.panel} onSubmit={guardarContacto} noValidate>
              <div className={styles.grilla}>
                {([
                  { id: 'telefono', etiqueta: 'Teléfono', auto: 'tel', tipo: 'tel', ancho: false },
                  { id: 'direccion', etiqueta: 'Calle y número', auto: 'street-address', tipo: 'text', ancho: true },
                  { id: 'ciudad', etiqueta: 'Ciudad o localidad', auto: 'address-level2', tipo: 'text', ancho: false },
                ] as const).map(c => (
                  <div key={c.id} className={`${styles.campo} ${c.ancho ? styles.campoAncho : ''}`}>
                    <label htmlFor={`contacto-${c.id}`} className={styles.label}>{c.etiqueta}</label>
                    <input
                      id={`contacto-${c.id}`}
                      type={c.tipo}
                      autoComplete={c.auto}
                      className={styles.input}
                      value={contacto[c.id]}
                      onChange={e => setContacto(v => ({ ...v, [c.id]: e.target.value }))}
                      aria-invalid={errorContacto?.campo === c.id}
                      aria-describedby={errorContacto?.campo === c.id ? 'contacto-error' : undefined}
                    />
                  </div>
                ))}
                <div className={styles.campo}>
                  <label htmlFor="contacto-provincia" className={styles.label}>Provincia</label>
                  <select
                    id="contacto-provincia"
                    className={styles.input}
                    value={contacto.provincia}
                    onChange={e => setContacto(v => ({ ...v, provincia: e.target.value }))}
                    aria-invalid={errorContacto?.campo === 'provincia'}
                  >
                    <option value="">Elegí tu provincia</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className={styles.campo}>
                  <label htmlFor="contacto-codigoPostal" className={styles.label}>Código postal</label>
                  <input
                    id="contacto-codigoPostal"
                    autoComplete="postal-code"
                    className={styles.input}
                    value={contacto.codigoPostal}
                    onChange={e => setContacto(v => ({ ...v, codigoPostal: e.target.value }))}
                    aria-invalid={errorContacto?.campo === 'codigoPostal'}
                  />
                </div>
              </div>
              {errorContacto && <p id="contacto-error" className={styles.avisoError} role="alert">{errorContacto.texto}</p>}
              <div className={styles.acciones}>
                <button type="submit" className={styles.btnPrincipal} disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button type="button" className={styles.btnSecundario} onClick={() => setEditando(false)} disabled={guardando}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ── Cuentas ── */}
        <section className={styles.seccion} aria-labelledby="titulo-cuentas">
          <h2 id="titulo-cuentas" className={styles.seccionTitulo}>Tus cuentas</h2>
          {estadoCuentas === 'error' ? (
            <div className={styles.aviso} role="alert">
              <p>No pudimos cargar tus cuentas.</p>
              <button type="button" className={styles.btnSecundario} onClick={cargarCuentas}>Reintentar</button>
            </div>
          ) : (
            <ul className={styles.libro}>
              {estadoCuentas === 'cargando' && <li className={styles.fila}><span className={styles.textoSuave}>Cargando tus cuentas…</span></li>}
              {cuentas.map(c => (
                <li key={c.cbu} className={styles.cuenta}>
                  <p className={styles.cuentaTitulo}>Cuenta en {c.moneda === 'USD' ? 'dólares' : 'pesos'}</p>
                  <div className={styles.dato}>
                    <span className={styles.datoEtiqueta}>CBU</span>
                    <span className={styles.pill}>{c.cbu}</span>
                    <button type="button" className={styles.btnCopiar} onClick={() => copiar(c.cbu, `cbu-${c.cbu}`)}>
                      <IconCopiar /> {copiado === `cbu-${c.cbu}` ? 'Copiado' : 'Copiar'}
                      <span className={styles.srOnly}> CBU de la cuenta en {c.moneda === 'USD' ? 'dólares' : 'pesos'}</span>
                    </button>
                  </div>
                  {c.alias && (
                    <div className={styles.dato}>
                      <span className={styles.datoEtiqueta}>Alias</span>
                      <span className={styles.pill}>{c.alias}</span>
                      <button type="button" className={styles.btnCopiar} onClick={() => copiar(c.alias!, `alias-${c.cbu}`)}>
                        <IconCopiar /> {copiado === `alias-${c.cbu}` ? 'Copiado' : 'Copiar'}
                        <span className={styles.srOnly}> alias de la cuenta en {c.moneda === 'USD' ? 'dólares' : 'pesos'}</span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className={styles.srOnly} aria-live="polite">{copiado ? 'Copiado al portapapeles' : ''}</p>
        </section>

        {/* ── Seguridad ── */}
        <section id="seguridad" className={styles.seccion} aria-labelledby="titulo-seguridad">
          <h2 id="titulo-seguridad" className={styles.seccionTitulo}>Seguridad</h2>
          <div className={styles.panel}>
            <div className={styles.seguridadFila}>
              <div>
                <p className={styles.seguridadTitulo}>Contraseña</p>
                <p className={styles.textoSuave}>
                  {!isLoaded || !user
                    ? '…'
                    : user.passwordEnabled
                      ? 'La usás para entrar a 404Bank.'
                      : 'Entrás con una cuenta externa (por ejemplo Google), así que no tenés contraseña en 404Bank.'}
                </p>
              </div>
              {user?.passwordEnabled && !cambiandoClave && (
                <button type="button" className={styles.btnSecundario} onClick={() => { setCambiandoClave(true); setClaveCambiada(false); setErrorClave(''); }}>
                  Cambiar contraseña
                </button>
              )}
            </div>

            {cambiandoClave && (
              <form className={styles.formClave} onSubmit={guardarClave} noValidate>
                <div className={styles.campo}>
                  <label htmlFor="clave-actual" className={styles.label}>Contraseña actual</label>
                  <input id="clave-actual" type="password" autoComplete="current-password" className={styles.input}
                    value={clave.actual} onChange={e => setClave(v => ({ ...v, actual: e.target.value }))} />
                </div>
                <div className={styles.campo}>
                  <label htmlFor="clave-nueva" className={styles.label}>Contraseña nueva</label>
                  <input id="clave-nueva" type="password" autoComplete="new-password" className={styles.input}
                    value={clave.nueva} onChange={e => setClave(v => ({ ...v, nueva: e.target.value }))}
                    aria-invalid={!!clave.nueva && clave.nueva.length < 8} aria-describedby="clave-ayuda" />
                </div>
                <div className={styles.campo}>
                  <label htmlFor="clave-repetida" className={styles.label}>Repetí la contraseña nueva</label>
                  <input id="clave-repetida" type="password" autoComplete="new-password" className={styles.input}
                    value={clave.repetida} onChange={e => setClave(v => ({ ...v, repetida: e.target.value }))}
                    aria-invalid={!!clave.repetida && clave.repetida !== clave.nueva} aria-describedby="clave-ayuda" />
                </div>
                <p id="clave-ayuda" className={errorNuevaClave ? styles.avisoError : styles.textoSuave}>
                  {errorNuevaClave || 'Mínimo 8 caracteres. Mejor si mezclás letras, números y símbolos.'}
                </p>
                <label className={styles.check}>
                  <input type="checkbox" checked={cerrarOtras} onChange={e => setCerrarOtras(e.target.checked)} />
                  Cerrar sesión en los otros dispositivos
                </label>
                {errorClave && <p className={styles.avisoError} role="alert">{errorClave}</p>}
                <div className={styles.acciones}>
                  <button type="submit" className={styles.btnPrincipal}
                    disabled={guardandoClave || !clave.actual || !clave.nueva || !clave.repetida || !!errorNuevaClave}>
                    {guardandoClave ? 'Guardando…' : 'Guardar contraseña'}
                  </button>
                  <button type="button" className={styles.btnSecundario} onClick={() => setCambiandoClave(false)} disabled={guardandoClave}>
                    Cancelar
                  </button>
                </div>
              </form>
            )}
            <p className={styles.avisoOk} role="status">{claveCambiada ? 'Listo, cambiaste tu contraseña.' : ''}</p>

            <div className={styles.separador} />

            <p className={styles.seguridadTitulo}>Dónde tenés la sesión abierta</p>
            {estadoSesiones === 'error' ? (
              <div className={styles.aviso} role="alert">
                <p>No pudimos cargar tus sesiones.</p>
                <button type="button" className={styles.btnSecundario} onClick={cargarSesiones}>Reintentar</button>
              </div>
            ) : (
              <ul className={styles.sesiones}>
                {estadoSesiones === 'cargando' && <li className={styles.textoSuave}>Cargando…</li>}
                {sesiones.map(s => {
                  const a = s.latestActivity;
                  const dispositivo = [a?.browserName, a?.deviceType || (a?.isMobile ? 'celular' : 'computadora')].filter(Boolean).join(' en ');
                  const lugar = [a?.city, a?.country].filter(Boolean).join(', ');
                  const esEsta = s.id === sessionId;
                  return (
                    <li key={s.id} className={styles.sesion}>
                      <div>
                        <p className={styles.sesionDispositivo}>
                          {dispositivo || 'Dispositivo desconocido'}
                          {esEsta && <span className={styles.chipOk}>Este dispositivo</span>}
                        </p>
                        <p className={styles.textoSuave}>{[lugar, haceCuanto(s.lastActiveAt)].filter(Boolean).join(' · ')}</p>
                      </div>
                      {!esEsta && (
                        <button type="button" className={styles.btnTexto} onClick={() => cerrarSesionRemota(s)} disabled={cerrandoSesion === s.id}>
                          {cerrandoSesion === s.id ? 'Cerrando…' : 'Cerrar sesión'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className={styles.salir}>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button type="button" className={styles.btnSalir}>Cerrar sesión en este dispositivo</button>
          </SignOutButton>
        </div>
      </div>
    </AppLayout>
  );
}

export default Perfil;
