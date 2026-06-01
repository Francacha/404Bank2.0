const { pool } = require('../config/db');

// Obtener todos los clientes con sus cuentas
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.clerk_id,
        p.nombre,
        p.apellido,
        p.dni,
        p.email,
        p.telefono,
        p.ciudad,
        p.provincia,
        cb.id_cuenta,
        cb.cbu,
        cb.alias,
        cb.saldo,
        cb.estado,
        cb.fecha_apertura
      FROM Personas p
      LEFT JOIN Titulares_Cuenta tit ON p.id = tit.id_persona
      LEFT JOIN Cuentas_Bancarias cb ON tit.id_cuenta = cb.id_cuenta
      ORDER BY p.apellido ASC
    `);
    res.json({ usuarios: result.rows });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener todas las transferencias del sistema
const getTodasTransferencias = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT *
      FROM Transferencias_Central
      ORDER BY fecha_hora DESC
      LIMIT 100
    `);
    res.json({ transferencias: result.rows });
  } catch (error) {
    console.error('Error obteniendo transferencias:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Bloquear una cuenta
const bloquearCuenta = async (req, res) => {
  const { id_cuenta } = req.params;
  try {
    const result = await pool.query(
      `UPDATE Cuentas_Bancarias SET estado = 'Bloqueada' WHERE id_cuenta = $1 RETURNING *`,
      [id_cuenta]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    res.json({ mensaje: 'Cuenta bloqueada correctamente', cuenta: result.rows[0] });
  } catch (error) {
    console.error('Error bloqueando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Activar una cuenta bloqueada
const activarCuenta = async (req, res) => {
  const { id_cuenta } = req.params;
  try {
    const result = await pool.query(
      `UPDATE Cuentas_Bancarias SET estado = 'Activa' WHERE id_cuenta = $1 RETURNING *`,
      [id_cuenta]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }
    res.json({ mensaje: 'Cuenta activada correctamente', cuenta: result.rows[0] });
  } catch (error) {
    console.error('Error activando cuenta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
const { clerkClient } = require('@clerk/clerk-sdk-node');

// Obtener todos los usuarios con rol 'empleado' o 'gerente'
const getUsuariosConRol = async (req, res) => {
  try {
    const clerkUsuarios = await clerkClient.users.getUserList({ limit: 100 });

    const conRol = clerkUsuarios.filter(u =>
      ['empleado', 'gerente'].includes(u.publicMetadata?.role)
    );

    if (conRol.length === 0) return res.json({ usuarios: [] });

    const emails = conRol
      .map(u => u.emailAddresses[0]?.emailAddress)
      .filter(Boolean);

    const personasResult = await pool.query(
      `SELECT email, nombre, apellido FROM Personas WHERE email = ANY($1)`,
      [emails]
    );
    const personaMap = {};
    personasResult.rows.forEach(p => { personaMap[p.email] = p; });

    const resultado = conRol.map(u => {
      const email = u.emailAddresses[0]?.emailAddress || '';
      const persona = personaMap[email];
      return {
        clerkId: u.id,
        email,
        nombre: persona?.nombre || u.firstName || '',
        apellido: persona?.apellido || u.lastName || '',
        role: u.publicMetadata?.role,
      };
    });

    res.json({ usuarios: resultado });
  } catch (error) {
    console.error('Error obteniendo usuarios con rol:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Asignar rol 'empleado' o 'gerente' a un usuario por clerkId
const asignarRol = async (req, res) => {
  const { clerkId, role } = req.body;

  if (!clerkId || !['empleado', 'gerente'].includes(role)) {
    return res.status(400).json({ error: 'clerkId y rol válido son requeridos (empleado o gerente)' });
  }

  try {
    await clerkClient.users.updateUser(clerkId, {
      publicMetadata: { role },
    });

    res.json({ mensaje: `Rol '${role}' asignado correctamente` });
  } catch (error) {
    console.error('Error asignando rol:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Revocar rol de un usuario (dejarlo sin rol = cliente)
const revocarRol = async (req, res) => {
  const { clerkId } = req.params;

  try {
    await clerkClient.users.updateUser(clerkId, {
      publicMetadata: { role: null },
    });

    res.json({ mensaje: 'Rol revocado correctamente. El usuario vuelve a ser cliente.' });
  } catch (error) {
    console.error('Error revocando rol:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};


module.exports = {
  getUsuarios,
  getTodasTransferencias,
  bloquearCuenta,
  activarCuenta,
  getUsuariosConRol,
  asignarRol,
  revocarRol,
};

