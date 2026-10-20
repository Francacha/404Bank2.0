// Dirección del backend. En local es localhost:3000; publicada, Vercel la toma de VITE_API_URL
// (por ejemplo https://xxxx.awsapprunner.com, sin barra final).
export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
