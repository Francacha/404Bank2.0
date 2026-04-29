require('dotenv').config();
const express = require('express');
const cors = require('cors'); // <-- 1. Importamos CORS
const { ClerkExpressRequireAuth } = require('@clerk/clerk-sdk-node');

// Importamos el "directorio" de rutas
const accountsRoutes = require('./src/routes/accountsRoutes');
const personasRoutes = require('./src/routes/personasRoutes');
const onboardingRoutes = require('./src/routes/onboardingRoutes');

const app = express();

app.use(cors()); // <-- 2. Activamos CORS para que React pueda entrar
app.use(express.json()); // Permite que el backend entienda JSON

// <-- 3. Ponemos al guardia de Clerk en las puertas (Rutas protegidas)
app.use('/api/cuentas', ClerkExpressRequireAuth({ strict: true }), accountsRoutes);
app.use('/api/personas', ClerkExpressRequireAuth({ strict: true }), personasRoutes);
app.use('/api/onboarding', ClerkExpressRequireAuth({ strict: true }), onboardingRoutes);

// <-- 4. Manejador de errores para que devuelva un mensaje limpio si alguien entra sin Token
app.use((err, req, res, next) => {
  if (err.message === 'Unauthenticated') {
    return res.status(401).json({ error: '¡Alto ahí! No estás autenticado en 404Bank.' });
  }
  next(err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🏦 Servidor 404Bank corriendo en el puerto ${PORT}`);
});