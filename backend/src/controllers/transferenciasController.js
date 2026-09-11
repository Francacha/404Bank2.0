const { pool } = require('../config/db');
const centralBank = require('../services/centralBankService');

// Función helper local para resolver un Alias o CBU localmente primero
const resolverCuentaLocal = async (identificador) => {
    const query = `
        SELECT cbu, alias, moneda 
        FROM Cuentas_Bancarias 
        WHERE (alias = $1 OR cbu = $1) AND estado = 'Activa'
        LIMIT 1;
    `;
    const res = await pool.query(query, [identificador]);
    return res.rows[0] || null;
};

const realizarTransferencia = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    let { cbuDestino, aliasDestino, importe, moneda = 'ARS' } = req.body;

    // 1. Validar requerimientos
    if ((!cbuDestino && !aliasDestino) || !importe || Number(importe) <= 0) {
        return res.status(400).json({ error: 'Se requiere cbuDestino o aliasDestino, y el importe debe ser mayor a 0.' });
    }

    // 2. Si se envió aliasDestino, resolver el CBU (Híbrido: Local + Banco Central)
    if (!cbuDestino && aliasDestino) {
        // Intento 1: Buscar en la base de datos local
        const cuentaLocal = await resolverCuentaLocal(aliasDestino);
        if (cuentaLocal) {
            cbuDestino = cuentaLocal.cbu;
        } else {
            // Intento 2: Buscar en el Banco Central
            try {
                const destinatarioCentral = await centralBank.buscarPorAlias(aliasDestino);
                cbuDestino = destinatarioCentral.cbu;
            } catch (err) {
                return res.status(404).json({ error: 'No se encontró ninguna cuenta asociada al alias proporcionado.' });
            }
        }
    }

    if (typeof moneda !== 'string') {
        return res.status(400).json({ error: 'Moneda no válida. Use ARS o USD.' });
    }

    const monedaOp = moneda.toUpperCase();
    if (!['ARS', 'USD'].includes(monedaOp)) {
        return res.status(400).json({ error: 'Moneda no soportada. Use ARS o USD.' });
    }

    // 3. Obtener la cuenta activa del usuario origen específica para la moneda indicada
    const cuentaResult = await pool.query(`
        SELECT cb.cbu, cb.saldo, cb.id_cuenta, cb.moneda
        FROM Cuentas_Bancarias cb
        JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
        JOIN Personas p ON tit.id_persona = p.id
        WHERE p.clerk_id = $1 AND cb.estado = 'Activa' AND cb.moneda = $2
    `, [clerkId, monedaOp]);

    if (cuentaResult.rows.length === 0) {
        return res.status(404).json({
            error: `No posees una cuenta activa en ${monedaOp} para realizar esta transferencia.`
        });
    }

    const { cbu: cbuOrigen, saldo, id_cuenta } = cuentaResult.rows[0];

    if (cbuOrigen === cbuDestino) {
        return res.status(400).json({ error: 'No podés transferirte a tu misma cuenta.' });
    }

    if (parseFloat(saldo) < Number(importe)) {
        return res.status(422).json({ error: `Saldo insuficiente en tu cuenta en ${monedaOp}.` });
    }

    // 4. Verificar si es transferencia interna local
    const cuentaDestinoResult = await pool.query(
        `SELECT id_cuenta, moneda FROM Cuentas_Bancarias WHERE cbu = $1 AND estado = 'Activa'`,
        [cbuDestino]
    );
    const esTransferenciaInterna = cuentaDestinoResult.rows.length > 0;

    if (esTransferenciaInterna) {
        const monedaDestino = cuentaDestinoResult.rows[0].moneda;
        if (monedaDestino !== monedaOp) {
            return res.status(400).json({
                error: `Incompatibilidad de moneda. Intentas enviar ${monedaOp} a una cuenta en ${monedaDestino}. Utiliza el módulo de Cambio de Divisas.`
            });
        }
    }

    // 5. Notificar o procesar con el Banco Central
    let resultado;
    try {
        resultado = await centralBank.realizarTransferencia(
            cbuOrigen,
            cbuDestino,
            Number(importe),
            parseFloat(saldo)
        );
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 422) {
            return res.status(422).json({ error: 'Saldo insuficiente en Banco Central', estado: 'rechazada', ...data });
        }
        if (status === 404) {
            return res.status(404).json({ error: 'El CBU destino no existe en el sistema bancario.' });
        }
        if (status === 400) {
            return res.status(400).json({ error: data?.error || 'Datos inválidos' });
        }
        console.error('Error en Banco Central:', err.response?.data || err.message);
        return res.status(502).json({ error: 'Error al comunicarse con el Banco Central' });
    }

    // 6. Descontar saldo local y registrar la transferencia
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Debitar origen
        await client.query(
            'UPDATE Cuentas_Bancarias SET saldo = saldo - $1 WHERE id_cuenta = $2',
            [Number(importe), id_cuenta]
        );

        // Registrar salida
        await client.query(`
            INSERT INTO transferencias_central (transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda)
            VALUES ($1, $2, $3, $4, 'aprobada', 'saliente', NOW(), $5)
        `, [resultado.transaccionId || `LOCAL-${Date.now()}`, cbuOrigen, cbuDestino, Number(importe), monedaOp]);

        // Si es transferencia interna local, acreditar
        if (esTransferenciaInterna) {
            await client.query(
                'UPDATE Cuentas_Bancarias SET saldo = saldo + $1 WHERE cbu = $2',
                [Number(importe), cbuDestino]
            );

            await client.query(`
                INSERT INTO transferencias_central (transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda)
                VALUES ($1, $2, $3, $4, 'aprobada', 'entrante', NOW(), $5)
            `, [(resultado.transaccionId || `LOCAL-${Date.now()}`) + '_in', cbuOrigen, cbuDestino, Number(importe), monedaOp]);
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error guardando transferencia localmente:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }

    res.status(201).json({
        mensaje: `Transferencia en ${monedaOp} realizada con éxito`,
        transaccionId: resultado.transaccionId,
        estado: resultado.estado,
        importe: Number(importe),
        moneda: monedaOp,
        cbuOrigen,
        cbuDestino,
        nombreDestino: resultado.nombreDestino
    });
};

