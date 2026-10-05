// Asigna alias a las cuentas que quedaron sin uno y los registra en el Banco Central.
// Uso (desde backend/):
//   node scripts/completarAlias.js            -> solo muestra qué cuentas se completarían
//   node scripts/completarAlias.js --aplicar  -> registra los alias y los guarda en la base
// Requiere haber corrido database/migration_divisas_alias_frascos.sql (índice único de alias).
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();
const { pool } = require('../src/config/db');
const { asignarAliasPesos, asignarAliasDolares } = require('../src/services/aliasService');

const aplicar = process.argv.includes('--aplicar');

(async () => {
    // Primero las cuentas en pesos: el alias en dólares se arma a partir del de pesos
    const result = await pool.query(`
        SELECT cb.id_cuenta, cb.cbu, cb.moneda, p.id AS id_persona, p.nombre, p.apellido
        FROM cuentas_bancarias cb
        JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
        JOIN personas p ON tc.id_persona = p.id
        WHERE cb.alias IS NULL
        ORDER BY (cb.moneda = 'ARS') DESC, cb.id_cuenta
    `);

    if (result.rows.length === 0) {
        console.log('Todas las cuentas tienen alias.');
    }

    for (const cuenta of result.rows) {
        const etiqueta = `Cuenta ${cuenta.id_cuenta} (${cuenta.moneda}) de ${cuenta.nombre} ${cuenta.apellido}`;
        if (!aplicar) {
            console.log(`${etiqueta}: sin alias`);
            continue;
        }

        let asignado;
        if (cuenta.moneda === 'USD') {
            const pesos = await pool.query(
                `SELECT cb.alias FROM cuentas_bancarias cb
                 JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
                 WHERE tc.id_persona = $1 AND cb.moneda = 'ARS' AND cb.alias IS NOT NULL
                 LIMIT 1`,
                [cuenta.id_persona]
            );
            asignado = await asignarAliasDolares(cuenta.cbu, pesos.rows[0]?.alias, cuenta.nombre, cuenta.apellido);
        } else {
            asignado = await asignarAliasPesos(cuenta.cbu, cuenta.nombre, cuenta.apellido);
        }

        // Las cuentas en pesos solo guardan el alias si el Banco Central lo aceptó (igual que al registrarse)
        const alias = cuenta.moneda === 'USD' || asignado.registrado ? asignado.alias : null;
        if (!alias) {
            console.log(`${etiqueta}: el Banco Central no aceptó ningún alias, queda sin alias`);
            continue;
        }

        await pool.query('UPDATE cuentas_bancarias SET alias = $1 WHERE id_cuenta = $2', [alias, cuenta.id_cuenta]);
        console.log(`${etiqueta}: ${alias}${asignado.registrado ? '' : ' (solo local: el Banco Central no lo aceptó)'}`);
    }

    if (!aplicar && result.rows.length > 0) {
        console.log('\nPara asignarlos, corré: node scripts/completarAlias.js --aplicar');
    }
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
