const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  getUsuarios,
  getTodasTransferencias,
  bloquearCuenta,
  activarCuenta,
} = require('../controllers/adminController');

// Todas las rutas de acá requieren rol 'admin'
router.use(requireRole('admin'));

router.get('/usuarios', getUsuarios);
router.get('/transferencias', getTodasTransferencias);
router.patch('/cuentas/:id_cuenta/bloquear', bloquearCuenta);
router.patch('/cuentas/:id_cuenta/activar', activarCuenta);

module.exports = router;
