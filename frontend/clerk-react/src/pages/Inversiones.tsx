import { useCallback, useEffect, useMemo, useState } from 'react';
import { SignOutButton, useAuth, useUser } from '@clerk/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import layout from './Transferir.module.css';
import styles from './Inversiones.module.css';

const API_URL = 'http://localhost:3000';

interface Cuenta {
  cbu: string;
  saldo: number;
  moneda: 'ARS' | 'USD';
}

interface Cotizacion {
  compra: number;
  venta: number;
  fechaActualizacion?: string;
}

const formatear = (monto: number, moneda: 'ARS' | 'USD') =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2,
  }).format(monto);

const IconHome = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" /></svg>
);
const IconCard = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
);
const IconLoan = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9" /><path d="M3 12h6l2-3 2 6 2-3h4" /></svg>
);
const IconTrending = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></svg>
);
const IconSend = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h13" /><path d="m13 6 6 6-6 6" /></svg>
);
const IconChat = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.5 8.5 0 0 1-3.1-.6L3 21l1.8-5.5A8.4 8.4 0 1 1 21 11.5Z" /></svg>
);
const IconHistory = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
);

const NAV_ITEMS = [
  { label: 'Cuentas', path: '/home', icon: <IconHome /> },
  { label: 'Tarjetas', path: '/tarjetas', icon: <IconCard /> },
  { label: 'Préstamos', path: '/prestamos', icon: <IconLoan /> },
  { label: 'Inversiones', path: '/inversiones', icon: <IconTrending /> },
];

const NAV_ITEMS_2 = [
  { label: 'Transferir', path: '/transferir', icon: <IconSend /> },
  { label: 'Chat', path: '/chat', icon: <IconChat /> },
  { label: 'Historial', path: '/historial', icon: <IconHistory /> },
];

