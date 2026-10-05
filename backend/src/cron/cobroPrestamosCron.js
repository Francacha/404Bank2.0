const cron = require('node-cron');
const { pool } = require('../config/db');
const { informarDeuda } = require('../services/centralBankService');
const { RECARGO_PUNITORIO, CUOTAS_INTERVALO } = require('../config/prestamos');

// Por defecto corre cada 10 minutos.
const CRON_SCHEDULE = process.env.CRON_COBROS_SCHEDULE || '*/10 * * * *';
const CRON_TIMEZONE = 'America/Argentina/Buenos_Aires';

let enEjecucion = false;

// Ciclo de una cuota:
//   pendiente -> pagada   si al vencer la cuenta tiene saldo suficiente.
//   pendiente -> vencida  si no alcanza: se debita igual y la cuenta queda en negativo (mora).
//                         Mientras tanto la deuda devenga punitorios, que también se debitan.
//   vencida   -> pagada   cuando ingresa dinero que cubre la deuda (la cuenta vuelve a >= 0).
// Como la deuda vive en el saldo negativo, cualquier ingreso (transferencia, venta de dólares)
// la descuenta solo, y las transferencias salientes quedan bloqueadas por saldo insuficiente.

// DNI del primer titular de la cuenta de un préstamo (se usa para informar al Banco Central)
const TITULAR_DNI = `
  CROSS JOIN LATERAL (
      SELECT p.dni FROM titulares_cuenta tc
      JOIN personas p ON tc.id_persona = p.id
      WHERE tc.id_cuenta = cb.id_cuenta
      ORDER BY p.id
      LIMIT 1
  ) titular`;

const centavos = (valor) => Math.round(Number(valor) * 100);

// Clasificación de deudores del BCRA según los días de atraso
const calcularSituacion = (diasAtraso) => {
    if (diasAtraso <= 30) return 1;  // Normal
    if (diasAtraso <= 60) return 2;  // Riesgo bajo
    if (diasAtraso <= 90) return 3;  // Riesgo medio
    if (diasAtraso <= 180) return 4; // Riesgo alto
    return 5;                        // Irrecuperable
};

// Marca como finalizados los préstamos que ya no tienen cuotas sin pagar
const finalizarPrestamos = (client, idsPrestamo) => client.query(
    `UPDATE prestamos pr SET estado = 'finalizado'
     WHERE pr.id = ANY($1::int[]) AND pr.estado = 'aprobado'
       AND NOT EXISTS (
           SELECT 1 FROM cuotas_prestamo cp WHERE cp.id_prestamo = pr.id AND cp.estado <> 'pagada'
       )`,
    [idsPrestamo]
);

// Ejecuta fn dentro de una transacción y devuelve su resultado
const enTransaccion = async (fn) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const resultado = await fn(client);
        await client.query('COMMIT');
        return resultado;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// 1. Imputa a las cuotas vencidas el dinero que ingresó a la cuenta, de la más vieja a la más nueva.
