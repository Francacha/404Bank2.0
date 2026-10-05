-- Migración: historial de compra/venta de dólares, alias únicos y frascos de ahorro
-- Ejecutar después de migration_movimientos_prestamo.sql. Se puede correr más de una vez.

BEGIN;

-- 1. Compra/venta de dólares: cotización usada en la operación.
-- Cada fila guarda un solo importe (COMPRA: los dólares que entraron; VENTA: los pesos que entraron);
-- con la cotización se calcula el otro lado (los pesos o dólares que salieron) para el historial.
-- Las operaciones anteriores quedan con NULL y en el historial muestran solo el importe guardado.
ALTER TABLE Transferencias_Central
    ADD COLUMN IF NOT EXISTS cotizacion NUMERIC(12, 4);

-- 2. Alias: no puede haber dos cuentas con el mismo alias (sin distinguir mayúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cuentas_bancarias_alias
    ON Cuentas_Bancarias (LOWER(alias))
    WHERE alias IS NOT NULL;

-- 3. Frascos: dinero apartado de la cuenta en pesos por un plazo fijo, con interés compuesto diario.
-- El dinero queda bloqueado hasta fecha_fin; al vencer se acredita monto_final en la cuenta.
CREATE TABLE IF NOT EXISTS Frascos (
    id SERIAL PRIMARY KEY,
    id_cuenta INTEGER NOT NULL REFERENCES Cuentas_Bancarias(id_cuenta),
    nombre VARCHAR(40) NOT NULL,
    monto NUMERIC(15, 2) NOT NULL CHECK (monto > 0),
    tna NUMERIC(6, 2) NOT NULL,
    plazo_dias INTEGER NOT NULL CHECK (plazo_dias > 0),
    monto_final NUMERIC(15, 2) NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cobrado')),
    fecha_cobro TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_frascos_cuenta ON Frascos (id_cuenta);
CREATE INDEX IF NOT EXISTS idx_frascos_vencimiento ON Frascos (fecha_fin) WHERE estado = 'activo';

COMMIT;
