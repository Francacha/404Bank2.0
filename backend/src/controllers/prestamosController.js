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
      `SELECT pr.*,
              COALESCE(
                (SELECT json_agg(cp ORDER BY cp.numero_cuota)
                 FROM cuotas_prestamo cp WHERE cp.id_prestamo = pr.id),
                '[]'
              ) AS cuotas
       FROM prestamos pr
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

// CLIENTE: ver su situación crediticia en el Banco Central
const getMiSituacionCrediticia = async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const personaResult = await pool.query(
      'SELECT dni FROM personas WHERE clerk_id = $1',
      [clerkId]
    );

    if (personaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No se encontró el cliente' });
    }

    const situacion = await obtenerSituacionCrediticia(personaResult.rows[0].dni);
    res.json({ situacion_crediticia: situacion });
  } catch (error) {
    console.error('Error consultando situación crediticia:', error);
    res.status(502).json({ error: 'No se pudo consultar al Banco Central' });
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

// Divide el monto en cuotas iguales (en centavos para evitar errores de redondeo).
// La diferencia de centavos se suma a la última cuota para que el total coincida exacto.
const calcularCuotas = (monto, cantCuotas) => {
  const totalCentavos = Math.round(Number(monto) * 100);
  const cuotaCentavos = Math.floor(totalCentavos / cantCuotas);
  const ultimaCentavos = totalCentavos - cuotaCentavos * (cantCuotas - 1);

  return Array.from({ length: cantCuotas }, (_, i) => ({
    numero_cuota: i + 1,
    monto: (i === cantCuotas - 1 ? ultimaCentavos : cuotaCentavos) / 100
  }));
};

// GERENTE: aprobar definitivamente, acreditar saldo y generar las cuotas
const aprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE evita que dos aprobaciones simultáneas acrediten el préstamo dos veces
    const prestamoResult = await client.query(
      `SELECT * FROM prestamos WHERE id = $1 AND estado = 'pre_aprobado' FOR UPDATE`,
      [id]
    );

    if (prestamoResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado o no está pre-aprobado' });
    }

    const prestamo = prestamoResult.rows[0];
    const cantCuotas = Math.max(1, Number(prestamo.cant_cuotas) || 1);
    const cuotas = calcularCuotas(prestamo.monto, cantCuotas);

    await client.query(
      `UPDATE cuentas_bancarias SET saldo = saldo + $1 WHERE id_cuenta = $2`,
      [prestamo.monto, prestamo.id_cuenta]
    );

    // Vencimientos mensuales consecutivos a partir de hoy: cuota 1 vence en 1 mes, cuota 2 en 2 meses, etc.
    for (const cuota of cuotas) {
      await client.query(
        `INSERT INTO cuotas_prestamo (id_prestamo, numero_cuota, monto, fecha_vencimiento, estado)
         VALUES ($1, $2, $3, (CURRENT_DATE + make_interval(months => $2))::date, 'pendiente')`,
        [prestamo.id, cuota.numero_cuota, cuota.monto]
      );
    }

    const result = await client.query(
      `UPDATE prestamos
       SET estado = 'aprobado', clerk_id_gerente = $1, fecha_resolucion = NOW(),
           cant_cuotas = $2, monto_cuota = $3
       WHERE id = $4 RETURNING *`,
      [clerkId, cantCuotas, cuotas[0].monto, id]
    );

    await client.query('COMMIT');
    res.json({ prestamo: result.rows[0], cuotas });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error aprobando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

module.exports = { solicitarPrestamo, getMisPrestamos, getMiSituacionCrediticia, getPendientes, preAprobar, rechazar, getPreAprobados, aprobar };