// Lo cubierto es la deuda total de las cuotas vencidas menos lo que sigue en negativo.
// Devuelve true si la cuenta quedó sin cuotas vencidas.
const regularizarCuenta = (idCuenta) => enTransaccion(async (client) => {
    const cuentaResult = await client.query(
        'SELECT saldo FROM cuentas_bancarias WHERE id_cuenta = $1 FOR UPDATE',
        [idCuenta]
    );
    const cuotasResult = await client.query(
        `SELECT cp.id, cp.id_prestamo, cp.monto, cp.punitorios
         FROM cuotas_prestamo cp
         JOIN prestamos pr ON cp.id_prestamo = pr.id
         WHERE pr.id_cuenta = $1 AND cp.estado = 'vencida'
         ORDER BY cp.fecha_vencimiento ASC, cp.numero_cuota ASC
         FOR UPDATE OF cp`,
        [idCuenta]
    );

    const cuotas = cuotasResult.rows;
    if (cuotas.length === 0) return false;

    const deudaCuotas = cuotas.reduce((acc, c) => acc + centavos(c.monto) + centavos(c.punitorios), 0);
    const enNegativo = Math.max(0, -centavos(cuentaResult.rows[0].saldo));
    const cubierto = deudaCuotas - enNegativo;

    const pagadas = [];
    let acumulado = 0;
    for (const cuota of cuotas) {
        const deuda = centavos(cuota.monto) + centavos(cuota.punitorios);
        if (acumulado + deuda > cubierto) break;
        acumulado += deuda;
        pagadas.push(cuota);
    }

    if (pagadas.length === 0) return false;

    await client.query(
        `UPDATE cuotas_prestamo SET estado = 'pagada', fecha_pago = NOW() WHERE id = ANY($1::int[])`,
        [pagadas.map((c) => c.id)]
    );
    await finalizarPrestamos(client, pagadas.map((c) => c.id_prestamo));

    const regularizada = pagadas.length === cuotas.length;
    if (regularizada) {
        await client.query(
            'UPDATE cuentas_bancarias SET ultimo_devengo_mora = NULL WHERE id_cuenta = $1',
            [idCuenta]
        );
    }
    return regularizada;
});

// Devuelve los DNI de los clientes que cancelaron toda su deuda en esta corrida
const regularizarCuentas = async () => {
    const cuentasResult = await pool.query(
        `SELECT DISTINCT cb.id_cuenta, titular.dni
         FROM cuotas_prestamo cp
         JOIN prestamos pr ON cp.id_prestamo = pr.id
         JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
         ${TITULAR_DNI}
         WHERE cp.estado = 'vencida'`
    );

    const dnisRegularizados = new Set();
    for (const { id_cuenta, dni } of cuentasResult.rows) {
        try {
            if (await regularizarCuenta(id_cuenta)) {
                dnisRegularizados.add(dni);
                console.log(`[Cobros] Cuenta ${id_cuenta} regularizada: cuotas vencidas canceladas.`);
            }
        } catch (error) {
            console.error(`[Cobros] Error regularizando la cuenta ${id_cuenta}:`, error.message);
        }
    }
    return dnisRegularizados;
};

// 2. Cobra una cuota que llegó a su vencimiento. Devuelve el estado final de la cuota.
const cobrarCuota = (idCuota) => enTransaccion(async (client) => {
    // Se bloquean la cuota y la cuenta para que un cobro no se procese dos veces
    // ni choque con una transferencia que esté moviendo el mismo saldo.
    const cuotaResult = await client.query(
        `SELECT cp.id, cp.id_prestamo, cp.monto, cb.id_cuenta, cb.saldo
         FROM cuotas_prestamo cp
         JOIN prestamos pr ON cp.id_prestamo = pr.id
         JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
         WHERE cp.id = $1 AND cp.estado = 'pendiente'
         FOR UPDATE OF cp, cb`,
        [idCuota]
    );

    if (cuotaResult.rows.length === 0) return null; // ya fue procesada por otra corrida

    const cuota = cuotaResult.rows[0];
    const alcanza = Number(cuota.saldo) >= Number(cuota.monto);

    // Se debita siempre: si no alcanza, la cuenta queda en negativo y empieza a correr la mora
    await client.query(
        `UPDATE cuentas_bancarias
         SET saldo = saldo - $1,
             ultimo_devengo_mora = CASE WHEN $3 THEN ultimo_devengo_mora
                                        ELSE COALESCE(ultimo_devengo_mora, NOW()) END
         WHERE id_cuenta = $2`,
        [cuota.monto, cuota.id_cuenta, alcanza]
    );
    await client.query(
        `INSERT INTO movimientos_prestamo (id_cuenta, id_prestamo, id_cuota, tipo, importe)
         VALUES ($1, $2, $3, 'cuota', $4)`,
        [cuota.id_cuenta, cuota.id_prestamo, cuota.id, cuota.monto]
    );

    if (alcanza) {
        await client.query(
            `UPDATE cuotas_prestamo SET estado = 'pagada', fecha_pago = NOW() WHERE id = $1`,
            [cuota.id]
        );
        await finalizarPrestamos(client, [cuota.id_prestamo]);
        return 'pagada';
    }

    await client.query(`UPDATE cuotas_prestamo SET estado = 'vencida' WHERE id = $1`, [cuota.id]);
    return 'vencida';
});

