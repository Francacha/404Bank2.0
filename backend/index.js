// Fuerza que el DNS resuelva IPv4 antes que IPv6.
// Sin esto, Supabase resuelve a una IP v6 que las redes locales no alcanzan.
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { clerkMiddleware, getAuth } = require('@clerk/express');
const { verifyDbConnection } = require('./src/config/db');

// VITE_ es una convención del frontend. El SDK de Express usa esta variable.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.VITE_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.VITE_CLERK_PUBLISHABLE_KEY;
}

const accountsRoutes = require('./src/routes/accountsRoutes');
const personasRoutes = require('./src/routes/personasRoutes');
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
const frascosRoutes = require('./src/routes/frascosRoutes');


const app = express();
const bypassClerkAuth = process.env.BYPASS_CLERK_AUTH === 'true';

if (!bypassClerkAuth && !process.env.CLERK_SECRET_KEY) {
  throw new Error('Falta CLERK_SECRET_KEY en backend/.env');
}

if (!bypassClerkAuth) {
  // Solo interpreta y valida la sesión; la respuesta 401 se define abajo.
  app.use(clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }));
}

const authMiddleware = bypassClerkAuth
<<<<<<< HEAD
  ? (req, res, next) => { req.auth = { userId: 'dev_bypass_user' }; next(); }
=======
<<<<<<< Updated upstream
  ? (req, res, next) => next()
>>>>>>> 5c981e31c9be347b589c8fe476ccdda89e3bb55d
  : ClerkExpressRequireAuth({ strict: true });
=======
  ? (req, res, next) => { req.auth = { userId: 'dev_bypass_user' }; next(); }
  : (req, res, next) => {
      const auth = getAuth(req);
      if (!auth.userId) {
        return res.status(401).json({
          error: 'Sesión no válida o vencida. Cerrá sesión e ingresá nuevamente.',
          code: 'UNAUTHENTICATED',
        });
      }

      // El código existente consume req.auth.userId. El SDK actual lo expone
      // mediante getAuth(), por lo que mantenemos ese contrato internamente.
      req.auth = auth;
      next();
    };
>>>>>>> Stashed changes

app.use(cors());
app.use(express.json());

app.use('/api/cuentas', authMiddleware, accountsRoutes);
app.use('/api/personas', authMiddleware, personasRoutes);
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
app.use('/api/frascos', authMiddleware, frascosRoutes);


app.use((err, req, res, next) => {
  console.error('Error no controlado en la API:', err);
  if (res.headersSent) return next(err);

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: status === 401 ? 'Sesión no válida o vencida. Cerrá sesión e ingresá nuevamente.' : 'Error interno del servidor.',
  });
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
