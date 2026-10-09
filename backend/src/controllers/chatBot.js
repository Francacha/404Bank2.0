const { getChatResponse } = require('../services/gemini');

const LARGO_MAXIMO = 2_000;

// Límite simple por usuario, en memoria: alcanza para una demo con una sola instancia del servidor
// y evita que un script consuma la cuota paga de Gemini.
const VENTANA_MS = 60_000;
const MAXIMO_POR_VENTANA = 10;
const pedidosPorUsuario = new Map();

function superaLimite(userId) {
  const ahora = Date.now();
  const recientes = (pedidosPorUsuario.get(userId) || []).filter(t => ahora - t < VENTANA_MS);
  if (recientes.length >= MAXIMO_POR_VENTANA) {
    pedidosPorUsuario.set(userId, recientes);
    return true;
  }
  recientes.push(ahora);
  pedidosPorUsuario.set(userId, recientes);
  return false;
}

async function handleChatMessage(req, res) {
  const { message, history } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Escribí una consulta para Ban.' });
  }
  if (message.trim().length > LARGO_MAXIMO) {
    return res.status(400).json({ error: `La consulta es muy larga: el máximo es de ${LARGO_MAXIMO.toLocaleString('es-AR')} caracteres.` });
  }
  if (superaLimite(req.auth?.userId || req.ip)) {
    return res.status(429).json({ error: 'Le estás escribiendo muy rápido a Ban. Esperá un minuto y probá de nuevo.' });
  }

  try {
    const reply = await getChatResponse(message.trim(), history);
    if (!reply) {
      return res.status(502).json({ error: 'Ban no pudo armar una respuesta. Probá con otras palabras.' });
    }
    return res.json({ reply });
  } catch (error) {
    console.error('Error en chat:', error.message);
    if (error.code === 'TIMEOUT') {
      return res.status(504).json({ error: 'Ban tardó demasiado en responder. Probá de nuevo.' });
    }
    return res.status(502).json({ error: 'Ban no pudo responder ahora. Probá de nuevo en un momento.' });
  }
}

module.exports = { handleChatMessage };
