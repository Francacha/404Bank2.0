const cron = require('node-cron');
const { pool } = require('../config/db');

// Por defecto revisa cada minuto si hay frascos vencidos.
const CRON_SCHEDULE = process.env.FRASCOS_CRON_SCHEDULE || '* * * * *';
const CRON_TIMEZONE = 'America/Argentina/Buenos_Aires';

let enEjecucion = false;

// Acredita en la cuenta el capital más los intereses de un frasco vencido.
// Si la cuenta estaba en negativo por una cuota impaga, el ingreso descuenta la deuda solo.
const cobrarFrasco = async (idFrasco) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const frascoResult = await client.query(
            `SELECT id, id_cuenta, monto_final FROM frascos
             WHERE id = $1 AND estado = 'activo' AND fecha_fin <= NOW()
             FOR UPDATE`,
            [idFrasco]
        );
        if (frascoResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return false; // ya lo cobró otra corrida
        }

        const frasco = frascoResult.rows[0];
        await client.query(
            'UPDATE cuentas_bancarias SET saldo = saldo + $1 WHERE id_cuenta = $2',
            [frasco.monto_final, frasco.id_cuenta]
        );
        await client.query(
            `UPDATE frascos SET estado = 'cobrado', fecha_cobro = NOW() WHERE id = $1`,
            [frasco.id]
        );

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const ejecutarCobroFrascos = async () => {
    if (enEjecucion) return;
    enEjecucion = true;

    try {
        const result = await pool.query(
            `SELECT id FROM frascos WHERE estado = 'activo' AND fecha_fin <= NOW() ORDER BY fecha_fin`
        );
        for (const { id } of result.rows) {
            try {
                if (await cobrarFrasco(id)) console.log(`[Frascos] Frasco ${id} vencido: acreditado en la cuenta.`);
            } catch (error) {
                console.error(`[Frascos] Error cobrando el frasco ${id}:`, error.message);
            }
        }
    } catch (error) {
        console.error('[Frascos] Error en la corrida de frascos:', error);
    } finally {
        enEjecucion = false;
    }
};

const iniciarCronFrascos = () => {
    cron.schedule(CRON_SCHEDULE, ejecutarCobroFrascos, { timezone: CRON_TIMEZONE });
    console.log(`Cron de frascos programado (${CRON_SCHEDULE}, ${CRON_TIMEZONE}).`);
};

module.exports = { iniciarCronFrascos, ejecutarCobroFrascos };
