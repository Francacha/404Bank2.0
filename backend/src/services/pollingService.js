const { obtenerTransacciones } = require('./centralBankService');
const { pool } = require('../config/db');

const MY_BANK_CODE = parseInt(process.env.CENTRAL_BANK_CODE);
const POLL_INTERVAL_MS = 1 * 60 * 1000; // cada 1 minuto

const procesarTransaccionesEntrantes = async () => {
    if (!MY_BANK_CODE || isNaN(MY_BANK_CODE)) {
        console.warn('CENTRAL_BANK_CODE no configurado, polling desactivado.');
        return;
    }

    try {
        // Pedimos los últimos 30 minutos con overlap para no perder nada
        const transacciones = await obtenerTransacciones(30);

        for (const tx of transacciones) {
            // Solo nos interesan las aprobadas que vienen de otro banco hacia el nuestro
            if (tx.estado !== 'aprobada') continue;
            if (tx.bankCodeDestino !== MY_BANK_CODE) continue;
            if (tx.bankCodeOrigen === MY_BANK_CODE) continue; // transferencia interna, ya la procesamos nosotros

            // Verificar si ya fue procesada
            const exists = await pool.query(
                'SELECT id FROM Transferencias_Central WHERE transaccion_central_id = $1',
                [tx._id]
            );
            if (exists.rows.length > 0) continue;

            // Verificar que el CBU destino existe localmente
            const cuenta = await pool.query(
                'SELECT id_cuenta FROM Cuentas_Bancarias WHERE cbu = $1 AND estado = \'Activa\'',
                [tx.cbuDestino]
            );
            if (cuenta.rows.length === 0) continue;

            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                await client.query(
                    'UPDATE Cuentas_Bancarias SET saldo = saldo + $1 WHERE cbu = $2',
                    [tx.importe, tx.cbuDestino]
                );

                await client.query(`
                    INSERT INTO Transferencias_Central (transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo)
                    VALUES ($1, $2, $3, $4, 'aprobada', 'entrante')
                `, [tx._id, tx.cbuOrigen, tx.cbuDestino, tx.importe]);

                await client.query('COMMIT');
                console.log(`[Polling] Transferencia entrante acreditada: ${tx._id} | importe: $${tx.importe} → ${tx.cbuDestino}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[Polling] Error procesando tx ${tx._id}:`, err.message);
            } finally {
                client.release();
            }
        }
    } catch (err) {
        console.error('[Polling] Error obteniendo transacciones del Banco Central:', err.message);
    }
};

const iniciarPolling = () => {
    console.log(`[Polling] Iniciado. Revisando transferencias entrantes cada ${POLL_INTERVAL_MS / 60000} minutos.`);
    procesarTransaccionesEntrantes();
    setInterval(procesarTransaccionesEntrantes, POLL_INTERVAL_MS);
};

module.exports = { iniciarPolling };
