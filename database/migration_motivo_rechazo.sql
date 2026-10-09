-- Motivo de rechazo de préstamos y tarjetas, visible para el cliente.
-- El backend también lo crea solo la primera vez que se rechaza algo (solicitudesService.asegurarColumnasRechazo).
ALTER TABLE prestamos ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
ALTER TABLE tarjetas ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
