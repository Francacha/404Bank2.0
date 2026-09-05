/*Se encarga de validar que el usuario tenga al menos una cuenta activa en dolares, y una en pesos
vinculada en Titulares_cuenta*/ 
const { pool } = require('../config/db');

/**
 * Middleware para validar que el usuario logueado cuente con caja de ahorro en dólares y en pesos.
 */
const validarCuentasDivisas = async (req, res, next) => {
    const clerkId = req.auth?.userId; // Token de Clerk

    if (!clerkId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    try {
        // Consultar cuentas activas del usuario asociadas vía Titulares_Cuenta / Personas
        const query = `
            SELECT cb.id_cuenta, cb.cbu, cb.saldo, cb.moneda
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            WHERE p.clerk_id = $1 AND cb.estado = 'Activa';
        `;
        const result = await pool.query(query, [clerkId]);
        const cuentas = result.rows;

        const cuentaARS = cuentas.find(c => c.moneda === 'ARS');
        const cuentaUSD = cuentas.find(c => c.moneda === 'USD');

        if (!cuentaUSD) {
            return res.status(400).json({
                error: 'Para operar con divisas primero debes solicitar la apertura de una Caja de Ahorro en Dólares.'
            });
        }

        if (!cuentaARS) {
            return res.status(400).json({
                error: 'No se encontró una cuenta activa en pesos (ARS) para realizar la operación.'
            });
        }

        // Dejamos las cuentas asociadas en el req para no re-consultarlas en el controller
        req.cuentasUsuario = { cuentaARS, cuentaUSD };
        next();
    } catch (error) {
        console.error('Error en middleware divisasMiddleware:', error);
        return res.status(500).json({ error: 'Error interno al validar cuentas del usuario.' });
    }
};

module.exports = { validarCuentasDivisas };