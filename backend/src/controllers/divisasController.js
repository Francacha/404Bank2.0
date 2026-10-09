/*Este controlador se encarga de realizar la compra/venta 
dentro de una transacción de base de datos y también de consultar las
transacciones realizadas en dólares*/
const { pool } = require('../config/db');
const dolarApiService = require('../services/dolarApiService');
const crypto = require('crypto');
/**
 * Realiza la conversión de divisas (Compra o Venta de USD).
 */
const redondear = (valor) => Math.round(valor * 100) / 100;
const pesos = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const operarDivisas = async (req, res) => {
    const { tipoOperacion, montoUSD, cotizacionAceptada } = req.body;
    const { cuentaARS, cuentaUSD } = req.cuentasUsuario; // Proviene de divisasMiddleware

    if (!['COMPRA', 'VENTA'].includes(tipoOperacion)) {
        return res.status(400).json({ error: 'Tipo de operación no válido. Use COMPRA o VENTA.' });
    }

    // Dólares con centavos: 10.005 se redondea a 10.01.
    const montoNumUSD = redondear(parseFloat(montoUSD));
    if (isNaN(montoNumUSD) || montoNumUSD < 1) {
        return res.status(400).json({ error: 'El monto mínimo es US$ 1.' });
    }

    let cotizacion;
    try {
        cotizacion = await dolarApiService.obtenerCotizacionOficial();
    } catch (error) {
        return res.status(502).json({ error: 'No pudimos consultar la cotización del dólar. Probá de nuevo en un momento.' });
    }

    const tasaCambio = Number(tipoOperacion === 'COMPRA' ? cotizacion.venta : cotizacion.compra);

    // El cliente acepta una cotización en la revisión. Si cambió desde entonces, no se opera a otro precio:
    // se devuelve la nueva para que la revise de nuevo.
    if (cotizacionAceptada !== undefined && Number(cotizacionAceptada) !== tasaCambio) {
        return res.status(409).json({
            error: `La cotización cambió a $ ${pesos(tasaCambio)}. Revisá el nuevo total antes de confirmar.`,
            cotizacion
        });
    }

    const montoARS = redondear(montoNumUSD * tasaCambio);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Saldos leídos dentro de la transacción y bloqueados: otra operación sobre estas cuentas
        // espera a que esta termine, así ningún movimiento pisa a otro.
        const saldosResult = await client.query(
            'SELECT id_cuenta, saldo FROM cuentas_bancarias WHERE id_cuenta = ANY($1) FOR UPDATE',
            [[cuentaARS.id_cuenta, cuentaUSD.id_cuenta]]
        );
        const saldo = (id) => Number(saldosResult.rows.find(r => r.id_cuenta === id)?.saldo ?? 0);
        const saldoARS = saldo(cuentaARS.id_cuenta);
        const saldoUSD = saldo(cuentaUSD.id_cuenta);

        if (tipoOperacion === 'COMPRA' && saldoARS < montoARS) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: `No te alcanza: necesitás $ ${pesos(montoARS)} y tenés $ ${pesos(saldoARS)} en tu cuenta en pesos.`
            });
        }
        if (tipoOperacion === 'VENTA' && saldoUSD < montoNumUSD) {
            await client.query('ROLLBACK');
            return res.status(422).json({
                error: `No te alcanza: querés vender US$ ${pesos(montoNumUSD)} y tenés US$ ${pesos(saldoUSD)}.`
            });
        }

        const signoARS = tipoOperacion === 'COMPRA' ? -1 : 1;
        const nuevos = await client.query(
            `UPDATE cuentas_bancarias
             SET saldo = saldo + CASE WHEN id_cuenta = $1 THEN $3::numeric ELSE $4::numeric END
             WHERE id_cuenta IN ($1, $2)
             RETURNING id_cuenta, saldo`,
            [cuentaARS.id_cuenta, cuentaUSD.id_cuenta, signoARS * montoARS, -signoARS * montoNumUSD]
        );
        const nuevoSaldo = (id) => Number(nuevos.rows.find(r => r.id_cuenta === id).saldo);

        // Registro en transferencias_central con la cotización aplicada (el Historial la usa para
        // mostrar los dos lados de la operación).
        const transaccionIdLocal = `INT-${crypto.randomUUID()}`;
        const esCompra = tipoOperacion === 'COMPRA';
        const resultadoTransaccion = await client.query(
            `INSERT INTO transferencias_central
               (transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda, cotizacion)
             VALUES ($1, $2, $3, $4, 'OK', $5, NOW(), $6, $7)
             RETURNING transaccion_central_id, fecha_hora AT TIME ZONE 'UTC' AS fecha_hora`,
            [
                transaccionIdLocal,
                esCompra ? cuentaARS.cbu : cuentaUSD.cbu,
                esCompra ? cuentaUSD.cbu : cuentaARS.cbu,
                esCompra ? montoNumUSD : montoARS,
                esCompra ? 'COMPRA_USD' : 'VENTA_USD',
                esCompra ? 'USD' : 'ARS',
                tasaCambio
            ]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            operacion: {
                tipo: tipoOperacion,
                montoUSD: montoNumUSD,
                montoARS,
                tasaCambio,
                saldoUSDActual: nuevoSaldo(cuentaUSD.id_cuenta),
                saldoARSActual: nuevoSaldo(cuentaARS.id_cuenta),
                transaccionId: resultadoTransaccion.rows[0].transaccion_central_id,
                fechaHora: resultadoTransaccion.rows[0].fecha_hora
            }
        });
    } catch (dbError) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error en transacción de compra/venta divisas:', dbError);
        return res.status(500).json({ error: 'No pudimos completar la operación. No se movió plata; probá de nuevo.' });
    } finally {
        client.release();
    }
};

/**
 * Consulta las transacciones realizadas específicamente en la cuenta en dólares.
 */
const getTransaccionesDolares = async (req, res) => {
    const { cuentaUSD } = req.cuentasUsuario; // Garantizado por el middleware

    try {
        const query = `
            SELECT id, transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda
            FROM transferencias_central
            WHERE (cbu_origen = $1 OR cbu_destino = $1)
            ORDER BY fecha_hora DESC;
        `;
        const result = await pool.query(query, [cuentaUSD.cbu]);

        return res.json({
            cuentaUSD: {
                cbu: cuentaUSD.cbu,
                saldo: cuentaUSD.saldo
            },
            transacciones: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo transacciones en dólares:', error);
        return res.status(500).json({ error: 'Error interno del servidor al obtener transacciones en dólares.' });
    }
};

/**
 * Consulta la cotización del dólar oficial sin realizar compras/ventas.
 */
const getCotizacionDolar = async (req, res) => {
    try {
        const cotizacion = await dolarApiService.obtenerCotizacionOficial();
        res.json({ cotizacion });
    } catch (error) {
        res.status(502).json({ error: 'No pudimos consultar la cotización del dólar. Probá de nuevo en un momento.' });
    }
};

module.exports = {
    operarDivisas,
    getTransaccionesDolares,
    getCotizacionDolar
};