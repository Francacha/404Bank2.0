const { pool } = require('../config/db');
const { obtenerSituacionCrediticia } = require('../services/centralBankService');

// Agrega a cada préstamo la situación crediticia del cliente según el Banco Central.
// Si la consulta falla para un DNI, el préstamo se devuelve igual con situacion_crediticia = null.
const agregarSituacionCrediticia = async (prestamos) => {
  const consultas = new Map();
  for (const { dni } of prestamos) {
    if (!consultas.has(dni)) {
      consultas.set(dni, obtenerSituacionCrediticia(dni).catch((error) => {
        console.error(`Error consultando situación crediticia del DNI ${dni}:`, error.message);
        return null;
      }));
    }
  }

  return Promise.all(prestamos.map(async (prestamo) => ({
    ...prestamo,
    situacion_crediticia: await consultas.get(prestamo.dni)
  })));
};

// CLIENTE: solicitar un préstamo
const solicitarPrestamo = async (req, res) => {
  const clerkId = req.auth.userId;
  const { monto } = req.body;

  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }

  try {
    // 1. Obtener la cuenta y el DNI del usuario
    const cuentaResult = await pool.query(
      `SELECT cb.id_cuenta, p.dni FROM cuentas_bancarias cb
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1 AND cb.estado = 'Activa'
       LIMIT 1`,
      [clerkId]
    );

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No tenés una cuenta activa' });
    }

    const { id_cuenta, dni } = cuentaResult.rows[0];

    // 2. Consultar al Banco Central antes de dar el crédito
    const datosCrediticios = await obtenerSituacionCrediticia(dni);
    
    // Si la situación es 3 (Riesgo medio), 4 (Riesgo alto) o 5 (Irrecuperable), denegamos.
    if (datosCrediticios.situacion > 2) {
        return res.status(403).json({ 
            error: 'Préstamo denegado por situación crediticia desfavorable en el Banco Central.',
            situacion: datosCrediticios.situacion
        });
    }

    // 3. Si todo está bien, se registra el préstamo
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
    res.json({ prestamos: await agregarSituacionCrediticia(result.rows) });
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
    res.json({ prestamos: await agregarSituacionCrediticia(result.rows) });
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
