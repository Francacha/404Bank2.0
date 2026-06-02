import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import styles from './Prestamos.module.css';

const API_URL = 'http://localhost:3000';

interface Prestamo {
  id: number;
  monto: number;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

function Prestamos() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [monto, setMonto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const cargarPrestamos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/mis-prestamos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar préstamos');
      setPrestamos(data.prestamos);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarPrestamos();
  }, [cargarPrestamos]);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/prestamos/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ monto: Number(monto) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar');
      setMensajeSolicitud('Solicitud enviada correctamente. Quedará pendiente de revisión.');
      setMonto('');
      cargarPrestamos();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorSolicitud(err.message);
      else setErrorSolicitud('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  const badgeClass = (estado: string) => {
    if (estado === 'aprobado') return styles.badgeAprobado;
    if (estado === 'rechazado') return styles.badgeRechazado;
    if (estado === 'pre_aprobado') return styles.badgePreAprobado;
    return styles.badgePendiente;
  };

  return (
    <div className={styles.page}>
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <button onClick={() => navigate('/home')} className={styles.btnNav}>Inicio</button>
          <button onClick={() => navigate('/transferir')} className={styles.btnNav}>Transferir</button>
          <button onClick={() => navigate('/historial')} className={styles.btnNav}>Historial</button>
          <button onClick={() => navigate('/tarjetas')} className={styles.btnNav}>Tarjetas</button>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userName}>{user?.firstName}</span>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>Préstamos</h1>
        <p className={styles.subtitle}>Solicitá un préstamo y seguí el estado de tus solicitudes.</p>

        {/* Formulario de solicitud */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Nueva solicitud</h2>
          <form onSubmit={handleSolicitar} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Monto solicitado ($)</label>
              <input
                type="number"
                min="1"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                placeholder="Ej: 50000"
                className={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={enviando || !monto} className={styles.btnSolicitar}>
              {enviando ? 'Enviando...' : 'Solicitar préstamo'}
            </button>
          </form>
          {mensajeSolicitud && <p className={styles.successMsg}>{mensajeSolicitud}</p>}
          {errorSolicitud && <p className={styles.errorMsg}>{errorSolicitud}</p>}
        </div>

        {/* Lista de préstamos */}
        <h2 className={styles.listTitle}>Mis solicitudes</h2>
        {loading && <p className={styles.loadingText}>Cargando...</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}
        {!loading && !error && prestamos.length === 0 && (
          <p className={styles.emptyText}>No tenés solicitudes de préstamos todavía.</p>
        )}
        <div className={styles.lista}>
          {prestamos.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardLeft}>
                <p className={styles.cardMonto}>
                  $ {Number(p.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </p>
                <p className={styles.cardFecha}>
                  Solicitado: {new Date(p.fecha_solicitud).toLocaleDateString('es-AR')}
                </p>
                {p.fecha_resolucion && (
                  <p className={styles.cardFecha}>
                    Resuelto: {new Date(p.fecha_resolucion).toLocaleDateString('es-AR')}
                  </p>
                )}
              </div>
              <span className={badgeClass(p.estado)}>{p.estado.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Prestamos;
