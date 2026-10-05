const { pool } = require('../config/db');

// Historial de una o más cuentas: transferencias, compra/venta de dólares, préstamos y frascos,
// todos con el mismo formato que una fila de transferencias_central para que el frontend los muestre igual.
// tipo: 'entrante' (suma al saldo) o 'saliente' (resta). categoria y concepto solo vienen en lo que no es transferencia.

const LIMITE = 50;
const redondear = (valor) => Math.round(valor * 100) / 100;
const pesos = (valor) => Number(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Una transferencia entre dos cuentas de 404Bank guarda dos filas (saliente y entrante);
// a cada cuenta solo le corresponde su lado. fecha_hora se guarda en UTC sin zona horaria.
const obtenerTransferencias = async (cbus) => {
    const result = await pool.query(`
        SELECT *, fecha_hora AT TIME ZONE 'UTC' AS fecha_hora
        FROM transferencias_central
        WHERE (cbu_origen = ANY($1) AND tipo = 'saliente')
           OR (cbu_destino = ANY($1) AND tipo = 'entrante')
        ORDER BY transferencias_central.fecha_hora DESC
        LIMIT ${LIMITE}
    `, [cbus]);
    return result.rows;
};

// Cada compra/venta mueve dos cuentas: sale de cbu_origen y entra en cbu_destino.
//   COMPRA_USD: importe = dólares que entraron; salieron importe * cotizacion pesos.
//   VENTA_USD:  importe = pesos que entraron;  salieron importe / cotizacion dólares.
// Las operaciones viejas no tienen cotización: solo se muestra el lado guardado.
const obtenerMovimientosDivisas = async (cbus) => {
    const result = await pool.query(`
        SELECT *, fecha_hora AT TIME ZONE 'UTC' AS fecha_hora
        FROM transferencias_central
        WHERE tipo IN ('COMPRA_USD', 'VENTA_USD')
          AND (cbu_origen = ANY($1) OR cbu_destino = ANY($1))
        ORDER BY transferencias_central.fecha_hora DESC
        LIMIT ${LIMITE}
    `, [cbus]);

    return result.rows.flatMap((op) => {
        const esCompra = op.tipo === 'COMPRA_USD';
        const importe = Number(op.importe);
        const cotizacion = op.cotizacion === null ? null : Number(op.cotizacion);
        const importeSalida = cotizacion === null ? null
            : redondear(esCompra ? importe * cotizacion : importe / cotizacion);
        const dolares = esCompra ? importe : importeSalida;

        const concepto = cotizacion === null
            ? (esCompra ? 'Compra de dólares' : 'Venta de dólares')
            : `${esCompra ? 'Compra' : 'Venta'} de US$ ${pesos(dolares)} a $ ${pesos(cotizacion)}`;
        const base = { ...op, estado: 'aprobada', categoria: 'divisas', concepto };

        const movimientos = [];
        if (importeSalida !== null && cbus.includes(op.cbu_origen)) {
            movimientos.push({
                ...base,
                id: `DIVISAS-${op.id}-salida`,
                transaccion_central_id: `${op.transaccion_central_id}-salida`,
                tipo: 'saliente',
                importe: importeSalida,
                moneda: esCompra ? 'ARS' : 'USD'
            });
        }
        if (cbus.includes(op.cbu_destino)) {
            movimientos.push({
                ...base,
                id: `DIVISAS-${op.id}-entrada`,
                transaccion_central_id: `${op.transaccion_central_id}-entrada`,
                tipo: 'entrante',
                importe,
                moneda: esCompra ? 'USD' : 'ARS'
            });
        }
        return movimientos;
    });
};

const obtenerMovimientosPrestamo = async (cbus) => {
    const result = await pool.query(`
        SELECT m.id, m.tipo, m.importe, m.fecha_hora, m.id_prestamo,
               cb.cbu, cp.numero_cuota, pr.cant_cuotas
        FROM movimientos_prestamo m
        JOIN cuentas_bancarias cb ON m.id_cuenta = cb.id_cuenta
        JOIN prestamos pr ON m.id_prestamo = pr.id
        LEFT JOIN cuotas_prestamo cp ON m.id_cuota = cp.id
        WHERE cb.cbu = ANY($1)
        ORDER BY m.fecha_hora DESC
        LIMIT ${LIMITE}
    `, [cbus]);

    return result.rows.map((m) => {
        const conceptos = {
            acreditacion: `Acreditación del préstamo #${m.id_prestamo}`,
            cuota: `Cuota ${m.numero_cuota}/${m.cant_cuotas} del préstamo #${m.id_prestamo}`,
            punitorio: `Intereses punitorios del préstamo #${m.id_prestamo}`
        };
        const entrante = m.tipo === 'acreditacion';
        return {
            id: `PRESTAMO-${m.id}`,
            transaccion_central_id: `PRESTAMO-${m.id}`,
            cbu_origen: entrante ? null : m.cbu,
            cbu_destino: entrante ? m.cbu : null,
            importe: m.importe,
            estado: 'aprobada',
            tipo: entrante ? 'entrante' : 'saliente',
            fecha_hora: m.fecha_hora,
            moneda: 'ARS',
            categoria: 'prestamo',
            concepto: conceptos[m.tipo]
        };
    });
};

// Un frasco genera dos movimientos: el dinero que se aparta al crearlo y el que vuelve con intereses al vencer
const obtenerMovimientosFrascos = async (cbus) => {
    const result = await pool.query(`
        SELECT f.*, cb.cbu
        FROM frascos f
        JOIN cuentas_bancarias cb ON f.id_cuenta = cb.id_cuenta
        WHERE cb.cbu = ANY($1)
        ORDER BY GREATEST(f.fecha_inicio, f.fecha_cobro) DESC
        LIMIT ${LIMITE}
    `, [cbus]);

    return result.rows.flatMap((f) => {
        const base = { estado: 'aprobada', moneda: 'ARS', categoria: 'frasco' };
        const movimientos = [{
            ...base,
            id: `FRASCO-${f.id}-alta`,
            transaccion_central_id: `FRASCO-${f.id}-alta`,
            cbu_origen: f.cbu,
            cbu_destino: null,
            importe: f.monto,
            tipo: 'saliente',
            fecha_hora: f.fecha_inicio,
            concepto: `Frasco "${f.nombre}" a ${f.plazo_dias} días`
        }];
        if (f.estado === 'cobrado') {
            movimientos.push({
                ...base,
                id: `FRASCO-${f.id}-cobro`,
                transaccion_central_id: `FRASCO-${f.id}-cobro`,
                cbu_origen: null,
                cbu_destino: f.cbu,
                importe: f.monto_final,
                tipo: 'entrante',
                fecha_hora: f.fecha_cobro,
                concepto: `Frasco "${f.nombre}" vencido (+$ ${pesos(Number(f.monto_final) - Number(f.monto))} de intereses)`
            });
        }
        return movimientos;
    });
};

const obtenerMovimientos = async (cbus) => {
    const grupos = await Promise.all([
        obtenerTransferencias(cbus),
        obtenerMovimientosDivisas(cbus),
        obtenerMovimientosPrestamo(cbus),
        obtenerMovimientosFrascos(cbus)
    ]);
    return grupos.flat()
        .sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora))
        .slice(0, LIMITE);
};

module.exports = { obtenerMovimientos };
