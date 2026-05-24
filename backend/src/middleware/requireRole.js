const { clerkClient } = require('@clerk/clerk-sdk-node');

// Recibe uno o varios roles permitidos, por ejemplo:
// requireRole('admin') o requireRole(['admin', 'gerente'])
const requireRole = (roles) => async (req, res, next) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  try {
    const user = await clerkClient.users.getUser(userId);
    const role = user.publicMetadata?.role;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'No tenés permiso para realizar esta acción' });
    }

    req.userRole = role; // lo dejamos disponible para los controllers
    next();
  } catch (err) {
    console.error('Error verificando rol:', err);
    res.status(500).json({ error: 'Error interno al verificar permisos' });
  }
};

module.exports = requireRole;
