/*Rutas correspondientes del cambio de divisas*/
const express = require('express');
const router = express.Router();
const divisasController = require('../controllers/divisasController');
const { validarCuentasDivisas } = require('../middleware/divisasMiddleware');

// Obtener cotización en vivo (Pública o Autenticada)
router.get('/cotizacion', divisasController.getCotizacionDolar);

// Operar Compra / Venta de USD (Requiere validar cuenta USD previamente)
router.post('/operar', validarCuentasDivisas, divisasController.operarDivisas);

// Ver historial de transacciones exclusivas en dólares
router.get('/transacciones-usd', validarCuentasDivisas, divisasController.getTransaccionesDolares);

module.exports = router;