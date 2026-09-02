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
<<<<<<< Updated upstream
  ? (req, res, next) => next()
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

app.use((err, req, res, next) => {
  console.error('Error no controlado en la API:', err);
  if (res.headersSent) return next(err);

  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: status === 401 ? 'Sesión no válida o vencida. Cerrá sesión e ingresá nuevamente.' : 'Error interno del servidor.',
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await verifyDbConnection();
    app.listen(PORT, () => {
      console.log(`Servidor 404Bank corriendo en el puerto ${PORT}`);
      if (bypassClerkAuth) {
        console.log('BYPASS_CLERK_AUTH=true: autenticacion desactivada para pruebas locales.');
      }
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL al iniciar el backend:', error.message);
    process.exit(1);
  }
};

startServer();
