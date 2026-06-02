const { pool } = require('../config/db');

// CLIENTE: solicitar un préstamo
const solicitarPrestamo = async (req, res) => {
  const clerkId = req.auth.userId;
  const { monto } = req.body;

  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }

  try {
    const cuentaResult = await pool.query(
      `SELECT cb.id_cuenta FROM cuentas_bancarias cb
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1 AND cb.estado = 'Activa'
       LIMIT 1`,
      [clerkId]
    );

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No tenés una cuenta activa' });
    }

    const id_cuenta = cuentaResult.rows[0].id_cuenta;

    const result = await pool.query(
      `INSERT INTO prestamos (id_cuenta, monto) VALUES ($1, $2) RETURNING *`,
      [id_cuenta, monto]
    );

    res.status(201).json({ prestamo: result.rows[0] });
  } catch (error) {
    console.error('Error solicitando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CLIENTE: ver sus préstamos
const getMisPrestamos = async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `SELECT pr.* FROM prestamos pr
       JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1
       ORDER BY pr.fecha_solicitud DESC`,
      [clerkId]
    );

    res.json({ prestamos: result.rows });
  } catch (error) {
    console.error('Error obteniendo préstamos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: ver solicitudes pendientes
const getPendientes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, p.nombre, p.apellido, p.dni, cb.cbu
       FROM prestamos pr
       JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE pr.estado = 'pendiente'
       ORDER BY pr.fecha_solicitud ASC`
    );
    res.json({ prestamos: result.rows });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: pre-aprobar un préstamo
const preAprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `UPDATE prestamos SET estado = 'pre_aprobado', clerk_id_empleado = $1
       WHERE id = $2 AND estado = 'pendiente' RETURNING *`,
      [clerkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Préstamo no encontrado o no está pendiente' });
    }

    res.json({ prestamo: result.rows[0] });
  } catch (error) {
    console.error('Error pre-aprobando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO / GERENTE: rechazar un préstamo
const rechazar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `UPDATE prestamos
       SET estado = 'rechazado', fecha_resolucion = NOW(),
           clerk_id_empleado = COALESCE(clerk_id_empleado, $1),
           clerk_id_gerente = $1
       WHERE id = $2 AND estado IN ('pendiente','pre_aprobado') RETURNING *`,
      [clerkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Préstamo no encontrado o ya fue resuelto' });
    }

    res.json({ prestamo: result.rows[0] });
  } catch (error) {
    console.error('Error rechazando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GERENTE: ver préstamos pre-aprobados
const getPreAprobados = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, p.nombre, p.apellido, p.dni, cb.cbu
       FROM prestamos pr
       JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE pr.estado = 'pre_aprobado'
       ORDER BY pr.fecha_solicitud ASC`
    );
    res.json({ prestamos: result.rows });
  } catch (error) {
    console.error('Error obteniendo pre-aprobados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GERENTE: aprobar definitivamente y acreditar saldo
const aprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const prestamoResult = await pool.query(
      `SELECT * FROM prestamos WHERE id = $1 AND estado = 'pre_aprobado'`,
      [id]
    );

    if (prestamoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Préstamo no encontrado o no está pre-aprobado' });
    }

    const prestamo = prestamoResult.rows[0];

    await pool.query(
      `UPDATE cuentas_bancarias SET saldo = saldo + $1 WHERE id_cuenta = $2`,
      [prestamo.monto, prestamo.id_cuenta]
    );

    const result = await pool.query(
      `UPDATE prestamos
       SET estado = 'aprobado', clerk_id_gerente = $1, fecha_resolucion = NOW()
       WHERE id = $2 RETURNING *`,
      [clerkId, id]
    );

    res.json({ prestamo: result.rows[0] });
  } catch (error) {
    console.error('Error aprobando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { solicitarPrestamo, getMisPrestamos, getPendientes, preAprobar, rechazar, getPreAprobados, aprobar };
