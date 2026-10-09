import styles from './TarjetaVisual.module.css';

// La tarjeta física de 404Bank: la misma en Inicio y en Tarjetas.
// Débito en negro cálido, crédito en el gradiente vino del hero. El número va enmascarado
// salvo que se pasen los datos completos (los pide "Ver datos" y se ocultan solos).

interface TarjetaVisualProps {
  tipo: 'debito' | 'credito' | string;
  ultimos4: string | null;
  titular: string;
  // 'YYYY-MM-DD' del backend
  vencimiento: string | null;
  datos?: { numero: string; cvv: string } | null;
}

// MM/AA sin pasar por Date: un 'YYYY-MM-DD' se interpreta en UTC y en Argentina puede correrse un día.
export const vencimientoCorto = (fecha: string | null) => {
  if (!fecha) return '--/--';
  const [anio, mes] = fecha.slice(0, 10).split('-');
  return `${mes}/${anio.slice(2)}`;
};

const agrupar = (numero: string) => numero.replace(/(.{4})/g, '$1 ').trim();

function TarjetaVisual({ tipo, ultimos4, titular, vencimiento, datos }: TarjetaVisualProps) {
  const esCredito = tipo === 'credito';
  const nombreTipo = esCredito ? 'Crédito' : 'Débito';
  const fin = ultimos4 ?? '····';

  return (
    <div className={`${styles.tarjeta} ${esCredito ? styles.credito : styles.debito}`}>
      <p className={styles.srOnly}>
        Tarjeta de {nombreTipo.toLowerCase()} terminada en {fin}, a nombre de {titular}, vence {vencimientoCorto(vencimiento)}.
      </p>

      <div className={styles.arriba} aria-hidden="true">
        <span className={styles.marca}>
          <span className={styles.marca404}>404</span>
          <span className={styles.marcaBank}>Bank</span>
        </span>
        <span className={styles.tipo}>{nombreTipo}</span>
      </div>

      <span className={styles.chip} aria-hidden="true" />

      {datos ? (
        <p className={styles.numero}>
          <span className={styles.srOnly}>Número completo: </span>
          {agrupar(datos.numero)}
        </p>
      ) : (
        <p className={styles.numero} aria-hidden="true">
          <span className={styles.puntos}>•••• •••• ••••</span> {fin}
        </p>
      )}

      <div className={styles.abajo}>
        <div className={styles.dato} aria-hidden="true">
          <span className={styles.etiqueta}>Titular</span>
          <span className={styles.valor}>{titular}</span>
        </div>
        <div className={styles.datosDerecha}>
          <div className={styles.dato} aria-hidden="true">
            <span className={styles.etiqueta}>Vence</span>
            <span className={styles.valorCifra}>{vencimientoCorto(vencimiento)}</span>
          </div>
          {datos && (
            <div className={styles.dato}>
              <span className={styles.etiqueta}>CVV</span>
              <span className={styles.valorCifra}>{datos.cvv}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TarjetaVisual;
