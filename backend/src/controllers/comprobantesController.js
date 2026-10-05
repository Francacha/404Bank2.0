const { pool } = require('../config/db');
const { generarComprobanteTransferencia } = require('../services/comprobantesService');

// Resuelve nombre y apellido del titular de un CBU, si es una cuenta del banco.
const resolverNombrePorCbu = async (cbu) => {
    const res = await pool.query(`
        SELECT p.nombre, p.apellido
        FROM Cuentas_Bancarias cb
        JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
        JOIN Personas p ON tit.id_persona = p.id
        WHERE cb.cbu = $1
        LIMIT 1
    `, [cbu]);
    if (res.rows.length === 0) return null;
    return `${res.rows[0].nombre} ${res.rows[0].apellido}`;
};

const descargarComprobante = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const { transaccionId } = req.params;

    try {
        // 1. Traer la transferencia por su id de operación
        const transferenciaResult = await pool.query(
            `SELECT * FROM transferencias_central WHERE transaccion_central_id = $1 LIMIT 1`,
            [transaccionId]
        );

        if (transferenciaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Comprobante no encontrado' });
        }

        const transferencia = transferenciaResult.rows[0];

        // 2. Verificar que el usuario autenticado sea dueño del CBU origen o destino
        const cuentasResult = await pool.query(`
            SELECT cb.cbu
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            WHERE p.clerk_id = $1
        `, [clerkId]);

        const misCbus = cuentasResult.rows.map(r => r.cbu);
        const esPropietario = misCbus.includes(transferencia.cbu_origen) || misCbus.includes(transferencia.cbu_destino);

        if (!esPropietario) {
            return res.status(403).json({ error: 'No tenés acceso a este comprobante' });
        }

        // 3. Resolver nombres (si son cuentas del banco) y generar el PDF
        const [nombreOrigen, nombreDestino] = await Promise.all([
            resolverNombrePorCbu(transferencia.cbu_origen),
            resolverNombrePorCbu(transferencia.cbu_destino),
        ]);

        const pdfBuffer = await generarComprobanteTransferencia({
            transaccionId: transferencia.transaccion_central_id,
            fechaHora: transferencia.fecha_hora,
            importe: Number(transferencia.importe),
            moneda: transferencia.moneda,
            estado: transferencia.estado,
            cbuOrigen: transferencia.cbu_origen,
            cbuDestino: transferencia.cbu_destino,
            nombreOrigen,
            nombreDestino,
        });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="comprobante-${transferencia.transaccion_central_id}.pdf"`,
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generando comprobante:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { descargarComprobante };