const cobrarCuotasVencidas = async () => {
    const cuotasResult = await pool.query(
        `SELECT id FROM cuotas_prestamo
         WHERE fecha_vencimiento <= NOW() AND estado = 'pendiente'
         ORDER BY fecha_vencimiento ASC, numero_cuota ASC`
    );

    let pagadas = 0;
    let impagas = 0;
    for (const { id } of cuotasResult.rows) {
        try {
            const estadoFinal = await cobrarCuota(id);
            if (estadoFinal === 'pagada') pagadas++;
            else if (estadoFinal === 'vencida') impagas++;
        } catch (error) {
            console.error(`[Cobros] Error cobrando la cuota ${id}:`, error.message);
        }
    }

    if (cuotasResult.rows.length > 0) {
        console.log(`[Cobros] ${cuotasResult.rows.length} cuotas procesadas: ${pagadas} pagadas, ${impagas} impagas.`);
    }
};

// 3. Cobra intereses punitorios sobre el saldo negativo por el tiempo transcurrido desde el último cobro.
// Tasa: TNA del préstamo + RECARGO_PUNITORIO% de esa TNA, proporcional a los meses (intervalos) de atraso.
// Se imputan a la cuota vencida más antigua para que se cancelen junto con ella.
const devengarPunitoriosCuenta = (idCuenta) => enTransaccion(async (client) => {
    const cuentaResult = await client.query(
        `SELECT saldo,
                EXTRACT(EPOCH FROM NOW() - ultimo_devengo_mora) / EXTRACT(EPOCH FROM $2::interval) AS periodos
         FROM cuentas_bancarias
         WHERE id_cuenta = $1 AND saldo < 0 AND ultimo_devengo_mora IS NOT NULL
         FOR UPDATE`,
        [idCuenta, CUOTAS_INTERVALO]
    );
    if (cuentaResult.rows.length === 0) return 0;

    const cuotaResult = await client.query(
        `SELECT cp.id, cp.id_prestamo, pr.tna
         FROM cuotas_prestamo cp
         JOIN prestamos pr ON cp.id_prestamo = pr.id
         WHERE pr.id_cuenta = $1 AND cp.estado = 'vencida'
         ORDER BY cp.fecha_vencimiento ASC, cp.numero_cuota ASC
         LIMIT 1
         FOR UPDATE OF cp`,
        [idCuenta]
    );
    if (cuotaResult.rows.length === 0) return 0;

    const { saldo, periodos } = cuentaResult.rows[0];
    const { id: idCuota, id_prestamo: idPrestamo, tna } = cuotaResult.rows[0];
    const tasaMensualMora = Number(tna) / 100 / 12 * (1 + RECARGO_PUNITORIO / 100);
    const punitorio = Math.round(-centavos(saldo) * tasaMensualMora * Number(periodos));

    // Menos de un centavo: no se toca la fecha para que el tiempo siga acumulándose
    if (punitorio < 1) return 0;

    await client.query(
        `UPDATE cuentas_bancarias SET saldo = saldo - $1, ultimo_devengo_mora = NOW() WHERE id_cuenta = $2`,
        [punitorio / 100, idCuenta]
    );
    await client.query(
        'UPDATE cuotas_prestamo SET punitorios = punitorios + $1 WHERE id = $2',
        [punitorio / 100, idCuota]
    );
    await client.query(
        `INSERT INTO movimientos_prestamo (id_cuenta, id_prestamo, id_cuota, tipo, importe)
         VALUES ($1, $2, $3, 'punitorio', $4)`,
        [idCuenta, idPrestamo, idCuota, punitorio / 100]
    );
    return punitorio / 100;
});