const obtenerMisTransferencias = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    try {
        const cuentaResult = await pool.query(`
            SELECT cb.cbu
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            WHERE p.clerk_id = $1 AND cb.estado = 'Activa'
        `, [clerkId]);

        if (cuentaResult.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontraron cuentas activas' });
        }

        const cbus = cuentaResult.rows.map(row => row.cbu);

        const result = await pool.query(`
            SELECT *
            FROM transferencias_central
            WHERE (cbu_origen = ANY($1) AND tipo = 'saliente')
               OR (cbu_destino = ANY($1) AND tipo = 'entrante')
            ORDER BY fecha_hora DESC
            LIMIT 50
        `, [cbus]);

        res.json({ transferencias: result.rows });
    } catch (error) {
        console.error('Error obteniendo transferencias:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const buscarDestinatario = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const { cbu, alias } = req.query;

    if (!cbu && !alias) {
        return res.status(400).json({ error: 'Debés proporcionar un cbu o un alias' });
    }

    try {
        // Intento local primero
        const identificador = cbu || alias;
        const cuentaLocal = await resolverCuentaLocal(identificador);
        if (cuentaLocal) {
            return res.json(cuentaLocal);
        }

        // Si no está local, buscar en el Banco Central
        let resultado;
        if (cbu) {
            resultado = await centralBank.buscarPorCbu(cbu);
        } else {
            resultado = await centralBank.buscarPorAlias(alias);
        }
        res.json(resultado);
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ error: 'No se encontró ninguna cuenta con ese CBU o alias' });
        }
        console.error('Error buscando destinatario:', err.message);
        res.status(502).json({ error: 'Error al comunicarse con el Banco Central' });
    }
};

module.exports = { realizarTransferencia, obtenerMisTransferencias, buscarDestinatario };