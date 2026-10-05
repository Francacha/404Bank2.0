const { pool } = require('../config/db');
const centralBank = require('./centralBankService');

// Solo letras sin tilde y números: el Banco Central rechaza espacios, tildes y ñ
// (por ejemplo, "Ulises " generaba "ulises .cena.1234" y la cuenta quedaba sin alias).
const limpiar = (texto) => String(texto ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// nombre.apellido.1234
const generarAlias = (nombre, apellido) =>
    `${limpiar(nombre) || 'cliente'}.${limpiar(apellido) || '404bank'}.${Math.floor(Math.random() * 9000) + 1000}`;

const aliasLibre = async (alias) => {
    const result = await pool.query('SELECT 1 FROM cuentas_bancarias WHERE LOWER(alias) = LOWER($1)', [alias]);
    return result.rows.length === 0;
};

// Registra en el Banco Central un alias libre para la cuenta. Si lo rechaza (por ejemplo porque
// otro banco ya lo usa) prueba con otro. candidato(intento) devuelve el alias a probar en cada intento.
// Devuelve { alias, registrado }: alias es el primero que estaba libre localmente aunque el
// Banco Central no lo haya aceptado (sirve igual para transferencias dentro de 404Bank).
const asignarAlias = async (cbu, candidato, intentos = 3) => {
    let primeroLibre = null;
    for (let intento = 0; intento < intentos; intento++) {
        const alias = candidato(intento);
        if (!(await aliasLibre(alias))) continue;
        primeroLibre = primeroLibre ?? alias;
        try {
            await centralBank.asignarAlias(cbu, alias);
            return { alias, registrado: true };
        } catch (err) {
            console.warn(`Banco Central rechazó el alias ${alias}:`, err.response?.data || err.message);
        }
    }
    return { alias: primeroLibre, registrado: false };
};

// Cuenta en pesos: nombre.apellido.1234
const asignarAliasPesos = (cbu, nombre, apellido) =>
    asignarAlias(cbu, () => generarAlias(nombre, apellido));

// Cuenta en dólares: el alias de la cuenta en pesos con .usd (o uno nuevo si ese no se puede usar)
const asignarAliasDolares = (cbu, aliasPesos, nombre, apellido) =>
    asignarAlias(cbu, (intento) => (intento === 0 && aliasPesos
        ? `${aliasPesos}.usd`
        : `${generarAlias(nombre, apellido)}.usd`));

module.exports = { asignarAliasPesos, asignarAliasDolares };
