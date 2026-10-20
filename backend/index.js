// Fuerza que el DNS resuelva IPv4 antes que IPv6.
// Sin esto, Supabase resuelve a una IP v6 que las redes locales no alcanzan.
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { verifyDbConnection } = require('./src/config/db');

const accountsRoutes = require('./src/routes/accountsRoutes');
const onboardingRoutes = require('./src/routes/onboardingRoutes');
const transferenciasRoutes = require('./src/routes/transferenciasRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const empleadoRoutes = require('./src/routes/empleadoRoutes');
const gerenteRoutes = require('./src/routes/gerenteRoutes');
const prestamosRoutes = require('./src/routes/prestamosRoutes');
const tarjetasRoutes = require('./src/routes/tarjetasRoutes');
const chatRoutes = require('./src/routes/chatRoutes');
const divisasRoutes = require('./src/routes/divisasRoutes');
const contactosRoutes = require('./src/routes/contactosRoutes');
const comprobantesRoutes = require('./src/routes/comprobantesRoutes');
const frascosRoutes = require('./src/routes/frascosRoutes');
const { simularPrestamo } = require('./src/controllers/prestamosController');


const app = express();
const bypassClerkAuth = process.env.BYPASS_CLERK_AUTH === 'true';

// El bypass es solo para pruebas locales: publicado, dejaría entrar a cualquiera sin login.
if (bypassClerkAuth && process.env.NODE_ENV === 'production') {
  console.error('BYPASS_CLERK_AUTH no se puede usar con NODE_ENV=production. Sacalo de las variables del servidor.');
  process.exit(1);
}
const authMiddleware = bypassClerkAuth
  ? (req, res, next) => { req.auth = { userId: 'dev_bypass_user' }; next(); }
  : ClerkExpressRequireAuth({ strict: true });

// Solo el frontend puede llamar a la API desde el navegador. FRONTEND_URL acepta varias direcciones
// separadas por coma (por ejemplo la de Vercel y la de una vista previa). En local, el Vite de siempre.
const origenesPermitidos = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);
app.use(cors({ origin: origenesPermitidos }));
app.use(express.json());

// Público: la landing simula un préstamo antes de que el visitante tenga cuenta.
// Solo calcula con los parámetros de config/prestamos.js; no lee datos de nadie.
app.get('/api/public/simular', simularPrestamo);

// Para que AWS sepa que el servidor está vivo (health check). No toca la base.
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/cuentas', authMiddleware, accountsRoutes);
app.use('/api/onboarding', authMiddleware, onboardingRoutes);
app.use('/api/transferencias', authMiddleware, transferenciasRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/api/empleado', authMiddleware, empleadoRoutes);
app.use('/api/gerente', authMiddleware, gerenteRoutes);
app.use('/api/prestamos', authMiddleware, prestamosRoutes);
app.use('/api/tarjetas', authMiddleware, tarjetasRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/divisas', authMiddleware, divisasRoutes);
app.use('/api/contactos', authMiddleware, contactosRoutes);
app.use('/api/comprobantes', authMiddleware, comprobantesRoutes);
app.use('/api/frascos', authMiddleware, frascosRoutes);


app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: 'No estas autenticado en 404Bank.' });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;

const { iniciarPolling } = require('./src/services/pollingService');
const { iniciarCronCobros } = require('./src/cron/cobroPrestamosCron');
const { iniciarCronFrascos } = require('./src/cron/frascosCron');

const startServer = async () => {
  try {
    await verifyDbConnection();
    app.listen(PORT, () => {
      console.log(`Servidor 404Bank corriendo en el puerto ${PORT}`);
      if (bypassClerkAuth) {
        console.log('BYPASS_CLERK_AUTH=true: autenticacion desactivada para pruebas locales.');
      }
      // Las tareas automáticas (polling del Banco Central, cuotas, frascos) tienen que correr en un solo
      // servidor: si corren en AWS y en local a la vez contra la misma base, se ejecutan dos veces.
      // En local poné CRONS_ACTIVOS=false mientras el backend publicado esté prendido.
      if (process.env.CRONS_ACTIVOS === 'false') {
        console.log('CRONS_ACTIVOS=false: polling y crons apagados en este servidor.');
        return;
      }
      iniciarPolling();
      iniciarCronCobros();
      iniciarCronFrascos();
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL al iniciar el backend:', error.message);
    process.exit(1);
  }
};

startServer();
