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
        // 1. CBUs del usuario autenticado
        const cuentasResult = await pool.query(`
            SELECT cb.cbu
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            WHERE p.clerk_id = $1
        `, [clerkId]);
        const misCbus = cuentasResult.rows.map(r => r.cbu);

        // 2. La transferencia solo se busca entre las del usuario: una ajena responde igual que una
        //    inexistente, así no se puede averiguar qué números de operación existen.
        //    fecha_hora se guarda en UTC sin zona horaria.
        const transferenciaResult = await pool.query(`
            SELECT *, fecha_hora AT TIME ZONE 'UTC' AS fecha_utc
            FROM transferencias_central
            WHERE transaccion_central_id = $1
              AND (cbu_origen = ANY($2) OR cbu_destino = ANY($2))
            LIMIT 1
        `, [transaccionId, misCbus]);

        if (transferenciaResult.rows.length === 0) {
            return res.status(404).json({ error: 'No encontramos ese comprobante entre tus transferencias' });
        }

        const transferencia = transferenciaResult.rows[0];

        // 3. Resolver nombres (si son cuentas del banco) y generar el PDF
        const [origenLocal, destinoLocal] = await Promise.all([
            resolverNombrePorCbu(transferencia.cbu_origen),
            resolverNombrePorCbu(transferencia.cbu_destino),
        ]);
        // Si la otra cuenta es de otro banco, se usa el nombre guardado al transferir.
        const externo = transferencia.nombre_contraparte || null;
        const nombreOrigen = origenLocal || (transferencia.tipo === 'entrante' ? externo : null);
        const nombreDestino = destinoLocal || (transferencia.tipo !== 'entrante' ? externo : null);

        const pdfBuffer = await generarComprobanteTransferencia({
            transaccionId: transferencia.transaccion_central_id,
            fechaHora: new Date(transferencia.fecha_utc),
            importe: Number(transferencia.importe),
            moneda: transferencia.moneda,
            estado: transferencia.estado,
            cbuOrigen: transferencia.cbu_origen,
            cbuDestino: transferencia.cbu_destino,
            nombreOrigen,
            nombreDestino,
            // Desde el punto de vista de quien descarga: si la plata salió de una cuenta suya, la envió.
            direccion: misCbus.includes(transferencia.cbu_origen) ? 'enviaste' : 'recibiste',
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
