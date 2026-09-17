import { useState, useEffect, useCallback } from 'react';
import { useAuth, useUser, SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Transferir.module.css';

const API_URL = 'http://localhost:3000';

interface Destinatario {
  nombre: string;
  apellido: string;
  cbu: string;
  alias?: string;
}

interface Contacto {
  id: number;
  cbu: string;
  alias: string | null;
  nombre: string;
  apellido: string;
}

function Transferir() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';

  const [busqueda, setBusqueda] = useState('');
  const [destinatario, setDestinatario] = useState<Destinatario | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState('');

  const [importe, setImporte] = useState('');
  const [moneda, setMoneda] = useState<'ARS' | 'USD'>('ARS');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState('');
  const [errorTransferencia, setErrorTransferencia] = useState('');

  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [agendarContacto, setAgendarContacto] = useState(false);

  const cargarContactos = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/contactos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setContactos(data.contactos || []);
    } catch {
      // Si falla la carga de contactos, simplemente no se muestran.
    }
  }, [getToken]);

  useEffect(() => {
    cargarContactos();
  }, [cargarContactos]);

  const seleccionarContacto = (contacto: Contacto) => {
    setDestinatario({ nombre: contacto.nombre, apellido: contacto.apellido, cbu: contacto.cbu });
    setBusqueda(contacto.alias || contacto.cbu);
    setErrorBusqueda('');
    setResultado('');
    setErrorTransferencia('');
    setAgendarContacto(false);
  };

  const formatearImporte = (monto: number, monedaOperacion: 'ARS' | 'USD') =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: monedaOperacion,
      minimumFractionDigits: 2,
    }).format(monto);

  const buscarDestinatario = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setErrorBusqueda('');
    setDestinatario(null);
    setResultado('');
    setErrorTransferencia('');
    setAgendarContacto(false);

    try {
      const token = await getToken();
      const esCbu = /^\d+$/.test(busqueda.trim());
      const param = esCbu ? `cbu=${busqueda.trim()}` : `alias=${busqueda.trim()}`;
      const res = await fetch(`${API_URL}/api/transferencias/destinatario?${param}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No encontrado');
      setDestinatario({
        nombre: data.nombre,
        apellido: data.apellido,
        cbu: data.cbu,
        alias: esCbu ? data.alias : busqueda.trim(),
      });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorBusqueda(err.message);
      else setErrorBusqueda('Error al buscar destinatario');
    } finally {
      setBuscando(false);
    }
  };

  const realizarTransferencia = async () => {
    if (!destinatario || !importe || Number(importe) <= 0) return;
    setEnviando(true);
    setErrorTransferencia('');
    setResultado('');

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/transferencias`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cbuDestino: destinatario.cbu,
          importe: Number(importe),
          moneda,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al transferir');
      setResultado(`Transferencia de ${formatearImporte(Number(importe), moneda)} realizada con éxito.`);

      if (agendarContacto) {
        try {
          const token2 = await getToken();
          await fetch(`${API_URL}/api/contactos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
            },
            body: JSON.stringify({
              cbu: destinatario.cbu,
              alias: destinatario.alias || null,
              nombre: destinatario.nombre,
              apellido: destinatario.apellido,
            }),
          });
          cargarContactos();
        } catch {
          // Si falla el guardado del contacto, la transferencia ya se realizó igual.
        }
      }

      setImporte('');
      setDestinatario(null);
      setBusqueda('');
      setAgendarContacto(false);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorTransferencia(err.message);
      else setErrorTransferencia('Error inesperado');
    } finally {
      setEnviando(false);
    }
  };

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
            <button className={styles.navSubItem}>Comercio Exterior</button>
            <button className={styles.navSubItem}>Seguros</button>
            <button className={styles.navSubItem}>Caja de seguridad</button>
            <button className={styles.navSubItem}>Transporte</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Transacciones</span>
            <button className={`${styles.navSubItem} ${styles.navSubItemActive}`}>Transferir</button>
            <button className={styles.navSubItem}>Pago de Servicios</button>
            <button className={styles.navSubItem}>Echeq</button>
            <button className={styles.navSubItem}>Recargas</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Seguridad</span>
            <button className={styles.navSubItem}>Gestión de Token</button>
            <button className={styles.navSubItem}>Seguridad Biométrica</button>
            <button className={styles.navSubItem}>Cambio de Contraseña</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Atención al cliente</span>
            <button className={styles.navSubItem} onClick={() => navigate('/chat')}>Chat</button>
            <button className={styles.navSubItem}>Turnos</button>
            <button className={styles.navSubItem}>Cajeros y sucursales</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Documentos</span>
            <button className={styles.navSubItem} onClick={() => navigate('/historial')}>Historial</button>
            <button className={styles.navSubItem}>Comprobantes</button>
            <button className={styles.navSubItem}>Informes ARCA</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Beneficios</span>
            <button className={styles.navSubItem}>Promociones</button>
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
          <h1 className={styles.topBarTitle}>TRANSFERIR</h1>
          <div className={styles.topBarActions}>
            <span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <div className={styles.pageContent}>
          <div className={styles.pageWrapper}>
            <div className={styles.pageHeader}>
              <h2 className={styles.pageTitle}>Nueva transferencia</h2>
              <p className={styles.pageSubtitle}>Buscá al destinatario por CBU o alias e ingresá el monto.</p>
            </div>

            <div className={styles.steps}>
              <div className={`${styles.step} ${!destinatario ? styles.stepActive : styles.stepDone}`}>
                <span className={styles.stepNumber}>{destinatario ? '✓' : '1'}</span>
                <span className={styles.stepLabel}>Destinatario</span>
              </div>
              <div className={styles.stepDivider} />
              <div
                className={`${styles.step} ${
                  destinatario && !(importe && Number(importe) > 0) ? styles.stepActive : ''
                } ${importe && Number(importe) > 0 ? styles.stepDone : ''} ${!destinatario ? styles.stepPending : ''}`}
              >
                <span className={styles.stepNumber}>{importe && Number(importe) > 0 ? '✓' : '2'}</span>
                <span className={styles.stepLabel}>Monto</span>
              </div>
              <div className={styles.stepDivider} />
              <div
                className={`${styles.step} ${
                  destinatario && importe && Number(importe) > 0 ? styles.stepActive : styles.stepPending
                }`}
              >
                <span className={styles.stepNumber}>3</span>
                <span className={styles.stepLabel}>Confirmar</span>
              </div>
            </div>

            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <div className={styles.formCard}>
                  <h3 className={styles.formCardTitle}>Destinatario</h3>

                  <div className={styles.inputGroup}>
                    <label className={styles.label}>CBU o alias</label>
                    <div className={styles.searchRow}>
                      <input
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && buscarDestinatario()}
                        placeholder="Ej: 0000003100012345678901 o mi.alias"
                        className={styles.searchInput}
                      />
                      <button
                        onClick={buscarDestinatario}
                        disabled={buscando || !busqueda.trim()}
                        className={styles.btnBuscar}
                      >
                        {buscando ? '...' : 'Buscar'}
                      </button>
                    </div>
                    {errorBusqueda && <p className={styles.errorMsg}>{errorBusqueda}</p>}
                  </div>

                  {destinatario && (
                    <div className={styles.destinatarioCard}>
                      <div className={styles.destinatarioAvatar}>
                        {`${destinatario.nombre.charAt(0)}${destinatario.apellido.charAt(0)}`.toUpperCase()}
                      </div>
                      <div className={styles.destinatarioInfo}>
                        <span className={styles.destinatarioNombre}>
                          {destinatario.nombre} {destinatario.apellido}
                        </span>
                        <span className={styles.destinatarioCbu}>CBU: {destinatario.cbu}</span>
                      </div>
                    </div>
                  )}

                  {destinatario && !contactos.some(c => c.cbu === destinatario.cbu) && (
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={agendarContacto}
                        onChange={e => setAgendarContacto(e.target.checked)}
                      />
                      Agendar este CBU/alias como contacto
                    </label>
                  )}
                </div>

                {destinatario && (
                  <div className={styles.formCard}>
                    <h3 className={styles.formCardTitle}>Importe</h3>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Moneda de origen</label>
                      <div className={styles.currencyToggle}>
                        <button
                          type="button"
                          onClick={() => setMoneda('ARS')}
                          className={`${styles.currencyOption} ${moneda === 'ARS' ? styles.currencyOptionActive : ''}`}
                        >
                          Pesos (ARS)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMoneda('USD')}
                          className={`${styles.currencyOption} ${moneda === 'USD' ? styles.currencyOptionActive : ''}`}
                        >
                          Dólares (USD)
                        </button>
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="importe">
                        Monto a transferir ({moneda})
                      </label>
                      <input
                        id="importe"
                        type="number"
                        value={importe}
                        onChange={e => setImporte(e.target.value)}
                        placeholder="Ej: 5000"
                        min="0.01"
                        className={styles.input}
                      />
                    </div>
                  </div>
                )}

                {destinatario && importe && Number(importe) > 0 && (
                  <div className={styles.summaryCard}>
                    <h3 className={styles.formCardTitle}>Resumen de la operación</h3>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Destinatario</span>
                      <span className={styles.summaryValue}>
                        {destinatario.nombre} {destinatario.apellido}
                      </span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>CBU</span>
                      <span className={styles.summaryValueMono}>{destinatario.cbu}</span>
                    </div>
                    <div className={styles.summaryDivider} />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Monto a transferir</span>
                      <span className={styles.summaryAmount}>{formatearImporte(Number(importe), moneda)}</span>
                    </div>
                    <button
                      onClick={realizarTransferencia}
                      disabled={enviando || !importe || Number(importe) <= 0}
                      className={styles.btnTransferir}
                    >
                      {enviando ? 'Procesando...' : 'Confirmar transferencia'}
                    </button>
                  </div>
                )}

                {resultado && <p className={styles.successMsg}>{resultado}</p>}
                {errorTransferencia && <p className={styles.errorMsg}>{errorTransferencia}</p>}
              </div>

              <aside className={styles.contactsSidebar}>
                <h3 className={styles.contactsSidebarTitle}>Contactos guardados</h3>
                {contactos.length === 0 ? (
                  <p className={styles.contactsSidebarEmpty}>
                    Todavía no agendaste contactos. Al confirmar una transferencia vas a poder guardarlos acá.
                  </p>
                ) : (
                  <div className={styles.contactsSidebarList}>
                    {contactos.map(contacto => (
                      <button
                        key={contacto.id}
                        type="button"
                        onClick={() => seleccionarContacto(contacto)}
                        className={styles.contactoRow}
                      >
                        <span className={styles.contactoRowAvatar}>
                          {`${contacto.nombre.charAt(0)}${contacto.apellido.charAt(0)}`.toUpperCase()}
                        </span>
                        <span className={styles.contactoRowInfo}>
                          <span className={styles.contactoRowNombre}>
                            {contacto.nombre} {contacto.apellido}
                          </span>
                          <span className={styles.contactoRowDato}>{contacto.alias || contacto.cbu}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Transferir;
