const { pool } = require('../config/db');

// Obtener todos los clientes con sus cuentas
const getUsuarios = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
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

module.exports = { getUsuarios, getTodasTransferencias, bloquearCuenta, activarCuenta };