const devengarPunitorios = async () => {
    const cuentasResult = await pool.query(
        `SELECT id_cuenta FROM cuentas_bancarias
         WHERE saldo < 0 AND ultimo_devengo_mora IS NOT NULL`
    );

    for (const { id_cuenta } of cuentasResult.rows) {
        try {
            const punitorio = await devengarPunitoriosCuenta(id_cuenta);
            if (punitorio > 0) {
                console.log(`[Cobros] Punitorios de $${punitorio} debitados a la cuenta ${id_cuenta}.`);
            }
        } catch (error) {
            console.error(`[Cobros] Error devengando punitorios de la cuenta ${id_cuenta}:`, error.message);
        }
    }
};

// 4. Informa al Banco Central la deuda (saldo negativo) de cada cliente en mora.
// Los días de atraso se cuentan desde la cuota impaga más antigua; un intervalo de cuotas equivale a 30 días.
// dnisRegularizados: clientes que cancelaron su deuda en esta corrida; si ya no deben nada
// se informa deuda 0 con situación 1 para limpiar su registro en el Banco Central.
const informarDeudas = async (dnisRegularizados) => {
    const deudasResult = await pool.query(
        `SELECT titular.dni,
                SUM(-cb.saldo) AS monto_total,
                MAX(EXTRACT(EPOCH FROM NOW() - atraso.primer_vencimiento)
                    / EXTRACT(EPOCH FROM $1::interval) * 30) AS dias_atraso
         FROM cuentas_bancarias cb
         CROSS JOIN LATERAL (
             SELECT MIN(cp.fecha_vencimiento) AS primer_vencimiento
             FROM cuotas_prestamo cp
             JOIN prestamos pr ON cp.id_prestamo = pr.id
             WHERE pr.id_cuenta = cb.id_cuenta AND cp.estado = 'vencida'
         ) atraso
         ${TITULAR_DNI}
         WHERE cb.saldo < 0 AND atraso.primer_vencimiento IS NOT NULL
         GROUP BY titular.dni`,
        [CUOTAS_INTERVALO]
    );

    const deudas = deudasResult.rows.map((d) => ({
        dni: d.dni,
        montoTotal: Number(d.monto_total),
        situacion: calcularSituacion(Math.floor(Number(d.dias_atraso)))
    }));

    const dnisConDeuda = new Set(deudas.map((d) => d.dni));
    for (const dni of dnisRegularizados) {
        if (!dnisConDeuda.has(dni)) {
            deudas.push({ dni, montoTotal: 0, situacion: 1 });
        }
    }

    for (const { dni, montoTotal, situacion } of deudas) {
        try {
            await informarDeuda(dni, montoTotal, situacion);
            console.log(`[Cobros] Deuda informada al Banco Central: DNI ${dni}, $${montoTotal}, situación ${situacion}`);
        } catch (error) {
            console.error(`[Cobros] Error informando deuda del DNI ${dni}:`, error.response?.data || error.message);
        }
    }
};

const ejecutarCobroCuotas = async () => {
    if (enEjecucion) {
        console.warn('[Cobros] La corrida anterior sigue en curso, se omite esta ejecución.');
        return;
    }
    enEjecucion = true;

    try {
        // Primero se regulariza: si ingresó dinero, la cuenta puede pagar las cuotas que vencen ahora
        const dnisRegularizados = await regularizarCuentas();
        await cobrarCuotasVencidas();
        await devengarPunitorios();
        await informarDeudas(dnisRegularizados);
    } catch (error) {
        console.error('[Cobros] Error en la corrida de cobro de cuotas:', error);
    } finally {
        enEjecucion = false;
    }
};

const iniciarCronCobros = () => {
    cron.schedule(CRON_SCHEDULE, ejecutarCobroCuotas, { timezone: CRON_TIMEZONE });
    console.log(`Cron de cobro de cuotas programado (${CRON_SCHEDULE}, ${CRON_TIMEZONE}).`);
};

module.exports = { iniciarCronCobros, ejecutarCobroCuotas, calcularSituacion };
