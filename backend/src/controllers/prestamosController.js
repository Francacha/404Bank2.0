const { pool } = require('../config/db');
const { obtenerSituacionCrediticia } = require('../services/centralBankService');
const { obtenerMoraCliente, obtenerMoraTitularesCuenta, MENSAJE_MORA } = require('../services/moraService');
const { asegurarColumnasRechazo, armarMotivo, esSolicitudPropia, MENSAJE_PROPIA, idValido } = require('../services/solicitudesService');
const {
  TNA, RECARGO_PUNITORIO, IVA_INTERESES, CUOTAS_INTERVALO, CUOTAS_PERMITIDAS, MONTO_MAXIMO, calcularPlanFrances
} = require('../config/prestamos');

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

// CLIENTE: simular cuánto pagaría por un monto en cada plan de cuotas
const simularPrestamo = (req, res) => {
  const monto = Number(req.query.monto);
  const opciones = monto > 0 && monto <= MONTO_MAXIMO
    ? CUOTAS_PERMITIDAS.map((cantCuotas) => {
        const { cuotas, ...resumen } = calcularPlanFrances(monto, cantCuotas, TNA);
        return { cant_cuotas: cantCuotas, ...resumen };
      })
    : [];

  res.json({
    tna: TNA,
    iva_intereses: IVA_INTERESES,
    recargo_punitorio: RECARGO_PUNITORIO,
    monto_maximo: MONTO_MAXIMO,
    cuotas_permitidas: CUOTAS_PERMITIDAS,
    opciones
  });
};

