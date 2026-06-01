const express = require('express');
const router = express.Router();
const requireRole = require('../middleware/requireRole');
const { getEmpleados, asignarEmpleado, revocarEmpleado } = require('../controllers/gerenteController');
const { buscarUsuarios, getMovimientosPorCbu, bloquearCuenta, activarCuenta } = require('../controllers/empleadoController');

// Todas las rutas requieren rol 'gerente' o 'admin'
router.use(requireRole(['gerente', 'admin']));

// Gestión de empleados
router.get('/empleados', getEmpleados);
router.post('/empleados/asignar', asignarEmpleado);
router.delete('/empleados/:clerkId/revocar', revocarEmpleado);

// Gestión de clientes
router.get('/clientes/buscar', buscarUsuarios);
router.get('/clientes/movimientos/:cbu', getMovimientosPorCbu);
router.patch('/clientes/:id_cuenta/bloquear', bloquearCuenta);
router.patch('/clientes/:id_cuenta/activar', activarCuenta);

module.exports = router;
