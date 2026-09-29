import { useState, useEffect, useMemo } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Historial.module.css';

const API_URL = 'http://localhost:3000';

interface Transferencia {
  id: number;
  transaccion_central_id: string;
  cbu_origen: string;
  cbu_destino: string;
  importe: number;
  estado: string;
  tipo: string;
  fecha_hora: string;
  moneda: 'ARS' | 'USD';
}

const formatearImporte = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

function Historial() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const [transferencias, setTransferencias] = useState<Transferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroMoneda, setFiltroMoneda] = useState<'TODAS' | 'ARS' | 'USD'>('TODAS');
  const [filtroFecha, setFiltroFecha] = useState<'TODAS' | '7D' | '30D'>('TODAS');

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API_URL}/api/transferencias/mis-transferencias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar el historial');
        setTransferencias(data.transferencias);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
        else setError('Error inesperado');
      } finally {
        setLoading(false);
      }
    };
    cargarHistorial();
  }, [getToken]);

  const transferenciasFiltradas = useMemo(() => {
    const ahora = Date.now();
    const limiteMs = filtroFecha === '7D' ? 7 * 24 * 60 * 60 * 1000
      : filtroFecha === '30D' ? 30 * 24 * 60 * 60 * 1000
      : null;

    return transferencias.filter(t => {
      if (filtroMoneda !== 'TODAS' && t.moneda !== filtroMoneda) return false;
      if (limiteMs !== null && ahora - new Date(t.fecha_hora).getTime() > limiteMs) return false;
      return true;
    });
  }, [transferencias, filtroMoneda, filtroFecha]);

  return (
    <div className={styles.dashboardContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} aria-label="404Bank">
          <span className={styles.brand404}>404</span>
          <span className={styles.brandBank}>Bank</span>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Productos</span>
            <button className={styles.navSubItem} onClick={() => navigate('/home')}>Cuentas</button>
            <button className={styles.navSubItem} onClick={() => navigate('/tarjetas')}>Tarjetas</button>
            <button className={styles.navSubItem} onClick={() => navigate('/prestamos')}>Préstamos</button>
            <button className={styles.navSubItem} onClick={() => navigate('/inversiones')}>Inversiones</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Transacciones</span>
            <button className={styles.navSubItem} onClick={() => navigate('/transferir')}>Transferir</button>
            <button className={styles.navSubItem}>Recargas</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Seguridad</span>
            <button className={styles.navSubItem}>Cambio de Contraseña</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Atención al cliente</span>
            <button className={styles.navSubItem} onClick={() => navigate('/chat')}>Chat</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Documentos</span>
            <button className={`${styles.navSubItem} ${styles.navSubItemActive}`}>Historial</button>
            <button className={styles.navSubItem}>Comprobantes</button>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          {esLaboral && (
            <button
              className={styles.btnVolverPanel}
              onClick={() => { setViewMode('work'); navigate(panelUrl); }}
            >
              Volver al panel
            </button>
          )}
          <button className={styles.userSection} onClick={() => navigate('/perfil')}>
            <div className={styles.userAvatarSidebar}>
              {user?.hasImage
                ? <img src={user.imageUrl} alt={displayName} className={styles.userAvatarImg} />
                : (initials || 'U')
              }
            </div>
            <span className={styles.userNameSidebar}>{displayName}</span>
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          
          <div className={styles.topBarActions}>
            <span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

      {/* Contenido */}
      <div className={styles.content}>
        {loading && <p className={styles.loadingText}>Cargando historial...</p>}

        {error && <div className={styles.errorBox}>{error}</div>}

        {!loading && !error && transferencias.length > 0 && (
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              {(['TODAS', 'ARS', 'USD'] as const).map(opcion => (
                <button
                  key={opcion}
                  type="button"
                  onClick={() => setFiltroMoneda(opcion)}
                  className={`${styles.filterButton} ${filtroMoneda === opcion ? styles.filterButtonActive : ''}`}
                >
                  {opcion === 'TODAS' ? 'Todas' : opcion}
                </button>
              ))}
            </div>
            <div className={styles.filterGroup}>
              {([
                { valor: 'TODAS', etiqueta: 'Todo' },
                { valor: '7D', etiqueta: 'Últimos 7 días' },
                { valor: '30D', etiqueta: 'Últimos 30 días' },
              ] as const).map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setFiltroFecha(valor)}
                  className={`${styles.filterButton} ${filtroFecha === valor ? styles.filterButtonActive : ''}`}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && transferencias.length === 0 && (
          <p className={styles.emptyText}>No tenés transferencias registradas.</p>
        )}

        {!loading && !error && transferencias.length > 0 && transferenciasFiltradas.length === 0 && (
          <p className={styles.emptyText}>No hay transferencias que coincidan con los filtros elegidos.</p>
        )}

        <div className={styles.list}>
          {transferenciasFiltradas.map((t) => (
            <div
              key={t.id}
              className={`${styles.card} ${t.tipo === 'entrante' ? styles.cardEntrante : styles.cardSaliente}`}
            >
              <div className={styles.cardTop}>
                <span className={`${styles.amount} ${t.tipo === 'entrante' ? styles.amountEntrante : styles.amountSaliente}`}>
                  {t.tipo === 'entrante' ? '+ ' : '- '}
                  {formatearImporte(Number(t.importe), t.moneda)}
                </span>
                <span className={styles.date}>
                  {new Date(t.fecha_hora).toLocaleString('es-AR')}
                </span>
              </div>
              <p className={styles.fromTo}>
                {t.tipo === 'entrante' ? `De: ${t.cbu_origen}` : `Para: ${t.cbu_destino}`}
              </p>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${t.estado === 'aprobada' ? styles.badgeAprobada : styles.badgeRechazada}`}>
                  {t.estado}
                </span>
                <span className={`${styles.badge} ${t.moneda === 'USD' ? styles.badgeUsd : styles.badgeArs}`}>
                  {t.moneda}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      </main>
    </div>
  );
}

export default Historial;
