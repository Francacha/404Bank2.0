const { pool } = require('../config/db');
const centralBank = require('../services/centralBankService');
const { asignarAliasPesos } = require('../services/aliasService');

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

    // 2. Generar alias y sincronizarlo con el Banco Central.
    // El alias es opcional: si el Banco Central no acepta ninguno, se continúa sin él.
    const aliasAsignado = await asignarAliasPesos(cbu, nombre, apellido);
    alias = aliasAsignado.registrado ? aliasAsignado.alias : null;

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

// Los datos de la persona, solo los del usuario autenticado.
const obtenerPerfil = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });
    try {
        const result = await pool.query(
            `SELECT nombre, apellido, dni, email, telefono, fechanac, direccion, ciudad, provincia, pais, codigo_postal
             FROM Personas WHERE clerk_id = $1`,
            [clerkId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        const p = result.rows[0];
        res.json({
            nombre: p.nombre,
            apellido: p.apellido,
            dni: p.dni,
            email: p.email,
            telefono: p.telefono,
            fechaNac: p.fechanac,
            direccion: p.direccion,
            ciudad: p.ciudad,
            provincia: p.provincia,
            pais: p.pais,
            codigoPostal: p.codigo_postal,
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const PROVINCIAS = [
    'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes',
    'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro',
    'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán',
];

// El cliente puede cambiar su teléfono y su domicilio. Nombre, DNI y fecha de nacimiento quedan
// fijos: están registrados en el Banco Central.
const actualizarContacto = async (req, res) => {
    const clerkId = req.auth?.userId;
    if (!clerkId) return res.status(401).json({ error: 'No autenticado' });

    const limpio = (valor, largo) => (typeof valor === 'string' ? valor.trim().slice(0, largo) : '');
    const telefono = limpio(req.body?.telefono, 30);
    const direccion = limpio(req.body?.direccion, 120);
    const ciudad = limpio(req.body?.ciudad, 80);
    const provincia = limpio(req.body?.provincia, 80);
    const codigoPostal = limpio(req.body?.codigoPostal, 10);

    if (telefono && !/^[\d\s+()-]{8,}$/.test(telefono)) {
        return res.status(400).json({ error: 'Revisá el teléfono: usá solo números, con código de área.', campo: 'telefono' });
    }
    if (!ciudad) return res.status(400).json({ error: 'Escribí tu ciudad o localidad.', campo: 'ciudad' });
    if (!PROVINCIAS.includes(provincia)) return res.status(400).json({ error: 'Elegí tu provincia.', campo: 'provincia' });
    if (codigoPostal && !/^[A-Za-z]?\d{4}[A-Za-z]{0,3}$/.test(codigoPostal)) {
        return res.status(400).json({ error: 'Revisá el código postal, por ejemplo 1425 o C1425ABC.', campo: 'codigoPostal' });
    }

    try {
        const result = await pool.query(
            `UPDATE Personas
             SET Telefono = $1, Direccion = $2, ciudad = $3, provincia = $4, codigo_postal = $5
             WHERE clerk_id = $6
             RETURNING telefono, direccion, ciudad, provincia, codigo_postal`,
            [telefono || null, direccion || null, ciudad, provincia, codigoPostal || null, clerkId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });
        const p = result.rows[0];
        res.json({ telefono: p.telefono, direccion: p.direccion, ciudad: p.ciudad, provincia: p.provincia, codigoPostal: p.codigo_postal });
    } catch (error) {
        // La columna Direccion es única en la base: dos clientes no pueden registrar la misma.
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Esa dirección ya está registrada en otra cuenta. Revisala.', campo: 'direccion' });
        }
        console.error('Error actualizando contacto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { verificarPerfil, completarPerfil, obtenerPerfil, actualizarContacto };
