const express = require('express');
const router = express.Router();
const { listarContactos, guardarContacto, eliminarContacto } = require('../controllers/contactosController');

router.get('/', listarContactos);
router.post('/', guardarContacto);
router.delete('/:id', eliminarContacto);

module.exports = router;
