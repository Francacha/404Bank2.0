import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import banImg from '../assets/banListo.png';
import styles from './Chat.module.css';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const LARGO_MAXIMO = 2000;

interface Mensaje {
  id: string;
  from: 'user' | 'ban';
  text: string;
  // Un error no es una respuesta de Ban: se muestra distinto, se puede reintentar y no viaja a Gemini.
  error?: boolean;
  reintento?: string;
}

const SUGERENCIAS = [
  '¿Cómo transfiero a un alias?',
  '¿Dónde veo mi CBU?',
  '¿Cómo funciona un frasco de ahorro?',
  '¿Cuánto pago por un préstamo?',
  '¿Cómo pido una tarjeta?',
];

// Secciones reales de la app: si Ban nombra una en negrita, se vuelve un link.
const SECCIONES: Record<string, string> = {
  inicio: '/home',
  transferir: '/transferir',
  historial: '/historial',
  prestamos: '/prestamos',
  inversiones: '/inversiones',
  'frascos de ahorro': '/inversiones?tab=frascos',
  frascos: '/inversiones?tab=frascos',
  tarjetas: '/tarjetas',
  'mi perfil': '/perfil',
  perfil: '/perfil',
};

const normalizar = (texto: string) =>
  texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const nuevoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Formato de las respuestas ──
// Gemini responde con un markdown mínimo (párrafos, guiones, **negrita**). Se arma con elementos
// de React, nunca con HTML, así una respuesta no puede inyectar código en la página.
const MONTO = /((?:US\$|\$)\s?\d{1,3}(?:\.\d{3})*(?:,\d+)?|(?:US\$|\$)\s?\d+(?:,\d+)?)/g;

function conMontos(texto: string, clave: string): ReactNode[] {
  return texto.split(MONTO).map((parte, i) =>
    i % 2 === 1
      ? <span key={`${clave}-m${i}`} className={styles.monto}>{parte}</span>
      : <Fragment key={`${clave}-t${i}`}>{parte}</Fragment>
  );
}

function enLinea(texto: string, clave: string): ReactNode[] {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => {
    if (i % 2 === 0) return <Fragment key={`${clave}-${i}`}>{conMontos(parte, `${clave}-${i}`)}</Fragment>;
    const ruta = SECCIONES[normalizar(parte)];
    return ruta
      ? <Link key={`${clave}-${i}`} to={ruta} className={styles.linkSeccion}>{parte}</Link>
      : <strong key={`${clave}-${i}`}>{conMontos(parte, `${clave}-${i}`)}</strong>;
  });
}

const ITEM = /^\s*([-*•]|\d+[.)])\s+/;

