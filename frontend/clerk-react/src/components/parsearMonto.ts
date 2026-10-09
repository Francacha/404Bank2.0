// Lee un monto escrito a la argentina o "a la computadora" y devuelve el número (o NaN).
//   "1.500,50" → 1500.5   "1500,5" → 1500.5   "1.500" → 1500   "1500.50" → 1500.5   "$ 2.000" → 2000
// Con coma, los puntos son de miles. Sin coma, un punto seguido de exactamente 3 dígitos también es de miles.
export function parsearMonto(texto: string): number {
  const limpio = texto.replace(/[^\d.,]/g, '');
  if (!limpio) return NaN;

  if (limpio.includes(',')) {
    return Number(limpio.replace(/\./g, '').replace(',', '.'));
  }
  const partes = limpio.split('.');
  if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) {
    return Number(partes.join(''));
  }
  return Number(limpio);
}
