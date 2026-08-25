const express = require('express');
const router = express.Router();
const { getCuentasByCliente, getMisCuentas, abrirCajaAhorro } = require('../controllers/accountsController');

router.get('/mis-cuentas', getMisCuentas);
router.post('/caja-ahorro', abrirCajaAhorro);
// Cuando alguien entre a /api/cuentas/1, mandalo a la función getCuentasByCliente
router.get('/:id_persona', getCuentasByCliente);


module.exports = router;
