const { clerkClient } = require('@clerk/clerk-sdk-node');
const { pool } = require('../config/db');

// Lista todos los usuarios con rol 'empleado'
const getEmpleados = async (req, res) => {
  try {
    const clerkUsuarios = await clerkClient.users.getUserList({ limit: 100 });
    const empleados = clerkUsuarios.filter(u => u.publicMetadata?.role === 'empleado');

    if (empleados.length === 0) return res.json({ usuarios: [] });

    const clerkIds = empleados.map(u => u.id);
    const personasResult = await pool.query(
      `SELECT clerk_id, nombre, apellido FROM Personas WHERE clerk_id = ANY($1)`,
      [clerkIds]
    );
    const personaMap = {};
    personasResult.rows.forEach(p => { personaMap[p.clerk_id] = p; });

    const resultado = empleados.map(u => {
      const persona = personaMap[u.id];
      return {
        clerkId: u.id,
        email: u.emailAddresses[0]?.emailAddress || '',
        nombre: persona?.nombre || u.firstName || '',
        apellido: persona?.apellido || u.lastName || '',
      };
    });

    res.json({ usuarios: resultado });
  } catch (error) {
    console.error('Error obteniendo empleados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Asigna rol 'empleado' a un usuario por email
const asignarEmpleado = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El email es requerido' });
  }
  try {
    const usuarios = await clerkClient.users.getUserList({ emailAddress: [email] });
    if (!usuarios || usuarios.length === 0) {
      return res.status(404).json({ error: 'No se encontró ningún usuario con ese email' });
    }
    const usuario = usuarios[0];
    const rolActual = usuario.publicMetadata?.role;
    if (rolActual === 'gerente' || rolActual === 'admin') {
      return res.status(400).json({ error: `No podés modificar a un usuario con rol '${rolActual}'` });
    }
    await clerkClient.users.updateUser(usuario.id, { publicMetadata: { role: 'empleado' } });
    res.json({ mensaje: `Rol 'empleado' asignado correctamente a ${email}`, clerkId: usuario.id });
  } catch (error) {
    console.error('Error asignando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Revoca el rol 'empleado' (vuelve a ser cliente)
const revocarEmpleado = async (req, res) => {
  const { clerkId } = req.params;
  try {
    const usuario = await clerkClient.users.getUser(clerkId);
    if (usuario.publicMetadata?.role !== 'empleado') {
      return res.status(400).json({ error: 'El usuario no tiene rol de empleado' });
    }
    await clerkClient.users.updateUser(clerkId, { publicMetadata: { role: null } });
    res.json({ mensaje: 'Rol revocado. El usuario vuelve a ser cliente.' });
  } catch (error) {
    console.error('Error revocando empleado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { getEmpleados, asignarEmpleado, revocarEmpleado };
