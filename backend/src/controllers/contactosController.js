const { pool } = require('../config/db');

const obtenerIdPersona = async (clerkId) => {
    const res = await pool.query('SELECT id FROM Personas WHERE clerk_id = $1', [clerkId]);
    return res.rows[0]?.id || null;
};

const listarContactos = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    try {
        const idPersona = await obtenerIdPersona(clerkId);
        if (!idPersona) return res.status(404).json({ error: 'Persona no encontrada' });

        const result = await pool.query(
            `SELECT id, cbu, alias, nombre, apellido, fecha_agregado
             FROM Contactos_Guardados
             WHERE id_persona = $1
             ORDER BY nombre, apellido`,
            [idPersona]
        );

        res.json({ contactos: result.rows });
    } catch (error) {
        console.error('Error listando contactos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const guardarContacto = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const { cbu, alias, nombre, apellido } = req.body;

    if (!cbu || !nombre || !apellido) {
        return res.status(400).json({ error: 'Se requiere cbu, nombre y apellido' });
    }

    try {
        const idPersona = await obtenerIdPersona(clerkId);
        if (!idPersona) return res.status(404).json({ error: 'Persona no encontrada' });

        const result = await pool.query(
            `INSERT INTO Contactos_Guardados (id_persona, cbu, alias, nombre, apellido)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id_persona, cbu) DO UPDATE
                SET alias = EXCLUDED.alias, nombre = EXCLUDED.nombre, apellido = EXCLUDED.apellido
             RETURNING id, cbu, alias, nombre, apellido, fecha_agregado`,
            [idPersona, cbu, alias || null, nombre, apellido]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error guardando contacto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const eliminarContacto = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const { id } = req.params;

    try {
        const idPersona = await obtenerIdPersona(clerkId);
        if (!idPersona) return res.status(404).json({ error: 'Persona no encontrada' });

        const result = await pool.query(
            'DELETE FROM Contactos_Guardados WHERE id = $1 AND id_persona = $2 RETURNING id',
            [id, idPersona]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contacto no encontrado' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error eliminando contacto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { listarContactos, guardarContacto, eliminarContacto };
