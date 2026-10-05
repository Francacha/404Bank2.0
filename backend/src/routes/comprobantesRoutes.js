const express = require('express');
const router = express.Router();
const { descargarComprobante } = require('../controllers/comprobantesController');

router.get('/:transaccionId', descargarComprobante);

module.exports = router;
