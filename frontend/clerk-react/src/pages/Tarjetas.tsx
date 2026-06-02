import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import styles from './Tarjetas.module.css';

const API_URL = 'http://localhost:3000';

interface Tarjeta {
  id: number;
  tipo: string;
  numero: string | null;
  cvv: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
}

function Tarjetas() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();

  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState<'debito' | 'credito'>('debito');
  const [enviando, setEnviando] = useState(false);
  const [mensajeSolicitud, setMensajeSolicitud] = useState('');
  const [errorSolicitud, setErrorSolicitud] = useState('');

  const cargarTarjetas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/mis-tarjetas`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar tarjetas');
      setTarjetas(data.tarjetas);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Error inesperado');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    cargarTarjetas();
  }, [cargarTarjetas]);

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeSolicitud('');
    setErrorSolicitud('');
    setEnviando(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/tarjetas/solicitar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tipo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al solicitar');
      setMensajeSolicitud('Solicitud enviada correctamente. Quedará pendiente de revisión.');
      cargarTarjetas();
    } catch (err: unknown) {
      if (err instanceof Error) setErrorSolicitud(err.message);
      else setErrorSolicitud('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

  const badgeClass = (estado: string) => {
    if (estado === 'activa') return styles.badgeActiva;
    if (estado === 'rechazada') return styles.badgeRechazada;
    if (estado === 'pre_aprobada') return styles.badgePreAprobada;
    return styles.badgePendiente;
  };

  const formatNumero = (numero: string) =>
    numero.replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className={styles.page}>
      <div className={styles.navbar}>
        <div className={styles.navLeft}>
          <span className={styles.brand}>404Bank</span>
          <button onClick={() => navigate('/home')} className={styles.btnNav}>Inicio</button>
          <button onClick={() => navigate('/transferir')} className={styles.btnNav}>Transferir</button>
          <button onClick={() => navigate('/historial')} className={styles.btnNav}>Historial</button>
          <button onClick={() => navigate('/prestamos')} className={styles.btnNav}>Préstamos</button>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userName}>{user?.firstName}</span>
          <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
            <button className={styles.btnSignOut}>Cerrar sesión</button>
          </SignOutButton>
        </div>
      </div>

      <div className={styles.content}>
        <h1 className={styles.title}>Tarjetas</h1>
        <p className={styles.subtitle}>Solicitá una tarjeta y seguí el estado de tus solicitudes.</p>

        {/* Formulario de solicitud */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Nueva solicitud</h2>
          <form onSubmit={handleSolicitar} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Tipo de tarjeta</label>
              <div className={styles.tipoRow}>
                <button
                  type="button"
                  className={`${styles.tipoBtn} ${tipo === 'debito' ? styles.tipoBtnActive : ''}`}
                  onClick={() => setTipo('debito')}
                >
                  Débito
                </button>
                <button
                  type="button"
                  className={`${styles.tipoBtn} ${tipo === 'credito' ? styles.tipoBtnActive : ''}`}
                  onClick={() => setTipo('credito')}
                >
                  Crédito
                </button>
              </div>
            </div>
            <button type="submit" disabled={enviando} className={styles.btnSolicitar}>
              {enviando ? 'Enviando...' : 'Solicitar tarjeta'}
            </button>
          </form>
          {mensajeSolicitud && <p className={styles.successMsg}>{mensajeSolicitud}</p>}
          {errorSolicitud && <p className={styles.errorMsg}>{errorSolicitud}</p>}
        </div>

        {/* Lista de tarjetas */}
        <h2 className={styles.listTitle}>Mis tarjetas</h2>
        {loading && <p className={styles.loadingText}>Cargando...</p>}
        {error && <p className={styles.errorMsg}>{error}</p>}
        {!loading && !error && tarjetas.length === 0 && (
          <p className={styles.emptyText}>No tenés solicitudes de tarjetas todavía.</p>
        )}
        <div className={styles.lista}>
          {tarjetas.map(t => (
            <div key={t.id} className={`${styles.card} ${t.estado === 'activa' ? styles.cardActiva : ''}`}>
              <div className={styles.cardTop}>
                <span className={styles.cardTipo}>{t.tipo.toUpperCase()}</span>
                <span className={badgeClass(t.estado)}>{t.estado.replace('_', ' ')}</span>
              </div>
              {t.estado === 'activa' && t.numero ? (
                <div className={styles.cardDatos}>
                  <p className={styles.cardNumero}>{formatNumero(t.numero)}</p>
                  <div className={styles.cardRow}>
                    <div>
                      <p className={styles.cardDatoLabel}>Vencimiento</p>
                      <p className={styles.cardDatoValor}>
                        {t.fecha_vencimiento
                          ? new Date(t.fecha_vencimiento).toLocaleDateString('es-AR', { month: '2-digit', year: '2-digit' })
                          : '—'}
                      </p>
                    </div>
                    <div>
                      <p className={styles.cardDatoLabel}>CVV</p>
                      <p className={styles.cardDatoValor}>{t.cvv}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className={styles.cardFecha}>
                  Solicitada: {new Date(t.fecha_solicitud).toLocaleDateString('es-AR')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Tarjetas;
