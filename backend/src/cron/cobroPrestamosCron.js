const cron = require('node-cron');
const { pool } = require('../config/db');
const { informarDeuda } = require('../services/centralBankService');

// Por defecto corre cada 10 minutos.
const CRON_SCHEDULE = process.env.CRON_COBROS_SCHEDULE || '*/10 * * * *';
const CRON_TIMEZONE = 'America/Argentina/Buenos_Aires';

let enEjecucion = false;

// Clasificación de deudores del BCRA según los días de atraso
const calcularSituacion = (diasAtraso) => {
    if (diasAtraso <= 30) return 1;  // Normal
    if (diasAtraso <= 60) return 2;  // Riesgo bajo
    if (diasAtraso <= 90) return 3;  // Riesgo medio
    if (diasAtraso <= 180) return 4; // Riesgo alto
    return 5;                        // Irrecuperable
};

// Intenta cobrar una cuota vencida. Devuelve el estado final de la cuota.
const cobrarCuota = async (idCuota) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Se bloquean la cuota y la cuenta para que un cobro no se procese dos veces
        // ni choque con una transferencia que esté moviendo el mismo saldo.
        const cuotaResult = await client.query(
            `SELECT cp.id, cp.monto, cp.estado, cb.id_cuenta, cb.saldo
             FROM cuotas_prestamo cp
             JOIN prestamos pr ON cp.id_prestamo = pr.id
             JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
             WHERE cp.id = $1 AND cp.estado IN ('pendiente', 'vencida')
             FOR UPDATE OF cp, cb`,
            [idCuota]
        );

        if (cuotaResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return null; // ya fue pagada por otro proceso
        }

        const cuota = cuotaResult.rows[0];

        if (Number(cuota.saldo) >= Number(cuota.monto)) {
            await client.query(
                'UPDATE cuentas_bancarias SET saldo = saldo - $1 WHERE id_cuenta = $2',
                [cuota.monto, cuota.id_cuenta]
            );
            await client.query(
                `UPDATE cuotas_prestamo SET estado = 'pagada', fecha_pago = NOW() WHERE id = $1`,
                [cuota.id]
            );
            await client.query('COMMIT');
            return 'pagada';
        }

        await client.query(
            `UPDATE cuotas_prestamo SET estado = 'vencida' WHERE id = $1`,
            [cuota.id]
        );
        await client.query('COMMIT');
        return 'vencida';
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Informa al Banco Central la deuda acumulada de cada cliente con cuotas impagas.
// dnisRegularizados: clientes que pagaron cuotas atrasadas en esta corrida; si ya no deben nada
// se informa deuda 0 con situación 1 para limpiar su registro en el Banco Central.
const informarDeudas = async (dnisRegularizados) => {
    const deudasResult = await pool.query(
        `SELECT titular.dni,
                SUM(cp.monto) AS monto_total,
                MAX(CURRENT_DATE - cp.fecha_vencimiento) AS dias_atraso
         FROM cuotas_prestamo cp
         JOIN prestamos pr ON cp.id_prestamo = pr.id
         CROSS JOIN LATERAL (
             SELECT p.dni FROM titulares_cuenta tc
             JOIN personas p ON tc.id_persona = p.id
             WHERE tc.id_cuenta = pr.id_cuenta
             ORDER BY p.id
             LIMIT 1
         ) titular
         WHERE cp.estado = 'vencida'
         GROUP BY titular.dni`
    );

    const deudas = deudasResult.rows.map((d) => ({
        dni: d.dni,
        montoTotal: Number(d.monto_total),
        situacion: calcularSituacion(Number(d.dias_atraso))
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
        const cuotasResult = await pool.query(
            `SELECT cp.id, cp.estado, titular.dni
             FROM cuotas_prestamo cp
             JOIN prestamos pr ON cp.id_prestamo = pr.id
             CROSS JOIN LATERAL (
                 SELECT p.dni FROM titulares_cuenta tc
                 JOIN personas p ON tc.id_persona = p.id
                 WHERE tc.id_cuenta = pr.id_cuenta
                 ORDER BY p.id
                 LIMIT 1
             ) titular
             WHERE cp.fecha_vencimiento <= NOW()
               AND cp.estado IN ('pendiente', 'vencida')
             ORDER BY cp.fecha_vencimiento ASC, cp.numero_cuota ASC`
        );

        let pagadas = 0;
        let impagas = 0;
        const dnisRegularizados = new Set();

        for (const cuota of cuotasResult.rows) {
            try {
                const estadoFinal = await cobrarCuota(cuota.id);
                if (estadoFinal === 'pagada') {
                    pagadas++;
                    if (cuota.estado === 'vencida') dnisRegularizados.add(cuota.dni);
                } else if (estadoFinal === 'vencida') {
                    impagas++;
                }
            } catch (error) {
                console.error(`[Cobros] Error cobrando la cuota ${cuota.id}:`, error.message);
            }
        }

        console.log(`[Cobros] ${cuotasResult.rows.length} cuotas procesadas: ${pagadas} pagadas, ${impagas} impagas.`);

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
