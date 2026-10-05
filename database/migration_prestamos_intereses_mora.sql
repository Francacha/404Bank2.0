-- Migración: intereses (sistema francés + IVA) y mora con saldo negativo
-- Ejecutar después de migration_prestamos_cuotas.sql

-- Tasa fijada al solicitar el préstamo y total a devolver (capital + intereses + IVA)
ALTER TABLE Prestamos
    ADD COLUMN IF NOT EXISTS tna NUMERIC(6, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monto_total NUMERIC(14, 2);

-- Composición de cada cuota. punitorios: intereses por mora devengados mientras la cuota estuvo impaga.
ALTER TABLE Cuotas_Prestamo
    ADD COLUMN IF NOT EXISTS capital NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS interes NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iva NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS punitorios NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Último momento en que se cobraron punitorios sobre el saldo negativo de la cuenta (NULL = sin mora)
ALTER TABLE Cuentas_Bancarias
    ADD COLUMN IF NOT EXISTS ultimo_devengo_mora TIMESTAMPTZ;

-- Los préstamos ya aprobados se otorgaron sin interés: su capital es el monto de cada cuota
UPDATE Cuotas_Prestamo SET capital = monto WHERE capital IS NULL;
UPDATE Prestamos SET monto_total = monto
WHERE monto_total IS NULL AND estado IN ('aprobado', 'finalizado');

-- Las solicitudes que todavía no se aprobaron toman la tasa vigente
UPDATE Prestamos SET tna = 56 WHERE estado IN ('pendiente', 'pre_aprobado') AND tna = 0;
