const { pool } = require('../config/db');
const centralBank = require('../services/centralBankService');

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

    const { nombre, apellido, dni, direccion, ciudad, provincia, pais, codigoPostal, email, telefono, fechaNac } = req.body;

    if (!nombre || !apellido || !dni || !email || !ciudad || !provincia || !pais) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, apellido, DNI, email, ciudad, provincia y país son requeridos.' });
    }

    const existing = await pool.query('SELECT id FROM Personas WHERE clerk_id = $1', [clerkId]);
    if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'El perfil ya fue completado.' });
    }

    // 1. Registrar persona en el Banco Central para obtener el CBU oficial
    let cbu, alias;
    try {
        const cbResponse = await centralBank.registrarPersona(nombre, apellido, dni);
        cbu = cbResponse.cbu;
    } catch (err) {
        console.error('Error registrando persona en Banco Central:', err.response?.data || err.message);
        return res.status(502).json({ error: 'No se pudo registrar la persona en el Banco Central. Intentá más tarde.' });
    }

    // 2. Generar alias y sincronizarlo con el Banco Central
    alias = `${nombre.toLowerCase()}.${apellido.toLowerCase()}.${Math.floor(Math.random() * 9000) + 1000}`;
    try {
        await centralBank.asignarAlias(cbu, alias);
    } catch (err) {
        // El alias es opcional, si falla se continúa sin él
        console.warn('No se pudo asignar alias en Banco Central:', err.response?.data || err.message);
        alias = null;
    }

    // 3. Guardar en la base de datos local
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const personaResult = await client.query(
            `INSERT INTO Personas (clerk_id, Nombre, Apellido, Dni, Direccion, Email, Telefono, FechaNac, ciudad, provincia, pais, codigo_postal)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING id`,
            [clerkId, nombre, apellido, dni, direccion || null, email, telefono || null, fechaNac || null, ciudad, provincia, pais, codigoPostal || null]
        );
        const idPersona = personaResult.rows[0].id;

        const cuentaResult = await client.query(
            `INSERT INTO Cuentas_Bancarias (cbu, alias, saldo, fecha_apertura, estado)
             VALUES ($1, $2, 0, NOW(), 'Activa')
             RETURNING id_cuenta`,
            [cbu, alias]
        );
        const idCuenta = cuentaResult.rows[0].id_cuenta;

        await client.query(
            `INSERT INTO Titulares_Cuenta (id_persona, id_cuenta, rol_titular, fecha_alta)
             VALUES ($1, $2, 'Titular', NOW())`,
            [idPersona, idCuenta]
        );

        await client.query('COMMIT');

        res.status(201).json({
            mensaje: '¡Bienvenido a 404Bank! Tu perfil fue creado con éxito.',
            id_persona: idPersona,
            cbu,
            alias
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando perfil:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'El DNI o dirección ya están registrados en el sistema.' });
        }
        res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
        client.release();
    }
};

module.exports = { verificarPerfil, completarPerfil };
