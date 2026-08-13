const express = require('express');
const { handleChatMessage } = require('../controllers/chatBot');

const router = express.Router();

// La autenticacion se aplica al montar esta ruta en index.js.
router.post('/', handleChatMessage);

module.exports = router;
