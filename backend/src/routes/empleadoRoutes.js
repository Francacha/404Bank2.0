const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  buscarUsuarios,
  getMovimientosPorCbu,
  bloquearCuenta,
  activarCuenta,
} = require('../controllers/empleadoController');

// Todas las rutas requieren rol 'empleado' o 'admin'
router.use(requireRole(['empleado', 'admin']));

router.get('/buscar', buscarUsuarios);
router.get('/movimientos/:cbu', getMovimientosPorCbu);
router.patch('/cuentas/:id_cuenta/bloquear', bloquearCuenta);
router.patch('/cuentas/:id_cuenta/activar', activarCuenta);

module.exports = router;
