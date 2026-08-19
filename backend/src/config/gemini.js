const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Falta configurar GEMINI_API_KEY en el archivo .env del backend.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

module.exports = genAI;
