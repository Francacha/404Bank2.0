const { pool } = require('../config/db');
const { obtenerMovimientos } = require('../services/movimientosService');

const QUERY_CLIENTES = `
  SELECT
    p.id, p.nombre, p.apellido, p.dni, p.email, p.telefono,
    p.ciudad, p.provincia,
    cb.id_cuenta, cb.cbu, cb.alias, cb.saldo, cb.estado, cb.fecha_apertura
  FROM Personas p
  LEFT JOIN Titulares_Cuenta tit ON p.id = tit.id_persona
  LEFT JOIN Cuentas_Bancarias cb ON tit.id_cuenta = cb.id_cuenta
`;

// Buscar clientes por nombre, apellido, DNI o CBU. Sin resultados → devuelve todos.
const buscarUsuarios = async (req, res) => {
  const { q } = req.query;

  try {
    if (q && q.trim()) {
      const term = q.trim();
      const result = await pool.query(
        QUERY_CLIENTES + `
        WHERE p.nombre ILIKE $1 OR p.apellido ILIKE $1 OR p.dni = $2 OR cb.cbu = $2
        ORDER BY p.apellido ASC
        `, [`%${term}%`, term]
      );

      if (result.rows.length > 0) {
        return res.json({ usuarios: result.rows, mostrandoTodos: false });
      }
    }

    // Sin búsqueda o sin resultados: devolver todos
    const todos = await pool.query(QUERY_CLIENTES + ' ORDER BY p.apellido ASC');
    res.json({ usuarios: todos.rows, mostrandoTodos: true });
  } catch (error) {
    console.error('Error buscando usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Ver movimientos de una cuenta por CBU: transferencias, compra/venta de dólares y préstamos
const getMovimientosPorCbu = async (req, res) => {
  const { cbu } = req.params;

  try {
    const movimientos = await obtenerMovimientos([cbu]);
    res.json({ movimientos });
  } catch (error) {
    console.error('Error obteniendo movimientos:', error);
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

module.exports = { buscarUsuarios, getMovimientosPorCbu, bloquearCuenta, activarCuenta };
