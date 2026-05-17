const express = require('express');
const router = express.Router();
const { realizarTransferencia, obtenerMisTransferencias, buscarDestinatario } = require('../controllers/transferenciasController');

router.post('/', realizarTransferencia);
router.get('/mis-transferencias', obtenerMisTransferencias);
router.get('/buscar',buscarDestinatario)

module.exports = router;
