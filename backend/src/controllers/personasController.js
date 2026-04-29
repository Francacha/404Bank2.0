const pool = require('../config/db');

// Función para obtener todas las personas de la base de datos
const getTodasLasPersonas = async (req, res) => {
    try {
        // Hacemos una consulta sencilla para traer los datos clave
        const query = 'SELECT id, Nombre, Apellido, Dni, Email, Telefono FROM Personas';
        const resultado = await pool.query(query);
        
        res.json({
            mensaje: "Lista de clientes obtenida con éxito",
            personas: resultado.rows
        });
    } catch (error) {
        console.error("Error buscando personas:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { getTodasLasPersonas };