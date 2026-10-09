const crypto = require('crypto');
const { pool } = require('../config/db');
const { asegurarColumnasRechazo, armarMotivo, esSolicitudPropia, MENSAJE_PROPIA, idValido } = require('../services/solicitudesService');

// Número de 16 dígitos con prefijo de red (4 = Visa para débito, 5 = Mastercard para crédito)
// y dígito verificador de Luhn, como una tarjeta real.
const generarNumeroTarjeta = (tipo) => {
  const digitos = [tipo === 'credito' ? 5 : 4];
  while (digitos.length < 15) digitos.push(crypto.randomInt(10));
  const suma = digitos.reduce((acc, d, i) => {
    // Desde la derecha (contando el verificador que falta), se duplican las posiciones pares.
    if (i % 2 === 0) {
      const doble = d * 2;
      return acc + (doble > 9 ? doble - 9 : doble);
    }
    return acc + d;
  }, 0);
  digitos.push((10 - (suma % 10)) % 10);
  return digitos.join('');
};

const generarCVV = () => String(crypto.randomInt(1000)).padStart(3, '0');

// Lo que el cliente ve de sus tarjetas en listados: nunca el número completo ni el CVV.
const COLUMNAS_CLIENTE = `t.id, t.tipo, t.estado, t.fecha_solicitud, t.fecha_resolucion, t.fecha_vencimiento,
       RIGHT(t.numero, 4) AS ultimos4, t.motivo_rechazo`;

// Lo que ve el personal de una solicitud: sin número ni CVV, con quién la pre-aprobó.
const COLUMNAS_PERSONAL = `t.id, t.id_cuenta, t.tipo, t.estado, t.fecha_solicitud,
       p.nombre, p.apellido, p.dni, cb.cbu, cb.saldo AS saldo_cuenta,
       CASE WHEN pe.id IS NULL THEN NULL ELSE pe.nombre || ' ' || pe.apellido END AS pre_aprobado_por`;

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
    return res.status(400).json({ error: 'Elegí si querés una tarjeta de débito o de crédito.' });
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

    // Una tarjeta de cada tipo: si ya hay una activa o en trámite, no se pide otra.
    const existente = await pool.query(
      `SELECT estado FROM tarjetas
       WHERE id_cuenta = $1 AND tipo = $2 AND estado IN ('pendiente', 'pre_aprobada', 'activa')
       LIMIT 1`,
      [id_cuenta, tipo]
    );
    if (existente.rows.length > 0) {
      const nombre = tipo === 'credito' ? 'crédito' : 'débito';
      return res.status(409).json({
        error: existente.rows[0].estado === 'activa'
          ? `Ya tenés una tarjeta de ${nombre} activa.`
          : `Ya tenés una solicitud de tarjeta de ${nombre} en revisión.`
      });
    }

    const result = await pool.query(
      `INSERT INTO tarjetas (id_cuenta, tipo) VALUES ($1, $2)
       RETURNING id, tipo, estado, fecha_solicitud, fecha_resolucion, fecha_vencimiento`,
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
    await asegurarColumnasRechazo();
    const result = await pool.query(
      `SELECT ${COLUMNAS_CLIENTE} FROM tarjetas t
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

// CLIENTE: número completo y CVV, solo de una tarjeta propia y activa
const getDatosTarjeta = async (req, res) => {
  const clerkId = req.auth.userId;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT t.numero, t.cvv, t.fecha_vencimiento FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE t.id = $1 AND p.clerk_id = $2 AND t.estado = 'activa'`,
      [id, clerkId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No encontramos esa tarjeta entre tus tarjetas activas.' });
    }
    res.set('Cache-Control', 'no-store');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo datos de tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: ver solicitudes pendientes
const getPendientes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${COLUMNAS_PERSONAL}
       FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       LEFT JOIN personas pe ON pe.clerk_id = t.clerk_id_empleado
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
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });

  try {
    if (await esSolicitudPropia(pool, 'tarjetas', id, clerkId)) {
      return res.status(403).json({ error: MENSAJE_PROPIA });
    }
    const result = await pool.query(
      `UPDATE tarjetas SET estado = 'pre_aprobada', clerk_id_empleado = $1
       WHERE id = $2 AND estado = 'pendiente' RETURNING id, tipo, estado`,
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

// EMPLEADO / GERENTE: rechazar una tarjeta, con un motivo que ve el cliente.
const rechazar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });

  const motivo = armarMotivo(req.body);
  if (!motivo) return res.status(400).json({ error: 'Elegí un motivo de rechazo (si es "otro", contá cuál).' });

  try {
    if (await esSolicitudPropia(pool, 'tarjetas', id, clerkId)) {
      return res.status(403).json({ error: MENSAJE_PROPIA });
    }
    await asegurarColumnasRechazo();
    const esGerente = req.userRole === 'gerente' || req.userRole === 'admin';
    const result = await pool.query(
      `UPDATE tarjetas
       SET estado = 'rechazada', fecha_resolucion = NOW(), motivo_rechazo = $3,
           clerk_id_empleado = CASE WHEN $4::boolean THEN clerk_id_empleado ELSE $1 END,
           clerk_id_gerente = CASE WHEN $4::boolean THEN $1 ELSE clerk_id_gerente END
       WHERE id = $2 AND estado IN ('pendiente','pre_aprobada') RETURNING id, tipo, estado`,
      [clerkId, id, motivo, esGerente]
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
      `SELECT ${COLUMNAS_PERSONAL}
       FROM tarjetas t
       JOIN cuentas_bancarias cb ON t.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       LEFT JOIN personas pe ON pe.clerk_id = t.clerk_id_empleado
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
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });

  try {
    if (await esSolicitudPropia(pool, 'tarjetas', id, clerkId)) {
      return res.status(403).json({ error: MENSAJE_PROPIA });
    }
    const tarjetaResult = await pool.query(
      `SELECT * FROM tarjetas WHERE id = $1 AND estado = 'pre_aprobada'`,
      [id]
    );

    if (tarjetaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tarjeta no encontrada o no está pre-aprobada' });
    }

    const numero = generarNumeroTarjeta(tarjetaResult.rows[0].tipo);
    const cvv = generarCVV();
    const fecha_vencimiento = generarVencimiento();

    const result = await pool.query(
      `UPDATE tarjetas
       SET estado = 'activa', numero = $1, cvv = $2, fecha_vencimiento = $3,
           clerk_id_gerente = $4, fecha_resolucion = NOW()
       WHERE id = $5 RETURNING id, tipo, estado, fecha_resolucion, fecha_vencimiento`,
      [numero, cvv, fecha_vencimiento, clerkId, id]
    );

    res.json({ tarjeta: result.rows[0] });
  } catch (error) {
    console.error('Error aprobando tarjeta:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { solicitarTarjeta, getMisTarjetas, getDatosTarjeta, getPendientes, preAprobar, rechazar, getPreAprobadas, aprobar };
