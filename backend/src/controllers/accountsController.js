const pool = require('../config/db');

// Función para obtener las cuentas de un cliente
const getCuentasByCliente = async (req, res) => {
    const { id_persona } = req.params; // Saca el ID de la URL

    try {
        const query = `
            SELECT tc.nombre AS tipo_cuenta, m.simbolo, cb.cbu, cb.saldo 
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Tipo_Cuentas tc ON cb.id_tipo_cuenta = tc.id
            JOIN Monedas m ON cb.id_moneda = m.id
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
            SELECT tc.nombre AS tipo_cuenta, m.simbolo, cb.cbu, cb.saldo 
            FROM Cuentas_Bancarias cb
            JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
            JOIN Personas p ON tit.id_persona = p.id
            JOIN Tipo_Cuentas tc ON cb.id_tipo_cuenta = tc.id
            JOIN Monedas m ON cb.id_moneda = m.id
            WHERE p.clerk_id = $1 AND cb.estado = 'Activa';
        `;
        
        const result = await pool.query(query, [clerkId]);

        res.json({ cuentas: result.rows });
    } catch (error) {
        console.error("Error buscando mis cuentas:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = { getCuentasByCliente,getMisCuentas };