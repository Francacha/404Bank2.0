-- Migración: movimientos de dinero generados por los préstamos (para el historial del cliente)
-- Ejecutar después de migration_prestamos_intereses_mora.sql
--
-- Se registra cada vez que el préstamo mueve saldo de la cuenta:
--   acreditacion: el banco acredita el capital al aprobarlo (ingreso)
--   cuota:        se debita una cuota al vencer, alcance o no el saldo (egreso)
--   punitorio:    se debitan intereses por mora (egreso)
CREATE TABLE IF NOT EXISTS Movimientos_Prestamo (
    id SERIAL PRIMARY KEY,
    id_cuenta INTEGER NOT NULL REFERENCES Cuentas_Bancarias(id_cuenta),
    id_prestamo INTEGER NOT NULL REFERENCES Prestamos(id) ON DELETE CASCADE,
    id_cuota INTEGER REFERENCES Cuotas_Prestamo(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('acreditacion', 'cuota', 'punitorio')),
    importe NUMERIC(14, 2) NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_prestamo_cuenta
    ON Movimientos_Prestamo (id_cuenta, fecha_hora DESC);

-- Historial de los préstamos que ya existían. Las fechas sin zona horaria se guardaron en UTC.
INSERT INTO Movimientos_Prestamo (id_cuenta, id_prestamo, tipo, importe, fecha_hora)
SELECT pr.id_cuenta, pr.id, 'acreditacion', pr.monto, pr.fecha_resolucion AT TIME ZONE 'UTC'
FROM Prestamos pr
WHERE pr.estado IN ('aprobado', 'finalizado') AND pr.fecha_resolucion IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM Movimientos_Prestamo m WHERE m.id_prestamo = pr.id AND m.tipo = 'acreditacion');

-- Cuotas ya debitadas: las pagadas a término en su fecha de pago, las que están en mora al vencer
INSERT INTO Movimientos_Prestamo (id_cuenta, id_prestamo, id_cuota, tipo, importe, fecha_hora)
SELECT pr.id_cuenta, pr.id, cp.id, 'cuota', cp.monto,
       CASE WHEN cp.estado = 'pagada' THEN cp.fecha_pago AT TIME ZONE 'UTC' ELSE cp.fecha_vencimiento END
FROM Cuotas_Prestamo cp
JOIN Prestamos pr ON cp.id_prestamo = pr.id
WHERE ((cp.estado = 'pagada' AND cp.fecha_pago IS NOT NULL) OR cp.estado = 'vencida')
  AND NOT EXISTS (SELECT 1 FROM Movimientos_Prestamo m WHERE m.id_cuota = cp.id AND m.tipo = 'cuota');
