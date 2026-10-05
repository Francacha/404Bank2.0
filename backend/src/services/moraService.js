const { pool } = require('../config/db');

// Un cliente está en mora cuando tiene cuotas vencidas sin cubrir: el cobro dejó la cuenta
// en negativo y todavía no ingresó dinero suficiente para cancelarlo.
// deuda: lo que falta cubrir (saldo negativo). punitorios: intereses por mora cobrados hasta ahora.
const MORA_SQL = `
  SELECT COALESCE(SUM(-cb.saldo), 0) AS deuda,
         COALESCE(SUM((SELECT SUM(cp.punitorios) FROM cuotas_prestamo cp
                        JOIN prestamos pr ON cp.id_prestamo = pr.id
                        WHERE pr.id_cuenta = cb.id_cuenta AND cp.estado = 'vencida')), 0) AS punitorios
  FROM cuentas_bancarias cb
  WHERE cb.saldo < 0
    AND EXISTS (SELECT 1 FROM cuotas_prestamo cp
                JOIN prestamos pr ON cp.id_prestamo = pr.id
                WHERE pr.id_cuenta = cb.id_cuenta AND cp.estado = 'vencida')`;

const formatearMora = (row) => {
  const deuda = Number(row.deuda);
  return { en_mora: deuda > 0, deuda, punitorios: Number(row.punitorios) };
};

const obtenerMoraCliente = async (clerkId) => {
  const result = await pool.query(
    `${MORA_SQL}
       AND cb.id_cuenta IN (SELECT tc.id_cuenta FROM titulares_cuenta tc
                            JOIN personas p ON tc.id_persona = p.id
                            WHERE p.clerk_id = $1)`,
    [clerkId]
  );
  return formatearMora(result.rows[0]);
};

// Para validar al aprobar: mora de todos los titulares de una cuenta
const obtenerMoraTitularesCuenta = async (db, idCuenta) => {
  const result = await db.query(
    `${MORA_SQL}
       AND cb.id_cuenta IN (SELECT tc2.id_cuenta FROM titulares_cuenta tc1
                            JOIN titulares_cuenta tc2 ON tc1.id_persona = tc2.id_persona
                            WHERE tc1.id_cuenta = $1)`,
    [idCuenta]
  );
  return formatearMora(result.rows[0]);
};

const MENSAJE_MORA = 'Tenés cuotas de préstamos impagas. Regularizá tu deuda ingresando dinero a tu cuenta para volver a operar.';

module.exports = { obtenerMoraCliente, obtenerMoraTitularesCuenta, MENSAJE_MORA };
