-- Nombre de la contraparte de una transferencia, para cuentas de otros bancos que no están en Personas.
-- El backend también la crea sola la primera vez (contrapartesService.asegurarColumnaContraparte).
ALTER TABLE transferencias_central ADD COLUMN IF NOT EXISTS nombre_contraparte VARCHAR(255);
