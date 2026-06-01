const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const {
  getUsuarios,
  getTodasTransferencias,
  bloquearCuenta,
  activarCuenta,
  getUsuariosConRol,
  asignarRol,
  revocarRol,
} = require('../controllers/adminController');

// Todas las rutas de acá requieren rol 'admin'
router.use(requireRole('admin'));

router.get('/usuarios', getUsuarios);
router.get('/transferencias', getTodasTransferencias);
router.patch('/cuentas/:id_cuenta/bloquear', bloquearCuenta);
router.patch('/cuentas/:id_cuenta/activar', activarCuenta);

// Gestión de roles (empleado / gerente)
router.get('/roles/usuarios-con-rol', getUsuariosConRol);
router.post('/roles/asignar', asignarRol);
router.delete('/roles/:clerkId/revocar', revocarRol);

module.exports = router;
