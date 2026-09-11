const { pool } = require('../config/db');
const centralBank = require('../services/centralBankService');

const asegurarColumnaMoneda = async (db = pool) => {
    await db.query(`
        ALTER TABLE Cuentas_Bancarias
        ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'ARS'
    `);
};

// Función helper para limpiar y generar el alias con sufijo según la moneda
const generarAliasFormateado = (baseTexto, moneda) => {
    if (!baseTexto) return null;

    // Convertir a minúsculas, quitar tildes y caracteres especiales (solo deja letras, números y puntos)
    let aliasLimpio = baseTexto
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9.]/g, "");

    // Evitar duplicaciones como .usd.usd o .ars.usd
    aliasLimpio = aliasLimpio.replace(/\.usd$/i, "").replace(/\.ars$/i, "");

    // Si la moneda es USD, concatenar el sufijo .usd
    if (moneda && moneda.toUpperCase() === 'USD') {
        return `${aliasLimpio}.usd`;
    }

    return aliasLimpio;
};

// Función para obtener las cuentas de un cliente
const getCuentasByCliente = async (req, res) => {
    const { id_persona } = req.params; // Saca el ID de la URL

    try {
        const query = `
            SELECT cb.cbu, cb.saldo, cb.moneda
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
            SELECT cb.cbu, cb.saldo, cb.moneda
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

    if (!['ARS', 'USD'].includes(moneda)) {
        return res.status(400).json({ error: 'La moneda debe ser ARS o USD.' });
    }

    try {
        // La identidad siempre se obtiene del token autenticado. El DNI no se
        // acepta desde el body para evitar vincular cuentas de otra persona.
        const personaResult = await pool.query(
            'SELECT id, dni FROM Personas WHERE clerk_id = $1',
            [clerkId]
        );

        if (personaResult.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró una persona local para el usuario autenticado. Completá el onboarding primero.' });
        }

        const persona = personaResult.rows[0];
        const dni = persona.dni;

        const resultado = await centralBank.abrirCajaAhorro(String(dni), moneda);
        const respuestaBancoCentral = resultado.data || {};
        const cuenta = respuestaBancoCentral.cuenta || respuestaBancoCentral;
        const cbu = cuenta.cbu;

        const aliasBase = cuenta.alias || body.alias || `cuenta.${dni}`;
        const alias = generarAliasFormateado(aliasBase, moneda);
        
        const saldo = cuenta.saldo ?? 0;
        const monedaCuenta = (cuenta.moneda || moneda).toUpperCase();

        if (!cbu) {
            console.error('Banco Central no devolvió CBU para caja de ahorro:', respuestaBancoCentral);
            return res.status(502).json({ error: 'Banco Central no devolvió los datos necesarios de la cuenta.' });
        }

        const client = await pool.connect();
        let idCuenta;
        let cuentaPersistida = false;
        let vinculacionPersistida = false;

        try {
            await client.query('BEGIN');
            await asegurarColumnaMoneda(client);

            const cuentaExistente = await client.query(
                'SELECT id_cuenta FROM Cuentas_Bancarias WHERE cbu = $1',
                [cbu]
            );

            if (cuentaExistente.rows.length > 0) {
                idCuenta = cuentaExistente.rows[0].id_cuenta;
                await client.query(
                    `UPDATE Cuentas_Bancarias
                     SET alias = COALESCE($1, alias),
                         moneda = $2,
                         estado = 'Activa'
                     WHERE id_cuenta = $3`,
                    [alias, monedaCuenta, idCuenta]
                );
            } else {
                const cuentaResult = await client.query(
                    `INSERT INTO Cuentas_Bancarias (cbu, alias, saldo, fecha_apertura, estado, moneda)
                     VALUES ($1, $2, $3, NOW(), 'Activa', $4)
                     RETURNING id_cuenta`,
                    [cbu, alias, saldo, monedaCuenta]
                );
                idCuenta = cuentaResult.rows[0].id_cuenta;
                cuentaPersistida = true;
            }

            const titularExistente = await client.query(
                'SELECT 1 FROM Titulares_Cuenta WHERE id_persona = $1 AND id_cuenta = $2',
                [persona.id, idCuenta]
            );

            if (titularExistente.rows.length === 0) {
                await client.query(
                    `INSERT INTO Titulares_Cuenta (id_persona, id_cuenta, rol_titular, fecha_alta)
                     VALUES ($1, $2, 'TITULAR', NOW())`,
                    [persona.id, idCuenta]
                );
                vinculacionPersistida = true;
            }

            await client.query('COMMIT');
        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('Error persistiendo caja de ahorro localmente:', dbError);
            return res.status(500).json({ error: 'La caja se creó/obtuvo en Banco Central, pero no se pudo guardar en la base local.' });
        } finally {
            client.release();
        }

        return res.status(resultado.status).json({
            mensaje: resultado.status === 201
                ? `Caja de ahorro en ${monedaCuenta} creada en Banco Central y guardada en la base local.`
                : `Caja de ahorro en ${monedaCuenta} encontrada en Banco Central y sincronizada con la base local.`,
            bancoCentral: respuestaBancoCentral,
            persistencia: {
                id_persona: persona.id,
                id_cuenta: idCuenta,
                cuenta_insertada: cuentaPersistida,
                vinculacion_insertada: vinculacionPersistida
            },
            cuenta: {
                dni: String(dni),
                moneda: monedaCuenta,
                cbu,
                alias,
                saldo
            }
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
