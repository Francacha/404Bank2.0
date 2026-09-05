/*Este controlador se encarga de realizar la compra/venta 
dentro de una transacción de base de datos y también de consultar las
transacciones realizadas en dólares*/
const { pool } = require('../config/db');
const dolarApiService = require('../services/dolarApiService');
const crypto = require('crypto');
/**
 * Realiza la conversión de divisas (Compra o Venta de USD).
 */
const operarDivisas = async (req, res) => {
    const { tipoOperacion, montoUSD } = req.body;
    const { cuentaARS, cuentaUSD } = req.cuentasUsuario; // Proviene de divisasMiddleware

    if (!['COMPRA', 'VENTA'].includes(tipoOperacion)) {
        return res.status(400).json({ error: 'Tipo de operación no válido. Use COMPRA o VENTA.' });
    }

    const montoNumUSD = parseFloat(montoUSD);
    if (isNaN(montoNumUSD) || montoNumUSD <= 0) {
        return res.status(400).json({ error: 'El monto en USD debe ser mayor a 0.' });
    }

    try {
        // 1. Obtener la cotización actual
        const cotizacion = await dolarApiService.obtenerCotizacionOficial();
        const tasaCambio = tipoOperacion === 'COMPRA' ? cotizacion.venta : cotizacion.compra;
        const montoARS = montoNumUSD * tasaCambio;

        // 2. Validar saldos según la operación
        if (tipoOperacion === 'COMPRA') {
            if (parseFloat(cuentaARS.saldo) < montoARS) {
                return res.status(400).json({
                    error: `Saldo insuficiente en pesos. Necesitas $${montoARS.toFixed(2)} ARS a una cotización de $${tasaCambio}.`
                });
            }
        } else if (tipoOperacion === 'VENTA') {
            if (parseFloat(cuentaUSD.saldo) < montoNumUSD) {
                return res.status(400).json({
                    error: `Saldo insuficiente en dólares. Intentas vender US$${montoNumUSD} pero tienes US$${cuentaUSD.saldo}.`
                });
            }
        }

        // 3. Ejecutar actualización en la base de datos local bajo transacción SQL
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let nuevoSaldoARS, nuevoSaldoUSD;

            if (tipoOperacion === 'COMPRA') {
                nuevoSaldoARS = parseFloat(cuentaARS.saldo) - montoARS;
                nuevoSaldoUSD = parseFloat(cuentaUSD.saldo) + montoNumUSD;
            } else {
                nuevoSaldoARS = parseFloat(cuentaARS.saldo) + montoARS;
                nuevoSaldoUSD = parseFloat(cuentaUSD.saldo) - montoNumUSD;
            }

            // Descontar/acreditar en cuenta ARS
            await client.query(
                'UPDATE cuentas_bancarias SET saldo = $1 WHERE id_cuenta = $2',
                [nuevoSaldoARS, cuentaARS.id_cuenta]
            );

            // Descontar/acreditar en cuenta USD
            await client.query(
                'UPDATE cuentas_bancarias SET saldo = $1 WHERE id_cuenta = $2',
                [nuevoSaldoUSD, cuentaUSD.id_cuenta]
            );

            // Registrar en la tabla transferencias_central usando tus columnas reales:
            // cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda
            // Generar un ID único local para el cambio de divisa
            const transaccionIdLocal = `INT-${crypto.randomUUID()}`;

// Actualizamos la consulta para incluir transaccion_central_id en el INSERT
            const insertQuery = `
                INSERT INTO transferencias_central (transaccion_central_id, cbu_origen, cbu_destino, importe, estado, tipo, fecha_hora, moneda)
                VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
                RETURNING *;
            `;

            const origenCbu = tipoOperacion === 'COMPRA' ? cuentaARS.cbu : cuentaUSD.cbu;
            const destinoCbu = tipoOperacion === 'COMPRA' ? cuentaUSD.cbu : cuentaARS.cbu;
            const montoOperacion = tipoOperacion === 'COMPRA' ? montoNumUSD : montoARS;
            const monedaOp = tipoOperacion === 'COMPRA' ? 'USD' : 'ARS';
            const tipoTransaccion = tipoOperacion === 'COMPRA' ? 'COMPRA_USD' : 'VENTA_USD';

            const resultadoTransaccion = await client.query(insertQuery, [
                transaccionIdLocal, // $1: El ID generado localmente
                origenCbu,          // $2
                destinoCbu,         // $3
                montoOperacion,     // $4
                'OK',               // $5
                tipoTransaccion,    // $6
                monedaOp            // $7
            ]);

            await client.query('COMMIT');

            return res.status(200).json({
                mensaje: `Operación de ${tipoOperacion} realizada con éxito.`,
                operacion: {
                    tipo: tipoOperacion,
                    montoUSD: montoNumUSD,
                    montoARS: montoARS.toFixed(2),
                    tasaCambio,
                    saldoUSDActual: nuevoSaldoUSD,
                    saldoARSActual: nuevoSaldoARS
                },
                transaccion: resultadoTransaccion.rows[0]
            });

        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('Error en transacción de compra/venta divisas:', dbError);
            return res.status(500).json({ 
                error: 'Ocurrió un error al procesar el cambio de divisas.',
                detalle: dbError.message 
            });
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error en operarDivisas:', error.message);
        return res.status(502).json({ error: error.message || 'Error al comunicarse con la API de cotización.' });
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
        res.status(502).json({ error: error.message });
    }
};

module.exports = {
    operarDivisas,
    getTransaccionesDolares,
    getCotizacionDolar
};