const express = require('express');
const router = express.Router();
const { verificarPerfil, completarPerfil, obtenerPerfil } = require('../controllers/onboardingController');

router.get('/verificar', verificarPerfil);
router.post('/completar', completarPerfil);
router.get('/perfil', obtenerPerfil);

module.exports = router;
