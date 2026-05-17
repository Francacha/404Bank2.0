-- Migración: integración con Banco Central
-- Ejecutar este script en la base de datos existente (404bank)

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
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('saliente', 'entrante')),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
