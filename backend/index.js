require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');
const { verifyDbConnection } = require('./src/config/db');

const accountsRoutes = require('./src/routes/accountsRoutes');
const personasRoutes = require('./src/routes/personasRoutes');
const onboardingRoutes = require('./src/routes/onboardingRoutes');
const transferenciasRoutes = require('./src/routes/transferenciasRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const empleadoRoutes = require('./src/routes/empleadoRoutes');
const gerenteRoutes = require('./src/routes/gerenteRoutes');
const prestamosRoutes = require('./src/routes/prestamosRoutes');
const tarjetasRoutes = require('./src/routes/tarjetasRoutes');




const app = express();
const bypassClerkAuth = process.env.BYPASS_CLERK_AUTH === 'true';
const authMiddleware = bypassClerkAuth
  ? (req, res, next) => { req.auth = { userId: 'dev_bypass_user' }; next(); }
  : ClerkExpressRequireAuth({ strict: true });

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




app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: 'No estas autenticado en 404Bank.' });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;

const { iniciarPolling } = require('./src/services/pollingService');

const startServer = async () => {
  try {
    await verifyDbConnection();
    app.listen(PORT, () => {
      console.log(`Servidor 404Bank corriendo en el puerto ${PORT}`);
      if (bypassClerkAuth) {
        console.log('BYPASS_CLERK_AUTH=true: autenticacion desactivada para pruebas locales.');
      }
      iniciarPolling();
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL al iniciar el backend:', error.message);
    process.exit(1);
  }
};

startServer();
