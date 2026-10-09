import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './AuthShell.module.css';
import banImg from '../assets/banLanding.png';

// Shell de las pantallas sin sesión o previas a la cuenta (Login, Registro, Onboarding):
// el mismo mundo que la Landing — panel vino con la marca y Ban, tarjeta blanca sobre papel.

const PASOS = ['Creá tu usuario', 'Completá tus datos', 'Recibí tu CBU y alias', 'Hacé tu primera transferencia'];

interface AuthShellProps {
  title: string;
  subtitle?: ReactNode;
  // Paso del alta (1 a 4). Sin paso, el panel no muestra el recorrido (Login).
  paso?: number;
  // Lo que dice Ban en el panel vino.
  mensajeBan: string;
  // Tarjeta más ancha para formularios largos (Onboarding).
  ancho?: boolean;
  children: ReactNode;
}

function AuthShell({ title, subtitle, paso, mensajeBan, ancho = false, children }: AuthShellProps) {
  return (
    <div className={styles.page}>
      <a href="#formulario" className={styles.skipLink}>Saltar al formulario</a>

      <aside className={styles.panel}>
        <Link to="/" className={styles.marca} aria-label="404Bank, volver al inicio">
          <span className={styles.marca404}>404</span>
          <span className={styles.marcaBank}>Bank</span>
        </Link>

        {paso && (
          <div className={styles.pasos}>
            <p className={styles.pasoActual}>Paso {paso} de {PASOS.length}</p>
            <ol className={styles.listaPasos}>
              {PASOS.map((nombre, i) => {
                const numero = i + 1;
                const estado = numero < paso ? styles.pasoHecho : numero === paso ? styles.pasoActivo : '';
                return (
                  <li key={nombre} className={`${styles.paso} ${estado}`} aria-current={numero === paso ? 'step' : undefined}>
                    <span className={styles.pasoNumero} aria-hidden="true">{numero < paso ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : numero}</span>
                    <span>{nombre}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <div className={styles.ban}>
          <p className={styles.globo}>{mensajeBan}</p>
          <img src={banImg} alt="" width={300} height={598} className={styles.banImg} />
        </div>
      </aside>

      <main className={styles.contenido} id="formulario" tabIndex={-1}>
        <div className={`${styles.tarjeta} ${ancho ? styles.tarjetaAncha : ''}`}>
          <h1 className={styles.titulo}>{title}</h1>
          {/* En celular el recorrido del panel vino no se ve: el paso se dice debajo del título, no como etiqueta encima. */}
          {paso && <p className={styles.pasoMovil}>Paso {paso} de {PASOS.length}: {PASOS[paso - 1].toLowerCase()}</p>}
          {subtitle && <p className={styles.subtitulo}>{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

export default AuthShell;
