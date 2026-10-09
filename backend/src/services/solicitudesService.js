const { pool } = require('../config/db');

// Reglas compartidas por las solicitudes de préstamos y tarjetas que resuelve el personal.

// Motivos de rechazo que ve el cliente. El texto adicional es opcional.
const MOTIVOS_RECHAZO = {
  situacion_crediticia: 'Tu situación crediticia en el Banco Central no permite otorgarlo ahora.',
  ingresos_insuficientes: 'Con tus ingresos actuales no podemos otorgarlo.',
  deuda_vigente: 'Tenés deudas o cuotas impagas que primero hay que regularizar.',
  datos_inconsistentes: 'Encontramos datos de tu perfil que no coinciden.',
  otro: 'Por una decisión del banco.',
};

// La columna se agrega sola la primera vez (mismo criterio que la columna moneda en cuentas).
let columnasListas = null;
const asegurarColumnasRechazo = () => {
  if (!columnasListas) {
    columnasListas = pool.query(`
      ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
      ALTER TABLE tarjetas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
    `).catch((error) => {
      columnasListas = null;
      throw error;
    });
  }
  return columnasListas;
};

// Devuelve el texto que se guarda y ve el cliente, o null si el motivo no es válido.
const armarMotivo = (body) => {
  const clave = body?.motivo;
  if (!MOTIVOS_RECHAZO[clave]) return null;
  const detalle = typeof body?.detalle === 'string' ? body.detalle.trim().slice(0, 240) : '';
  if (clave === 'otro' && !detalle) return null;
  return detalle ? `${MOTIVOS_RECHAZO[clave]} ${detalle}` : MOTIVOS_RECHAZO[clave];
};

// ¿La solicitud es de una cuenta de la que es titular quien intenta resolverla?
// Nadie del personal puede aprobar ni rechazar sus propios pedidos.
const esSolicitudPropia = async (db, tabla, id, clerkId) => {
  if (!['prestamos', 'tarjetas'].includes(tabla)) throw new Error('Tabla no válida');
  const result = await db.query(
    `SELECT 1 FROM ${tabla} s
     JOIN titulares_cuenta tc ON s.id_cuenta = tc.id_cuenta
     JOIN personas p ON tc.id_persona = p.id
     WHERE s.id = $1 AND p.clerk_id = $2
     LIMIT 1`,
    [id, clerkId]
  );
  return result.rows.length > 0;
};

const MENSAJE_PROPIA = 'No podés resolver una solicitud propia: tiene que hacerlo otra persona del banco.';

// Valida que el :id sea un número entero positivo.
const idValido = (id) => /^\d+$/.test(String(id));

module.exports = { MOTIVOS_RECHAZO, asegurarColumnasRechazo, armarMotivo, esSolicitudPropia, MENSAJE_PROPIA, idValido };