function Inversiones() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { setViewMode } = useViewMode();
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [montoUSD, setMontoUSD] = useState('');
  const [cargando, setCargando] = useState(true);
  const [comprando, setComprando] = useState(false);
  const [abriendoCuenta, setAbriendoCuenta] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';
  const cuentaARS = cuentas.find(cuenta => cuenta.moneda === 'ARS');
  const cuentaUSD = cuentas.find(cuenta => cuenta.moneda === 'USD');
  const montoNumerico = Number(montoUSD);
  const totalARS = useMemo(
    () => (cotizacion && montoNumerico > 0 ? montoNumerico * Number(cotizacion.venta) : 0),
    [cotizacion, montoNumerico],
  );

  const cargarDatos = useCallback(async () => {
    const token = await getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const [cuentasRes, cotizacionRes] = await Promise.all([
      fetch(`${API_URL}/api/cuentas/mis-cuentas`, { headers }),
      fetch(`${API_URL}/api/divisas/cotizacion`, { headers }),
    ]);
    const cuentasData = await cuentasRes.json();
    const cotizacionData = await cotizacionRes.json();

    if (!cuentasRes.ok) throw new Error(cuentasData.error || 'No se pudieron cargar tus cuentas.');
    if (!cotizacionRes.ok) throw new Error(cotizacionData.error || 'No se pudo obtener la cotización del dólar.');

    setCuentas(cuentasData.cuentas || []);
    setCotizacion(cotizacionData.cotizacion);
  }, [getToken]);

  useEffect(() => {
    const iniciar = async () => {
      try {
        await cargarDatos();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ocurrió un error al cargar Inversiones.');
      } finally {
        setCargando(false);
      }
    };
    iniciar();
  }, [cargarDatos]);

  const abrirCuentaUSD = async () => {
    setAbriendoCuenta(true);
    setError('');
    setExito('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/cuentas/caja-ahorro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ moneda: 'USD' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la cuenta en dólares.');
      await cargarDatos();
      setExito(data.mensaje || 'Tu cuenta en dólares fue creada correctamente. Ya podés comprar dólares.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo abrir la cuenta en dólares.');
    } finally {
      setAbriendoCuenta(false);
    }
  };

  const comprarDolares = async () => {
    if (!cuentaARS || !cuentaUSD || montoNumerico <= 0) return;
    setComprando(true);
    setError('');
    setExito('');
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/divisas/operar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ tipoOperacion: 'COMPRA', montoUSD: montoNumerico }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la compra.');
      setExito(`Compraste ${formatear(data.operacion.montoUSD, 'USD')} por ${formatear(Number(data.operacion.montoARS), 'ARS')}.`);
      setMontoUSD('');
      await cargarDatos();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la compra.');
    } finally {
      setComprando(false);
    }
  };

  return (
    <div className={layout.page}>
      <aside className={layout.sidebar}>
        <div className={layout.sidebarBrand} aria-label="404Bank">
          <span className={layout.brand404}>404</span>
          <span className={layout.brandBank}>Bank</span>
        </div>

        <nav className={layout.nav}>
          {NAV_ITEMS.map(item => {
            const active = item.path === location.pathname;
            return (
              <button
                key={item.label}
                className={`${layout.navItem} ${active ? layout.navItemActive : ''}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className={layout.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}

          <div className={layout.navDivider} />

          {NAV_ITEMS_2.map(item => {
            const active = item.path === location.pathname;
            return (
              <button
                key={item.label}
                className={`${layout.navItem} ${active ? layout.navItemActive : ''}`}
                onClick={() => item.path && navigate(item.path)}
              >
                <span className={layout.navIcon}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className={layout.sidebarFooter}>
          {esLaboral && (
            <button className={layout.btnVolverPanel} onClick={() => { setViewMode('work'); navigate(panelUrl); }}>
              Volver al panel
            </button>
          )}
          <button className={layout.userSection} onClick={() => navigate('/perfil')}>
            <div className={layout.userAvatarSidebar}>
              {user?.hasImage
                ? <img src={user.imageUrl} alt={displayName} className={layout.userAvatarImg} />
                : (initials || 'U')
              }
            </div>
            <span className={layout.userNameSidebar}>{displayName}</span>
          </button>
        </div>
      </aside>

      <main className={layout.main}>
        <header className={layout.topbar}>
          <div>
            <h1 className={layout.topbarTitle}>Compra de dólares</h1>
            <p className={layout.topbarSubtitle}>Convertí pesos de tu cuenta en dólares al tipo de cambio oficial vigente.</p>
          </div>
          <div className={layout.topbarActions}>
            <button className={layout.userChip} onClick={() => navigate('/perfil')}>
              <div className={layout.userChipAvatar}>
                {user?.hasImage
                  ? <img src={user.imageUrl} alt={displayName} className={layout.userAvatarImg} />
                  : (initials || 'U')
                }
              </div>
              <span>{displayName}</span>
            </button>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={layout.btnSignOut}>Cerrar sesión</button>
            </SignOutButton>
          </div>
        </header>

        <div className={layout.pageContent}>
          <div className={`${layout.pageWrapper} ${styles.pageWrapper}`}>

            {error && <p className={layout.errorMsg}>{error}</p>}
            {exito && <p className={layout.successMsg}>{exito}</p>}

            <section className={`${layout.formCard} ${styles.summaryCard}`}>
              <h3 className={layout.formCardTitle}>Cotización y saldos</h3>
              {cargando ? <p className={styles.muted}>Cargando información...</p> : <div className={styles.summaryGrid}>
                <div><span className={styles.metricLabel}>Dólar vendedor</span><strong>{cotizacion ? formatear(Number(cotizacion.venta), 'ARS') : 'No disponible'}</strong></div>
                <div><span className={styles.metricLabel}>Saldo en pesos</span><strong>{cuentaARS ? formatear(Number(cuentaARS.saldo), 'ARS') : 'Sin cuenta ARS'}</strong></div>
                <div><span className={styles.metricLabel}>Saldo en dólares</span><strong>{cuentaUSD ? formatear(Number(cuentaUSD.saldo), 'USD') : 'Sin cuenta USD'}</strong></div>
              </div>}
            </section>

            {!cargando && !cuentaUSD ? (
              <section className={layout.formCard}>
                <h3 className={layout.formCardTitle}>Necesitás una cuenta en dólares</h3>
                <p className={styles.muted}>Abrila sin salir de esta pantalla para poder acreditar allí tus dólares.</p>
                <button className={layout.btnTransferir} onClick={abrirCuentaUSD} disabled={abriendoCuenta}>{abriendoCuenta ? 'Abriendo cuenta...' : 'Abrir cuenta en dólares'}</button>
              </section>
            ) : !cargando && (
              <section className={layout.formCard}>
                <h3 className={layout.formCardTitle}>¿Cuántos dólares querés comprar?</h3>
                <div className={layout.inputGroup}>
                  <label className={layout.label} htmlFor="monto-usd">Monto en USD</label>
                  <input id="monto-usd" className={layout.input} type="number" min="0.01" step="0.01" inputMode="decimal" value={montoUSD} onChange={event => setMontoUSD(event.target.value)} placeholder="Ej.: 100" />
                </div>
                <div className={styles.estimate}><span>Vas a debitar aproximadamente</span><strong>{formatear(totalARS, 'ARS')}</strong><small>La cotización final la confirma el servidor al operar.</small></div>
                <button className={layout.btnTransferir} onClick={comprarDolares} disabled={comprando || !cuentaARS || montoNumerico <= 0 || totalARS > Number(cuentaARS.saldo)}>{comprando ? 'Comprando...' : 'Comprar dólares'}</button>
                {cuentaARS && totalARS > Number(cuentaARS.saldo) && <p className={layout.errorMsg}>No contás con saldo suficiente en pesos para esta compra.</p>}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Inversiones;
