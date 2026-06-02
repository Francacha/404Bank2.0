const express = require('express');
const router = express.Router();
const {
  solicitarPrestamo,
  getMisPrestamos,
  getPendientes,
  preAprobar,
  rechazar,
  getPreAprobados,
  aprobar,
} = require('../controllers/prestamosController');

// Cliente
router.post('/solicitar', solicitarPrestamo);
router.get('/mis-prestamos', getMisPrestamos);

// Empleado
router.get('/pendientes', getPendientes);
router.put('/:id/pre-aprobar', preAprobar);
router.put('/:id/rechazar', rechazar);

// Gerente
router.get('/pre-aprobados', getPreAprobados);
router.put('/:id/aprobar', aprobar);

module.exports = router;
