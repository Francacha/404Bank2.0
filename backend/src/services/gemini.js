const genAI = require('../config/gemini');

const SYSTEM_PROMPT = `Sos Ban, el asistente virtual de 404Bank.
Guias al usuario dentro de la banca digital: transferencias, tarjetas, prestamos,
historial, CBU/Alias y seguridad.

Reglas estrictas:
- Nunca ejecutas transacciones reales ni confirmas operaciones.
- Nunca inventas datos de cuenta, saldos o movimientos.
- No das asesoramiento financiero personalizado.
- Si requiere atencion personalizada, deriva a Atencion al cliente > Turnos.
- Horario de sucursales: lunes a viernes de 10:00 a 15:00 hs. La banca digital funciona 24 hs.`;

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const messages = history
    .filter(message =>
      message &&
      (message.from === 'user' || message.from === 'ban') &&
      typeof message.text === 'string' &&
      message.text.trim()
    )
    .slice(-10)
    .map(message => ({
      role: message.from === 'user' ? 'user' : 'model',
      parts: [{ text: message.text.trim().slice(0, 2_000) }],
    }));

  // Gemini requiere que el historial comience con un mensaje del usuario.
  while (messages[0]?.role === 'model') messages.shift();
  return messages;
}

async function getChatResponse(userMessage, history = []) {
  const model = genAI.getGenerativeModel({
    // El alias se mantiene actualizado por Gemini; se puede fijar otro modelo
    // compatible con GEMINI_MODEL si el proyecto lo requiere.
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({ history: normalizeHistory(history) });
  const result = await chat.sendMessage(userMessage);
  return result.response.text().trim();
}

module.exports = { getChatResponse };
