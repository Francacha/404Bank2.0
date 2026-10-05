const express = require('express');
const router = express.Router();
const { simularFrasco, getMisFrascos, crearFrasco } = require('../controllers/frascosController');

// Cliente
router.get('/simular', simularFrasco);
router.get('/', getMisFrascos);
router.post('/', crearFrasco);

module.exports = router;
