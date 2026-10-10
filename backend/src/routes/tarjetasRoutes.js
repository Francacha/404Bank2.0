const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  solicitarTarjeta,
  getMisTarjetas,
  getDatosTarjeta,
  pausarTarjeta,
  cancelarSolicitud,
  getPendientes,
  preAprobar,
  rechazar,
  getPreAprobadas,
  aprobar,
} = require('../controllers/tarjetasController');

// Cliente
router.post('/solicitar', solicitarTarjeta);
router.get('/mis-tarjetas', getMisTarjetas);

// Empleado (el admin también puede)
router.get('/pendientes', requireRole(['empleado', 'admin']), getPendientes);
router.put('/:id/pre-aprobar', requireRole(['empleado', 'admin']), preAprobar);
router.put('/:id/rechazar', requireRole(['empleado', 'gerente', 'admin']), rechazar);

// Gerente (el admin también puede)
router.get('/pre-aprobadas', requireRole(['gerente', 'admin']), getPreAprobadas);
router.put('/:id/aprobar', requireRole(['gerente', 'admin']), aprobar);

// Cliente: número completo y CVV de una tarjeta propia y activa, solo cuando los pide ("Ver datos")
router.get('/:id/datos', getDatosTarjeta);
router.put('/:id/pausa', pausarTarjeta);
router.delete('/:id', cancelarSolicitud);

module.exports = router;
