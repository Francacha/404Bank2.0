import { useState, useRef, useEffect } from 'react';
import { useUser, useAuth , SignOutButton } from '@clerk/react';
import { useNavigate } from 'react-router-dom';
import { useViewMode } from '../context/ViewModeContext';
import styles from './Chat.module.css';

interface Message {
  id: number;
  from: 'user' | 'ban';
  text: string;
}

const QA = [
  {
    keywords: ['cbu', 'número de cuenta', 'alias', 'cuenta'],
    question: '¿Cómo obtengo mi CBU?',
    answer: 'Tu CBU lo encontrás en la sección Inicio, dentro del resumen de tu cuenta. Podés usarlo para recibir transferencias desde cualquier banco del país.',
  },
  {
    keywords: ['transferir', 'transferencia', 'enviar dinero', 'enviar plata', 'mandar plata'],
    question: '¿Cómo hago una transferencia?',
    answer: 'Desde el menú lateral andá a Transacciones → Transferir. Ingresá el CBU del destinatario, el monto y confirmá. Las transferencias son inmediatas las 24 horas.',
  },
  {
    keywords: ['tarjeta', 'solicitar tarjeta', 'débito', 'crédito', 'pedir tarjeta'],
    question: '¿Cómo solicito una tarjeta?',
    answer: 'Podés solicitar una tarjeta de débito o crédito desde Productos → Tarjetas. Elegí el tipo, enviá la solicitud y un empleado la revisará. Te notificaremos cuando esté aprobada.',
  },
  {
    keywords: ['préstamo', 'prestamo', 'crédito personal', 'solicitar préstamo', 'pedir prestamo', 'plata prestada'],
    question: '¿Cómo solicito un préstamo?',
    answer: 'Desde Productos → Préstamos ingresá el monto que necesitás y enviá la solicitud. Un asesor evaluará tu pedido y recibirás una respuesta en los próximos días hábiles.',
  },
  {
    keywords: ['horario', 'sucursal', 'cajero', 'horarios', 'dónde están', 'donde estan'],
    question: '¿Cuáles son los horarios de atención?',
    answer: 'Nuestras sucursales atienden de lunes a viernes de 10:00 a 15:00 hs. La banca digital está disponible las 24 horas. Encontrás cajeros y sucursales en Atención al cliente → Cajeros y sucursales.',
  },
  {
    keywords: ['contraseña', 'password', 'cambiar contraseña', 'clave', 'cambiar clave'],
    question: '¿Cómo cambio mi contraseña?',
    answer: 'Podés cambiar tu contraseña desde Seguridad → Cambio de Contraseña en el menú lateral. Usá una contraseña segura y única para proteger tu cuenta.',
  },
  {
    keywords: ['límite', 'limite', 'máximo', 'cuánto puedo transferir', 'monto máximo'],
    question: '¿Cuál es el límite de transferencia?',
    answer: 'El límite diario de transferencia para cuentas estándar es de $500.000. Si necesitás operar montos mayores, comunicáte con un asesor desde Atención al cliente → Turnos.',
  },
  {
    keywords: ['cvv', 'código de seguridad', 'vencimiento', 'datos tarjeta', 'numero tarjeta'],
    question: '¿Dónde veo el CVV de mi tarjeta?',
    answer: 'Los datos de tu tarjeta (número, CVV y vencimiento) los podés ver en Productos → Tarjetas, en la tarjeta que figure como activa.',
  },
  {
    keywords: ['persona', 'humano', 'asesor', 'hablar con alguien', 'soporte', 'turno'],
    question: '¿Cómo hablo con un asesor?',
    answer: 'Podés solicitar un turno desde Atención al cliente → Turnos, o acercarte a cualquier sucursal en horario de atención de lunes a viernes de 10:00 a 15:00 hs.',
  },
  {
    keywords: ['saldo', 'cuánto tengo', 'plata disponible', 'dinero', 'cuanto tengo'],
    question: '¿Cómo veo mi saldo?',
    answer: 'Tu saldo actual lo podés ver en la pantalla de Inicio, en la sección Cuentas. Se actualiza en tiempo real con cada movimiento.',
  },
];

const SUGGESTED = QA.slice(0, 5).map(q => q.question);

const FALLBACK =
  'No entendí bien tu consulta. Podés reformularla o elegir una de las preguntas sugeridas. Si necesitás ayuda personalizada, un asesor está disponible en Atención al cliente → Turnos.';

const WELCOME =
  '¡Hola! Soy Ban, tu asistente virtual de 404Bank. ¿En qué puedo ayudarte hoy?';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

let nextId = 1;

function Chat() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { setViewMode } = useViewMode();

  const role = user?.publicMetadata?.role as string | undefined;
  const esLaboral = role === 'empleado' || role === 'gerente';
  const panelUrl = role === 'gerente' ? '/gerente' : '/empleado';
  const initials = `${user?.firstName?.charAt(0) ?? ''}${user?.lastName?.charAt(0) ?? ''}`;
  const displayName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Usuario';

  const [messages, setMessages] = useState<Message[]>([
    { id: nextId++, from: 'ban', text: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: nextId++, from: 'user', text: text.trim() }]);
    setInput('');
    setShowChips(false);
    setIsTyping(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-10),
        }),
      });

      if (!res.ok) throw new Error('Respuesta no válida');
      const data = await res.json();
      setMessages(prev => [...prev, { id: nextId++, from: 'ban', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { id: nextId++, from: 'ban', text: FALLBACK }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
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
            <button className={styles.navSubItem}>Inversiones</button>
            <button className={styles.navSubItem}>Comercio Exterior</button>
            <button className={styles.navSubItem}>Seguros</button>
            <button className={styles.navSubItem}>Caja de seguridad</button>
            <button className={styles.navSubItem}>Transporte</button>
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupTitle}>Transacciones</span>
            <button className={styles.navSubItem} onClick={() => navigate('/transferir')}>Transferir</button>
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
            <button className={`${styles.navSubItem} ${styles.navSubItemActive}`}>Chat</button>
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
          <h1 className={styles.topBarTitle}>CHAT</h1>
          <div className={styles.topBarActions}>
            <span className={styles.topUserName}>{displayName}</span>
            <SignOutButton signOutOptions={{ redirectUrl: '/login' }}>
              <button className={styles.btnSignOut}>Cerrar sesion</button>
            </SignOutButton>
          </div>
        </header>

        <div className={styles.chatWrapper}>
          <div className={styles.messagesArea}>
            {messages.map(msg => (
              <div key={msg.id} className={msg.from === 'user' ? styles.rowUser : styles.rowBan}>
                {msg.from === 'ban' && <div className={styles.banAvatar}>B</div>}
                <div className={msg.from === 'user' ? styles.bubbleUser : styles.bubbleBan}>
                  {msg.from === 'ban' && <span className={styles.banName}>Ban</span>}
                  <p className={styles.bubbleText}>{msg.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className={styles.rowBan}>
                <div className={styles.banAvatar}>B</div>
                <div className={styles.bubbleBan}>
                  <span className={styles.banName}>Ban</span>
                  <div className={styles.typingDots}>
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            {showChips && !isTyping && (
              <div className={styles.chipsRow}>
                {SUGGESTED.map(q => (
                  <button key={q} className={styles.chip} onClick={() => sendMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.inputBar}>
            <input
              className={styles.inputField}
              type="text"
              placeholder="Escribí tu consulta..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
              autoComplete="off"
            />
            <button
              type="submit"
              className={styles.btnSend}
              disabled={!input.trim() || isTyping}
            >
              Enviar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Chat;