// CLIENTE: solicitar un préstamo
const solicitarPrestamo = async (req, res) => {
  const clerkId = req.auth.userId;
  const { monto, cant_cuotas } = req.body;
  const cantCuotas = Number(cant_cuotas) || 1;

  if (!monto || monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
  }

  if (Number(monto) > MONTO_MAXIMO) {
    return res.status(400).json({
      error: `El monto máximo es $ ${MONTO_MAXIMO.toLocaleString('es-AR')}.`,
      monto_maximo: MONTO_MAXIMO
    });
  }

  if (!CUOTAS_PERMITIDAS.includes(cantCuotas)) {
    return res.status(400).json({ error: `La cantidad de cuotas debe ser una de: ${CUOTAS_PERMITIDAS.join(', ')}` });
  }

  try {
    // 1. Obtener la cuenta y el DNI del usuario
    const cuentaResult = await pool.query(
      `SELECT cb.id_cuenta, p.dni FROM cuentas_bancarias cb
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1 AND cb.estado = 'Activa' AND cb.moneda = 'ARS'
       LIMIT 1`,
      [clerkId]
    );

    if (cuentaResult.rows.length === 0) {
      return res.status(404).json({ error: 'No tenés una cuenta activa en pesos' });
    }

    const { id_cuenta, dni } = cuentaResult.rows[0];

    // 2. Un cliente con cuotas impagas no puede pedir más crédito
    const mora = await obtenerMoraCliente(clerkId);
    if (mora.en_mora) {
      return res.status(403).json({ error: MENSAJE_MORA, mora });
    }

    // 3. Consultar al Banco Central antes de dar el crédito
    const datosCrediticios = await obtenerSituacionCrediticia(dni);
    
    // Si la situación es 3 (Riesgo medio), 4 (Riesgo alto) o 5 (Irrecuperable), denegamos.
    if (datosCrediticios.situacion > 2) {
        return res.status(403).json({ 
            error: 'Préstamo denegado por situación crediticia desfavorable en el Banco Central.',
            situacion: datosCrediticios.situacion
        });
    }

    // 4. Si todo está bien, se registra el préstamo con la tasa vigente fijada.
    // El plan se recalcula al aprobar con esta misma tasa; acá se guarda como referencia.
    const plan = calcularPlanFrances(monto, cantCuotas, TNA);
    const result = await pool.query(
      `INSERT INTO prestamos (id_cuenta, monto, cant_cuotas, tna, monto_cuota, monto_total, recargo_porcentaje)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id_cuenta, monto, cantCuotas, TNA, plan.monto_cuota, plan.monto_total, plan.recargo_porcentaje]
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

    res.json({ prestamos: result.rows, mora: await obtenerMoraCliente(clerkId) });
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

// Lo que el personal necesita para decidir: la cuota y el total estimados, el saldo de la cuenta,
// si el cliente está en mora y quién lo pre-aprobó.
const agregarContextoDecision = async (prestamos) => Promise.all(prestamos.map(async (pr) => {
  const plan = calcularPlanFrances(pr.monto, Math.max(1, Number(pr.cant_cuotas) || 1), pr.tna);
  const mora = await obtenerMoraTitularesCuenta(pool, pr.id_cuenta).catch(() => null);
  return { ...pr, cuota_estimada: plan.monto_cuota, total_estimado: plan.monto_total, mora };
}));

const SELECT_SOLICITUDES = `SELECT pr.*, p.nombre, p.apellido, p.dni, cb.cbu, cb.saldo AS saldo_cuenta,
         CASE WHEN pe.id IS NULL THEN NULL ELSE pe.nombre || ' ' || pe.apellido END AS pre_aprobado_por
       FROM prestamos pr
       JOIN cuentas_bancarias cb ON pr.id_cuenta = cb.id_cuenta
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       LEFT JOIN personas pe ON pe.clerk_id = pr.clerk_id_empleado`;

// EMPLEADO: ver solicitudes pendientes
const getPendientes = async (req, res) => {
  try {
    const result = await pool.query(
      `${SELECT_SOLICITUDES}
       WHERE pr.estado = 'pendiente'
       ORDER BY pr.fecha_solicitud ASC`
    );
    res.json({ prestamos: await agregarContextoDecision(await agregarSituacionCrediticia(result.rows)) });
  } catch (error) {
    console.error('Error obteniendo pendientes:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// EMPLEADO: pre-aprobar un préstamo
const preAprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });

  try {
    if (await esSolicitudPropia(pool, 'prestamos', id, clerkId)) {
      return res.status(403).json({ error: MENSAJE_PROPIA });
    }
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

// EMPLEADO / GERENTE: rechazar un préstamo, con un motivo que ve el cliente.
// Queda registrado quién lo rechazó según su rol.
const rechazar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });

  const motivo = armarMotivo(req.body);
  if (!motivo) return res.status(400).json({ error: 'Elegí un motivo de rechazo (si es "otro", contá cuál).' });

  try {
    if (await esSolicitudPropia(pool, 'prestamos', id, clerkId)) {
      return res.status(403).json({ error: MENSAJE_PROPIA });
    }
    await asegurarColumnasRechazo();
    const esGerente = req.userRole === 'gerente' || req.userRole === 'admin';
    const result = await pool.query(
      `UPDATE prestamos
       SET estado = 'rechazado', fecha_resolucion = NOW(), motivo_rechazo = $3,
           clerk_id_empleado = CASE WHEN $4::boolean THEN clerk_id_empleado ELSE $1 END,
           clerk_id_gerente = CASE WHEN $4::boolean THEN $1 ELSE clerk_id_gerente END
       WHERE id = $2 AND estado IN ('pendiente','pre_aprobado') RETURNING *`,
      [clerkId, id, motivo, esGerente]
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
      `${SELECT_SOLICITUDES}
       WHERE pr.estado = 'pre_aprobado'
       ORDER BY pr.fecha_solicitud ASC`
    );
    res.json({ prestamos: await agregarContextoDecision(await agregarSituacionCrediticia(result.rows)) });
  } catch (error) {
    console.error('Error obteniendo pre-aprobados:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// GERENTE: aprobar definitivamente, acreditar saldo y generar las cuotas
const aprobar = async (req, res) => {
  const { id } = req.params;
  const clerkId = req.auth.userId;
  if (!idValido(id)) return res.status(400).json({ error: 'Solicitud no válida' });
  if (await esSolicitudPropia(pool, 'prestamos', id, clerkId).catch(() => false)) {
    return res.status(403).json({ error: MENSAJE_PROPIA });
  }

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

    // Dos personas distintas: quien pre-aprobó no puede dar también la aprobación final.
    if (prestamo.clerk_id_empleado === clerkId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'La aprobación final la tiene que dar otra persona que quien lo pre-aprobó.' });
    }

    // Si el cliente cayó en mora después de pedirlo, no se le puede otorgar
    const mora = await obtenerMoraTitularesCuenta(client, prestamo.id_cuenta);
    if (mora.en_mora) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El cliente tiene cuotas impagas; no se puede aprobar el préstamo.', mora });
    }

    const cantCuotas = Math.max(1, Number(prestamo.cant_cuotas) || 1);
    const plan = calcularPlanFrances(prestamo.monto, cantCuotas, prestamo.tna);

    // Se acredita el capital; los intereses se cobran dentro de cada cuota
    await client.query(
      `UPDATE cuentas_bancarias SET saldo = saldo + $1 WHERE id_cuenta = $2`,
      [prestamo.monto, prestamo.id_cuenta]
    );
    await client.query(
      `INSERT INTO movimientos_prestamo (id_cuenta, id_prestamo, tipo, importe)
       VALUES ($1, $2, 'acreditacion', $3)`,
      [prestamo.id_cuenta, prestamo.id, prestamo.monto]
    );

    // Vencimientos consecutivos a partir de ahora: cuota 1 vence en 1 intervalo, cuota 2 en 2 intervalos, etc.
    for (const cuota of plan.cuotas) {
      await client.query(
        `INSERT INTO cuotas_prestamo
           (id_prestamo, numero_cuota, monto, capital, interes, iva, fecha_vencimiento, estado)
         VALUES ($1, $2::int, $3, $4, $5, $6, NOW() + $2::int * $7::interval, 'pendiente')`,
        [prestamo.id, cuota.numero_cuota, cuota.monto, cuota.capital, cuota.interes, cuota.iva, CUOTAS_INTERVALO]
      );
    }

    const result = await client.query(
      `UPDATE prestamos
       SET estado = 'aprobado', clerk_id_gerente = $1, fecha_resolucion = NOW(),
           cant_cuotas = $2, monto_cuota = $3, monto_total = $4, recargo_porcentaje = $5
       WHERE id = $6 RETURNING *`,
      [clerkId, cantCuotas, plan.monto_cuota, plan.monto_total, plan.recargo_porcentaje, id]
    );

    await client.query('COMMIT');
    res.json({ prestamo: result.rows[0], cuotas: plan.cuotas });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error aprobando préstamo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

module.exports = { simularPrestamo, solicitarPrestamo, getMisPrestamos, getMiSituacionCrediticia, getPendientes, preAprobar, rechazar, getPreAprobados, aprobar };
