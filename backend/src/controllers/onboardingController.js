//Este controlador es el que verifica si el usuario ya tiene un perfil o no
//Para luego crearlo, ya sea dentro de clerk y en nuestro sistema
const { pool } = require('../config/db');

const verificarPerfil = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    try {
        const result = await pool.query(
            'SELECT id FROM Personas WHERE clerk_id = $1',
            [clerkId]
        );
        res.json({ tienePerfil: result.rows.length > 0 });
    } catch (error) {
        console.error('Error verificando perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const completarPerfil = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const { nombre, apellido, dni, direccion, email, telefono, fechaNac } = req.body;

    if (!nombre || !apellido || !dni || !email) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellido, DNI y email son requeridos.' });
    }

    try {
        const existing = await pool.query(
            'SELECT id FROM Personas WHERE clerk_id = $1',
            [clerkId]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El perfil ya fue completado.' });
        }

        const result = await pool.query(
            `INSERT INTO Personas (clerk_id, Nombre, Apellido, Dni, Direccion, Email, Telefono, FechaNac)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [clerkId, nombre, apellido, dni, direccion || null, email, telefono || null, fechaNac || null]
        );

        res.status(201).json({
            mensaje: '¡Bienvenido a 404Bank! Tu perfil fue creado con éxito.',
            id_persona: result.rows[0].id
        });
    } catch (error) {
        console.error('Error creando perfil:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El DNI o dirección ya están registrados en el sistema.' });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { verificarPerfil, completarPerfil };
