const express = require('express');
const router = express.Router();
const { verificarPerfil, completarPerfil, obtenerPerfil, actualizarContacto } = require('../controllers/onboardingController');

router.get('/verificar', verificarPerfil);
router.post('/completar', completarPerfil);
router.get('/perfil', obtenerPerfil);
router.put('/perfil/contacto', actualizarContacto);

module.exports = router;
