const { pool } = require('../config/db');
const centralBank = require('./centralBankService');

// Nombre de la otra persona en una transferencia ("contraparte").
// Si es cliente de 404Bank, sale de Personas. Si es de otro banco, no está en nuestra base:
// se guarda en transferencias_central.nombre_contraparte al transferir, y para las transferencias
// viejas que no lo tienen se le pregunta una vez al Banco Central y queda guardado.

let columnaLista = null;
const asegurarColumnaContraparte = () => {
    if (!columnaLista) {
        columnaLista = pool.query(
            'ALTER TABLE transferencias_central ADD COLUMN IF NOT EXISTS nombre_contraparte VARCHAR(255)'
        ).catch((error) => {
            columnaLista = null;
            throw error;
        });
    }
    return columnaLista;
};

const nombreCompleto = (datos) => {
    const nombre = [datos?.nombre, datos?.apellido].filter(Boolean).join(' ').trim();
    return nombre || null;
};

// Consulta al Banco Central con un tiempo máximo: si está caído, no traba el Historial.
const consultarBancoCentral = async (cbu, timeoutMs = 4000) => {
    let timer;
    try {
        const datos = await Promise.race([
            centralBank.buscarPorCbu(cbu),
            new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
        ]);
        // Otros bancos a veces lo cargan todo en minúscula: "ulises cena" → "Ulises Cena".
        const nombre = nombreCompleto(datos);
        return nombre && nombre.toLocaleLowerCase('es-AR').replace(/(^|\s)\S/g, (l) => l.toLocaleUpperCase('es-AR'));
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
};

// Nombre del destinatario al momento de transferir: local, el que devolvió el Banco Central, o consultándolo.
const nombreDestinatario = async (cbu, nombreDevuelto) => {
    const local = await pool.query(
        `SELECT p.nombre, p.apellido FROM Cuentas_Bancarias cb
         JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
         JOIN Personas p ON tit.id_persona = p.id
         WHERE cb.cbu = $1 LIMIT 1`,
        [cbu]
    );
    if (local.rows.length > 0) return nombreCompleto(local.rows[0]);
    if (typeof nombreDevuelto === 'string' && nombreDevuelto.trim()) return nombreDevuelto.trim();
    return consultarBancoCentral(cbu);
};

// Completa nombre_contraparte en una lista de transferencias (tipo 'entrante' | 'saliente').
// Orden: cliente de 404Bank → nombre guardado → Banco Central (y se guarda para la próxima).
const completarContrapartes = async (transferencias) => {
    const cbuDe = (t) => (t.tipo === 'entrante' ? t.cbu_origen : t.cbu_destino);
    const cbus = [...new Set(transferencias.map(cbuDe).filter(Boolean))];
    if (cbus.length === 0) return transferencias;

    const locales = await pool.query(
        `SELECT cb.cbu, p.nombre, p.apellido FROM Cuentas_Bancarias cb
         JOIN Titulares_Cuenta tit ON cb.id_cuenta = tit.id_cuenta
         JOIN Personas p ON tit.id_persona = p.id
         WHERE cb.cbu = ANY($1)`,
        [cbus]
    );
    const nombres = new Map(locales.rows.map((r) => [r.cbu, nombreCompleto(r)]));
    for (const t of transferencias) {
        if (!nombres.has(cbuDe(t)) && t.nombre_contraparte) nombres.set(cbuDe(t), t.nombre_contraparte);
    }

    // Los que faltan son de otros bancos y no tienen nombre guardado: se consultan en paralelo.
    const faltantes = cbus.filter((cbu) => !nombres.has(cbu)).slice(0, 15);
    const consultados = await Promise.all(faltantes.map(async (cbu) => [cbu, await consultarBancoCentral(cbu)]));
    for (const [cbu, nombre] of consultados) {
        if (!nombre) continue;
        nombres.set(cbu, nombre);
        await pool.query(
            `UPDATE transferencias_central SET nombre_contraparte = $1
             WHERE nombre_contraparte IS NULL
               AND ((tipo = 'saliente' AND cbu_destino = $2) OR (tipo = 'entrante' AND cbu_origen = $2))`,
            [nombre, cbu]
        ).catch(() => {});
    }

    return transferencias.map((t) => ({ ...t, nombre_contraparte: nombres.get(cbuDe(t)) || null }));
};

module.exports = { asegurarColumnaContraparte, nombreDestinatario, completarContrapartes };
