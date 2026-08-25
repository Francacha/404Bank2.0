const { pool } = require('../config/db');
const centralBank = require('../services/centralBankService');

// Función para obtener las cuentas de un cliente
const getCuentasByCliente = async (req, res) => {
    const { id_persona } = req.params; // Saca el ID de la URL

    try {
        const query = `
            SELECT cb.cbu, cb.saldo
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            WHERE tit.id_persona = $1 AND cb.estado = 'Activa';
        `;
        const resultado = await pool.query(query, [id_persona]);
        res.json({ cuentas: resultado.rows });
    } catch (error) {
        console.error("Error buscando cuentas:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
// NUEVA FUNCIÓN: Obtener las cuentas del usuario logueado
const getMisCuentas = async (req, res) => {
    // 💡 MAGIA DE CLERK: El middleware que pusimos en index.js extrae el Token, 
    // lo valida, y nos deja el ID del usuario guardado en req.auth.userId
    const clerkId = req.auth?.userId;

    if (!clerkId) {
        return res.status(401).json({ error: 'No se encontró el usuario en el token' });
    }

    try {
        // Buscamos las cuentas haciendo un JOIN con Personas usando el clerk_id
        const query = `
            SELECT cb.cbu, cb.saldo
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            WHERE p.clerk_id = $1 AND cb.estado = 'Activa';
        `;
        
        const result = await pool.query(query, [clerkId]);

        res.json({ cuentas: result.rows });
    } catch (error) {
        console.error("Error buscando mis cuentas:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const abrirCajaAhorro = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const body = req.body || {};
    const moneda = (body.moneda || 'USD').toUpperCase();
    let { dni } = body;

    if (!['ARS', 'USD'].includes(moneda)) {
        return res.status(400).json({ error: 'La moneda debe ser ARS o USD.' });
    }

    try {
        if (!dni) {
            const personaResult = await pool.query(
                'SELECT dni FROM Personas WHERE clerk_id = $1',
                [clerkId]
            );

            if (personaResult.rows.length === 0) {
                return res.status(404).json({ error: 'No se encontró una persona local para el usuario autenticado. Enviá el dni en el body o completá el onboarding primero.' });
            }

            dni = personaResult.rows[0].dni;
        }

        const resultado = await centralBank.abrirCajaAhorro(String(dni), moneda);
        const cuenta = resultado.data || {};

        return res.status(resultado.status).json({
            mensaje: resultado.status === 201
                ? `Caja de ahorro en ${moneda} creada en Banco Central.`
                : `Caja de ahorro en ${moneda} encontrada en Banco Central.`,
            dni: cuenta.dni || String(dni),
            moneda: cuenta.moneda || moneda,
            cbu: cuenta.cbu,
            alias: cuenta.alias,
            cuenta
        });
    } catch (err) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 400) {
            return res.status(400).json({ error: data?.error || 'Falta un campo o la moneda no es válida.', detalle: data });
        }

        if (status === 401) {
            return res.status(502).json({ error: 'API key inválida o ausente para Banco Central.' });
        }

        if (status === 404) {
            return res.status(404).json({ error: 'Persona no encontrada en Banco Central. Registrala primero con POST /persons.', detalle: data });
        }

        console.error('Error abriendo caja de ahorro en Banco Central:', data || err.message);
        return res.status(502).json({ error: 'Error al comunicarse con el Banco Central.' });
    }
};


module.exports = { getCuentasByCliente, getMisCuentas, abrirCajaAhorro };
