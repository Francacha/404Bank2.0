-- Migración: préstamos en cuotas con recargo
-- Ejecutar este script en la base de datos existente (404bank)

ALTER TABLE Prestamos
    ADD COLUMN IF NOT EXISTS cant_cuotas INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS monto_cuota NUMERIC(12, 2),
    -- Porcentaje de recargo que se suma a cada cuota (fijado al momento de la solicitud)
    ADD COLUMN IF NOT EXISTS recargo_porcentaje NUMERIC(5, 2) NOT NULL DEFAULT 0;

-- Cuotas generadas al aprobar un préstamo; las cobra el cron de cobros
CREATE TABLE IF NOT EXISTS Cuotas_Prestamo (
    id SERIAL PRIMARY KEY,
    id_prestamo INTEGER REFERENCES Prestamos(id) ON DELETE CASCADE,
    numero_cuota INTEGER,
    monto NUMERIC(12, 2),
    fecha_vencimiento DATE,
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP
);

-- El vencimiento pasa a ser un instante (no solo una fecha) para poder usar intervalos cortos
-- (ej. CUOTAS_INTERVALO='10 minutes') al probar los cobros. Las fechas existentes quedan a las 00:00 de Argentina.
ALTER TABLE Cuotas_Prestamo
    ALTER COLUMN fecha_vencimiento TYPE TIMESTAMPTZ
    USING (fecha_vencimiento::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires');

-- Estado 'finalizado': el préstamo tiene todas sus cuotas pagadas
ALTER TABLE Prestamos DROP CONSTRAINT IF EXISTS prestamos_estado_check;
ALTER TABLE Prestamos ADD CONSTRAINT prestamos_estado_check
    CHECK (estado IN ('pendiente', 'pre_aprobado', 'aprobado', 'rechazado', 'finalizado'));

UPDATE Prestamos pr SET estado = 'finalizado'
WHERE pr.estado = 'aprobado'
  AND EXISTS (SELECT 1 FROM Cuotas_Prestamo cp WHERE cp.id_prestamo = pr.id)
  AND NOT EXISTS (SELECT 1 FROM Cuotas_Prestamo cp WHERE cp.id_prestamo = pr.id AND cp.estado <> 'pagada');
