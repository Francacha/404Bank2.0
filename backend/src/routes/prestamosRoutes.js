const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  simularPrestamo,
  solicitarPrestamo,
  getMisPrestamos,
  getMiSituacionCrediticia,
  getPendientes,
  preAprobar,
  rechazar,
  getPreAprobados,
  aprobar,
} = require('../controllers/prestamosController');

// Cliente
router.get('/simular', simularPrestamo);
router.post('/solicitar', solicitarPrestamo);
router.get('/mis-prestamos', getMisPrestamos);
router.get('/mi-situacion-crediticia', getMiSituacionCrediticia);

// Empleado (el admin también puede)
router.get('/pendientes', requireRole(['empleado', 'admin']), getPendientes);
router.put('/:id/pre-aprobar', requireRole(['empleado', 'admin']), preAprobar);
router.put('/:id/rechazar', requireRole(['empleado', 'gerente', 'admin']), rechazar);

// Gerente (el admin también puede)
router.get('/pre-aprobados', requireRole(['gerente', 'admin']), getPreAprobados);
router.put('/:id/aprobar', requireRole(['gerente', 'admin']), aprobar);

module.exports = router;
