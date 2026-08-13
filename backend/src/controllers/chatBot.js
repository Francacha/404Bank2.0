const { getChatResponse } = require('../services/gemini');

async function handleChatMessage(req, res) {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length > 2_000) {
      return res.status(400).json({ error: 'Mensaje invalido' });
    }

    const reply = await getChatResponse(message.trim(), history);
    return res.json({ reply });
  } catch (error) {
    console.error('Error en chat:', error);
    return res.status(502).json({ error: 'No se pudo procesar la consulta en este momento' });
  }
}

module.exports = { handleChatMessage };
