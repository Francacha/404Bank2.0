const express = require('express');
const router = express.Router();
const {
  solicitarTarjeta,
  getMisTarjetas,
  getPendientes,
  preAprobar,
  rechazar,
  getPreAprobadas,
  aprobar,
} = require('../controllers/tarjetasController');

// Cliente
router.post('/solicitar', solicitarTarjeta);
router.get('/mis-tarjetas', getMisTarjetas);

// Empleado
router.get('/pendientes', getPendientes);
router.put('/:id/pre-aprobar', preAprobar);
router.put('/:id/rechazar', rechazar);

// Gerente
router.get('/pre-aprobadas', getPreAprobadas);
router.put('/:id/aprobar', aprobar);

module.exports = router;
