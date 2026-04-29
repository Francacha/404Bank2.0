const express = require('express');
const router = express.Router();
const { getTodasLasPersonas } = require('../controllers/personasController');

// Cuando alguien haga un GET a la raíz de esta ruta, trae a todas las personas
router.get('/', getTodasLasPersonas);

module.exports = router;