// Cada bloque (separado por línea en blanco) se parte en tramos: líneas de lista seguidas forman
// una lista; el resto, un párrafo. Gemini suele poner "Por ejemplo:" y los guiones sin línea en blanco.
function RespuestaBan({ texto }: { texto: string }) {
  const tramos: { lista: boolean; lineas: string[] }[] = [];
  texto.replace(/\r\n/g, '\n').split(/\n{2,}/).forEach(bloque => {
    let anterior: { lista: boolean; lineas: string[] } | null = null;
    bloque.split('\n').filter(l => l.trim()).forEach(linea => {
      const lista = ITEM.test(linea);
      if (anterior && anterior.lista === lista) anterior.lineas.push(linea);
      else {
        anterior = { lista, lineas: [linea] };
        tramos.push(anterior);
      }
    });
  });

  return (
    <>
      {tramos.map((tramo, b) => {
        if (tramo.lista) {
          const items = tramo.lineas.map((l, i) => <li key={i}>{enLinea(l.replace(ITEM, ''), `${b}-${i}`)}</li>);
          return /^\s*\d/.test(tramo.lineas[0])
            ? <ol key={b} className={styles.lista}>{items}</ol>
            : <ul key={b} className={styles.lista}>{items}</ul>;
        }
        return (
          <p key={b} className={styles.parrafo}>
            {tramo.lineas.map((l, i) => (
              <Fragment key={i}>{i > 0 && <br />}{enLinea(l.replace(/^#+\s*/, ''), `${b}-${i}`)}</Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function AvatarBan() {
  return (
    <span className={styles.avatar} aria-hidden="true">
      <img src={banImg} alt="" width={240} height={324} />
    </span>
  );
}

function Chat() {
  const { getToken, userId } = useAuth();
  const claveSesion = `404bank-chat-${userId ?? 'anon'}`;

  // La conversación dura lo que la pestaña del navegador: se puede ir a otra sección y volver.
  const [mensajes, setMensajes] = useState<Mensaje[]>(() => {
    try {
      const guardado = sessionStorage.getItem(claveSesion);
      return guardado ? JSON.parse(guardado) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const seguirAlFinal = useRef(true);
  const enviandoRef = useRef(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(claveSesion, JSON.stringify(mensajes.slice(-40)));
    } catch {
      // Sin almacenamiento la conversación igual funciona; solo no se recuerda al volver.
    }
  }, [mensajes, claveSesion]);

  // ¿El usuario está mirando el final? Si subió a leer algo, no lo arrastramos hacia abajo.
  const cercaDelFinal = () => {
    const area = areaRef.current;
    if (area && area.scrollHeight > area.clientHeight + 1) {
      return area.scrollHeight - area.scrollTop - area.clientHeight < 140;
    }
    const doc = document.documentElement;
    return doc.scrollHeight - window.scrollY - window.innerHeight < 220;
  };

  useLayoutEffect(() => {
    if (!seguirAlFinal.current) return;
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    finalRef.current?.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'end' });
  }, [mensajes, escribiendo]);

  const enviar = async (texto: string) => {
    const consulta = texto.trim();
    if (!consulta || enviandoRef.current) return;
    enviandoRef.current = true;

    // Historial para Gemini: solo lo que realmente se dijeron (sin errores), los últimos 10.
    // Al reintentar, la misma pregunta puede seguir al final: no se manda dos veces.
    const previos = mensajes.filter(m => !m.error);
    if (previos.at(-1)?.from === 'user' && previos.at(-1)?.text === consulta) previos.pop();
    const historial = previos.slice(-10).map(m => ({ from: m.from, text: m.text }));

    seguirAlFinal.current = true;
    setMensajes(prev => [...prev, { id: nuevoId(), from: 'user', text: consulta }]);
    setInput('');
    setEscribiendo(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: consulta, history: historial }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error || 'Ban no pudo responder ahora. Probá de nuevo en un momento.');
      }
      seguirAlFinal.current = cercaDelFinal();
      setMensajes(prev => [...prev, { id: nuevoId(), from: 'ban', text: data.reply }]);
    } catch (err) {
      seguirAlFinal.current = true;
      const texto = err instanceof Error && err.message !== 'Failed to fetch'
        ? err.message
        : 'No pudimos conectarnos con Ban. Revisá tu conexión y probá de nuevo.';
      // El mensaje del usuario se saca para no duplicarlo al reintentar.
      setMensajes(prev => [
        ...prev.slice(0, -1),
        { id: nuevoId(), from: 'user', text: consulta },
        { id: nuevoId(), from: 'ban', text: texto, error: true, reintento: consulta },
      ]);
    } finally {
      enviandoRef.current = false;
      setEscribiendo(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const reintentar = (consulta: string) => {
    // Se quita el par (pregunta + error) y se vuelve a mandar la misma pregunta.
    setMensajes(prev => {
      const i = prev.findIndex(m => m.error && m.reintento === consulta);
      return i > 0 ? [...prev.slice(0, i - 1), ...prev.slice(i + 1)] : prev;
    });
    setTimeout(() => enviar(consulta), 0);
  };

  const nuevaConversacion = () => {
    setMensajes([]);
    setInput('');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void enviar(input);
  };

  // Enter envía; Shift+Enter hace un salto de línea.
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void enviar(input);
    }
  };

  // El textarea crece con el texto hasta 5 líneas.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const vacia = mensajes.length === 0;
  const restantes = LARGO_MAXIMO - input.length;

  return (
    <AppLayout
      title="Chat con Ban"
      subtitle="Te explico cómo usar 404Bank. No veo tu saldo ni hago operaciones por vos."
      variant="fill"
      ancho="lectura"
    >
      <div className={styles.chat}>
        <div
          ref={areaRef}
          className={styles.area}
          onScroll={() => { seguirAlFinal.current = cercaDelFinal(); }}
        >
          {vacia ? (
            <div className={styles.inicio}>
              <img src={banImg} alt="" width={240} height={324} className={styles.inicioBan} />
              <div className={styles.inicioTexto}>
                <h2 className={styles.inicioTitulo}>¡Hola! Soy Ban.</h2>
                <p>
                  Preguntame cómo transferir, pedir un préstamo, armar un frasco o lo que no entiendas de 404Bank.
                  No veo tu saldo ni tus datos: para eso está <Link to="/home" className={styles.linkSeccion}>Inicio</Link>.
                </p>
                <div className={styles.sugerencias} role="group" aria-label="Preguntas sugeridas">
                  {SUGERENCIAS.map(s => (
                    <button key={s} type="button" className={styles.chip} onClick={() => enviar(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.encabezado}>
              <button type="button" className={styles.btnNueva} onClick={nuevaConversacion} disabled={escribiendo}>
                Nueva conversación
              </button>
            </div>
          )}

          <ol className={styles.mensajes} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversación con Ban">
            {mensajes.map(m => (
              <li key={m.id} className={m.from === 'user' ? styles.filaUsuario : styles.filaBan}>
                {m.from === 'ban' && <AvatarBan />}
                <div
                  className={
                    m.from === 'user' ? styles.burbujaUsuario : m.error ? styles.burbujaError : styles.burbujaBan
                  }
                >
                  <span className={styles.srOnly}>{m.from === 'user' ? 'Vos: ' : 'Ban: '}</span>
                  {m.from === 'ban' && !m.error ? (
                    <RespuestaBan texto={m.text} />
                  ) : (
                    <p className={styles.parrafo}>{m.text}</p>
                  )}
                  {m.error && m.reintento && (
                    <button
                      type="button"
                      className={styles.btnReintentar}
                      onClick={() => reintentar(m.reintento!)}
                      disabled={escribiendo}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </li>
            ))}
            {escribiendo && (
              <li className={styles.filaBan}>
                <AvatarBan />
                <div className={styles.burbujaBan}>
                  <span className={styles.srOnly}>Ban está escribiendo…</span>
                  <span className={styles.puntos} aria-hidden="true"><span /><span /><span /></span>
                </div>
              </li>
            )}
          </ol>
          <div ref={finalRef} />
        </div>

        <form onSubmit={onSubmit} className={styles.barra}>
          <label htmlFor="mensaje-ban" className={styles.srOnly}>Mensaje para Ban</label>
          <textarea
            id="mensaje-ban"
            ref={inputRef}
            rows={1}
            className={styles.campo}
            placeholder="Escribile a Ban…"
            value={input}
            maxLength={LARGO_MAXIMO}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            aria-describedby={restantes < 200 ? 'mensaje-restantes' : undefined}
          />
          {restantes < 200 && (
            <span id="mensaje-restantes" className={styles.restantes}>{restantes}</span>
          )}
          <button type="submit" className={styles.btnEnviar} disabled={!input.trim() || escribiendo} aria-label="Enviar mensaje">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </form>
      </div>
    </AppLayout>
  );
}

export default Chat;
