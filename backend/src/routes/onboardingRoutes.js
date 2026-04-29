const express = require('express');
const router = express.Router();
const { verificarPerfil, completarPerfil } = require('../controllers/onboardingController');

router.get('/verificar', verificarPerfil);
router.post('/completar', completarPerfil);

module.exports = router;
