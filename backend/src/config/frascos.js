// Parámetros de los frascos de ahorro (dinero apartado a plazo con interés compuesto).

// Duración de un "día" del frasco (intervalo de PostgreSQL). En producción es 1 day;
// para probar se puede usar FRASCOS_DIA='1 minute' y un frasco de 30 días vence en 30 minutos.
const FRASCOS_DIA = process.env.FRASCOS_DIA || '1 day';

// Plazos disponibles y su Tasa Nominal Anual (%): a más plazo, mejor tasa.
const PLAZOS = [
  { dias: 7, tna: 28 },
  { dias: 30, tna: 30 },
  { dias: 60, tna: 31 },
  { dias: 90, tna: 32 },
  { dias: 180, tna: 33 },
  { dias: 365, tna: 35 },
];

const MONTO_MINIMO = 1000;

const redondear = (valor) => Math.round(valor * 100) / 100;

// Interés compuesto diario: cada día el interés se suma al capital y genera interés al día siguiente.
const calcularValor = (monto, tna, dias) => redondear(Number(monto) * Math.pow(1 + Number(tna) / 100 / 365, dias));

const buscarPlazo = (dias) => PLAZOS.find((p) => p.dias === Number(dias));

module.exports = { FRASCOS_DIA, PLAZOS, MONTO_MINIMO, calcularValor, buscarPlazo };
