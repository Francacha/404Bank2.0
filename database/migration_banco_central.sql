-- Migración: integración con Banco Central
-- Ejecutar este script en la base de datos existente (404bank)

-- Moneda de la cuenta (ARS, USD, etc.)
ALTER TABLE Cuentas_Bancarias
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) DEFAULT 'ARS';

-- Columnas de dirección faltantes en Personas
ALTER TABLE Personas
    ADD COLUMN IF NOT EXISTS ciudad VARCHAR(255),
    ADD COLUMN IF NOT EXISTS provincia VARCHAR(255),
    ADD COLUMN IF NOT EXISTS pais VARCHAR(255),
    ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);

-- Tabla para registrar transferencias interbancarias (Banco Central)
CREATE TABLE IF NOT EXISTS Transferencias_Central (
    id SERIAL PRIMARY KEY,
    transaccion_central_id VARCHAR(255) UNIQUE NOT NULL,
    cbu_origen VARCHAR(22) NOT NULL,
    cbu_destino VARCHAR(22) NOT NULL,
    importe DECIMAL(15, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('saliente', 'entrante', 'COMPRA_USD', 'VENTA_USD')),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    moneda VARCHAR(3) NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('ARS', 'USD'))
);

-- Compatibilidad para bases que ya tenían la tabla creada antes de divisas.
-- Las transferencias históricas son en ARS, por eso el valor por defecto es ARS.
ALTER TABLE Transferencias_Central
    ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'ARS';

ALTER TABLE Transferencias_Central
    DROP CONSTRAINT IF EXISTS transferencias_central_tipo_check;

ALTER TABLE Transferencias_Central
    ADD CONSTRAINT transferencias_central_tipo_check
    CHECK (tipo IN ('saliente', 'entrante', 'COMPRA_USD', 'VENTA_USD'));

ALTER TABLE Transferencias_Central
    DROP CONSTRAINT IF EXISTS transferencias_central_moneda_check;

ALTER TABLE Transferencias_Central
    ADD CONSTRAINT transferencias_central_moneda_check
    CHECK (moneda IN ('ARS', 'USD'));
