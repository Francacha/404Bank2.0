const { pool } = require('../config/db');
const { FRASCOS_DIA, PLAZOS, MONTO_MINIMO, calcularValor, buscarPlazo } = require('../config/frascos');

// CLIENTE: cuánto ganaría con un monto en cada plazo
const simularFrasco = (req, res) => {
  const monto = Number(req.query.monto);
  res.json({
    monto_minimo: MONTO_MINIMO,
    plazos: PLAZOS.map(({ dias, tna }) => {
      const montoFinal = monto > 0 ? calcularValor(monto, tna, dias) : null;
      return {
        dias,
        tna,
        // Tasa efectiva anual con capitalización diaria
        tea: Math.round((Math.pow(1 + tna / 100 / 365, 365) - 1) * 10000) / 100,
        monto_final: montoFinal,
        ganancia: montoFinal === null ? null : Math.round((montoFinal - monto) * 100) / 100
      };
    })
  });
};

// CLIENTE: sus frascos, con lo que lleva ganado cada uno hasta ahora
const getMisFrascos = async (req, res) => {
  const clerkId = req.auth.userId;

  try {
    const result = await pool.query(
      `SELECT f.*,
              LEAST(EXTRACT(EPOCH FROM NOW() - f.fecha_inicio) / EXTRACT(EPOCH FROM $2::interval),
                    f.plazo_dias) AS dias_transcurridos
       FROM frascos f
       JOIN titulares_cuenta tc ON f.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1
       ORDER BY (f.estado = 'activo') DESC, f.fecha_fin ASC`,
      [clerkId, FRASCOS_DIA]
    );

    const frascos = result.rows.map((f) => {
      const diasTranscurridos = Number(f.dias_transcurridos);
      const valorActual = f.estado === 'cobrado'
        ? Number(f.monto_final)
        : calcularValor(f.monto, f.tna, diasTranscurridos);
      return {
        ...f,
        dias_transcurridos: Math.floor(diasTranscurridos),
        valor_actual: valorActual,
        ganancia_actual: Math.round((valorActual - Number(f.monto)) * 100) / 100
      };
    });

    const activos = frascos.filter((f) => f.estado === 'activo');
    res.json({
      frascos,
      resumen: {
        total_ahorrado: activos.reduce((acc, f) => acc + Number(f.monto), 0),
        total_actual: Math.round(activos.reduce((acc, f) => acc + f.valor_actual, 0) * 100) / 100
      }
    });
  } catch (error) {
    console.error('Error obteniendo frascos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// CLIENTE: crear un frasco. El monto sale de la cuenta en pesos y queda bloqueado hasta que vence.
const crearFrasco = async (req, res) => {
  const clerkId = req.auth.userId;
  const nombre = String(req.body.nombre ?? '').trim();
  const monto = Math.round(Number(req.body.monto) * 100) / 100;
  const plazo = buscarPlazo(req.body.plazo_dias);

  if (!nombre || nombre.length > 40) {
    return res.status(400).json({ error: 'Poné un nombre de hasta 40 caracteres para tu frasco.' });
  }
  if (!(monto >= MONTO_MINIMO)) {
    return res.status(400).json({ error: `El monto mínimo para un frasco es $${MONTO_MINIMO}.` });
  }
  if (!plazo) {
    return res.status(400).json({ error: `El plazo debe ser uno de: ${PLAZOS.map((p) => p.dias).join(', ')} días.` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Se bloquea la cuenta para validar y debitar sobre el saldo real
    const cuentaResult = await client.query(
      `SELECT cb.id_cuenta, cb.saldo FROM cuentas_bancarias cb
       JOIN titulares_cuenta tc ON cb.id_cuenta = tc.id_cuenta
       JOIN personas p ON tc.id_persona = p.id
       WHERE p.clerk_id = $1 AND cb.estado = 'Activa' AND cb.moneda = 'ARS'
       LIMIT 1
       FOR UPDATE OF cb`,
      [clerkId]
    );

    if (cuentaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No tenés una cuenta activa en pesos' });
    }

    const { id_cuenta, saldo } = cuentaResult.rows[0];
    if (Number(saldo) < monto) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'No tenés saldo suficiente en tu cuenta en pesos.' });
    }

    await client.query(
      'UPDATE cuentas_bancarias SET saldo = saldo - $1 WHERE id_cuenta = $2',
      [monto, id_cuenta]
    );

    const result = await client.query(
      `INSERT INTO frascos (id_cuenta, nombre, monto, tna, plazo_dias, monto_final, fecha_fin)
       VALUES ($1, $2, $3, $4, $5::int, $6, NOW() + $5::int * $7::interval)
       RETURNING *`,
      [id_cuenta, nombre, monto, plazo.tna, plazo.dias, calcularValor(monto, plazo.tna, plazo.dias), FRASCOS_DIA]
    );

    await client.query('COMMIT');
    res.status(201).json({ frasco: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando frasco:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    client.release();
  }
};

module.exports = { simularFrasco, getMisFrascos, crearFrasco };
