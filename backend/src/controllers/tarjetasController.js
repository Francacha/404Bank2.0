const { pool } = require('../config/db');

const generarNumeroTarjeta = () => {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');
};

const generarCVV = () => {
  return Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');
};

const generarVencimiento = () => {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() + 4);
  return fecha.toISOString().split('T')[0];
};

// CLIENTE: solicitar una tarjeta
const solicitarTarjeta = async (req, res) => {
  const clerkId = req.auth.userId;
  const { tipo } = req.body;

  if (!tipo || !['debito', 'credito'].includes(tipo)) {
    return res.status(400).json({ error: 'El tipo debe ser debito o credito' });
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
      `INSERT INTO tarjetas (id_cuenta, tipo) VALUES ($1, $2) RETURNING *`,
      [id_cuenta, tipo]
    );

    res.status(201).json({ tarjeta: result.rows[0] });
  } catch (error) {
    console.error('Error solicitando tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CLIENTE: ver sus tarjetas
const getMisTarjetas = async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `SELECT t.* FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1
       ORDER BY t.fecha_solicitud DESC`,
      [clerkId]
    );

    res.json({ tarjetas: result.rows });
  } catch (error) {
    console.error('Error obteniendo tarjetas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: ver solicitudes pendientes
const getPendientes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.nombre, p.apellido, p.dni, cb.cbu
       FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE t.estado = 'pendiente'
       ORDER BY t.fecha_solicitud ASC`
    );
    res.json({ tarjetas: result.rows });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: pre-aprobar una tarjeta
const preAprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `UPDATE tarjetas SET estado = 'pre_aprobada', clerk_id_empleado = $1
       WHERE id = $2 AND estado = 'pendiente' RETURNING *`,
      [clerkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada o no está pendiente' });
    }

    res.json({ tarjeta: result.rows[0] });
  } catch (error) {
    console.error('Error pre-aprobando tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO / GERENTE: rechazar una tarjeta
const rechazar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `UPDATE tarjetas
       SET estado = 'rechazada', fecha_resolucion = NOW(),
           clerk_id_empleado = COALESCE(clerk_id_empleado, $1),
           clerk_id_gerente = $1
       WHERE id = $2 AND estado IN ('pendiente','pre_aprobada') RETURNING *`,
      [clerkId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada o ya fue resuelta' });
    }

    res.json({ tarjeta: result.rows[0] });
  } catch (error) {
    console.error('Error rechazando tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GERENTE: ver tarjetas pre-aprobadas
const getPreAprobadas = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, p.nombre, p.apellido, p.dni, cb.cbu
       FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE t.estado = 'pre_aprobada'
       ORDER BY t.fecha_solicitud ASC`
    );
    res.json({ tarjetas: result.rows });
  } catch (error) {
    console.error('Error obteniendo pre-aprobadas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GERENTE: aprobar definitivamente y generar datos de tarjeta
const aprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  try {
    const tarjetaResult = await pool.query(
      `SELECT * FROM tarjetas WHERE id = $1 AND estado = 'pre_aprobada'`,
      [id]
    );

    if (tarjetaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada o no está pre-aprobada' });
    }

    const numero = generarNumeroTarjeta();
    const cvv = generarCVV();
    const fecha_vencimiento = generarVencimiento();

    const result = await pool.query(
      `UPDATE tarjetas
       SET estado = 'activa', numero = $1, cvv = $2, fecha_vencimiento = $3,
           clerk_id_gerente = $4, fecha_resolucion = NOW()
       WHERE id = $5 RETURNING *`,
      [numero, cvv, fecha_vencimiento, clerkId, id]
    );

    res.json({ tarjeta: result.rows[0] });
  } catch (error) {
    console.error('Error aprobando tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { solicitarTarjeta, getMisTarjetas, getPendientes, preAprobar, rechazar, getPreAprobadas, aprobar };
