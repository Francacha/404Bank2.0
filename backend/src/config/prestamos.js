// Parámetros de los préstamos. Todos se pueden ajustar desde el .env.

// Tasa Nominal Anual (%) que se fija en cada préstamo al momento de solicitarlo.
// Referencia: ~56% TNA del Banco Nación para clientes que acreditan sueldo.
const TNA = Number(process.env.PRESTAMOS_TNA ?? 56);

// Recargo punitorio (%) sobre la TNA para la deuda en mora. Con 50, la deuda atrasada
// devenga la tasa compensatoria más un 50% adicional (56% + 28% = 84% anual).
const RECARGO_PUNITORIO = Number(process.env.PRESTAMOS_RECARGO_PUNITORIO ?? 50);

// IVA (%) sobre los intereses, como se cobra en los préstamos personales en Argentina.
// Con 56% TNA + 21% IVA el costo financiero total efectivo anual (CFTEA) da ~93,3%.
const IVA_INTERESES = Number(process.env.PRESTAMOS_IVA_INTERESES ?? 21);

// Separación entre vencimientos (intervalo de PostgreSQL). En producción es mensual;
// para probar los cobros se puede usar algo como CUOTAS_INTERVALO='10 minutes'.
// Los intereses y los días de atraso se escalan a este intervalo: un intervalo equivale a un mes.
const CUOTAS_INTERVALO = process.env.CUOTAS_INTERVALO || '1 month';

const CUOTAS_PERMITIDAS = [1, 3, 6, 12, 24, 36];

// Tasa mensual efectiva que paga el cliente: interés compensatorio + IVA sobre ese interés.
const tasaMensualConIva = (tna) => Number(tna) / 100 / 12 * (1 + IVA_INTERESES / 100);

// Plan de pagos con sistema francés: cuota fija, el interés de cada período se calcula
// sobre el capital que queda pendiente. Se trabaja en centavos para evitar errores de redondeo;
// la última cuota absorbe la diferencia para que el capital quede saldado exacto.
const calcularPlanFrances = (monto, cantCuotas, tna) => {
  const tasaInteres = Number(tna) / 100 / 12;
  const tasaMensual = tasaMensualConIva(tna);
  const capitalCentavos = Math.round(Number(monto) * 100);
  const cuotaCentavos = tasaMensual === 0
    ? Math.round(capitalCentavos / cantCuotas)
    : Math.round(capitalCentavos * tasaMensual / (1 - Math.pow(1 + tasaMensual, -cantCuotas)));

  let saldoCentavos = capitalCentavos;
  const cuotas = [];
  for (let numero = 1; numero <= cantCuotas; numero++) {
    const interes = Math.round(saldoCentavos * tasaInteres);
    const iva = Math.round(interes * IVA_INTERESES / 100);
    const capital = numero === cantCuotas ? saldoCentavos : cuotaCentavos - interes - iva;
    saldoCentavos -= capital;
    cuotas.push({
      numero_cuota: numero,
      capital: capital / 100,
      interes: interes / 100,
      iva: iva / 100,
      monto: (capital + interes + iva) / 100
    });
  }

  const totalCentavos = cuotas.reduce((acc, c) => acc + Math.round(c.monto * 100), 0);
  return {
    cuotas,
    monto_cuota: cuotas[0].monto,
    monto_total: totalCentavos / 100,
    // Aumento total sobre el capital, en %
    recargo_porcentaje: Math.round((totalCentavos / capitalCentavos - 1) * 10000) / 100,
    tea: Math.round((Math.pow(1 + tasaInteres, 12) - 1) * 10000) / 100,
    cftea: Math.round((Math.pow(1 + tasaMensual, 12) - 1) * 10000) / 100
  };
};

module.exports = { TNA, RECARGO_PUNITORIO, IVA_INTERESES, CUOTAS_INTERVALO, CUOTAS_PERMITIDAS, calcularPlanFrances };
