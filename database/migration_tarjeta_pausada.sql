-- Permite que el cliente pause y reactive una tarjeta activa.
-- El backend también la crea sola la primera vez (tarjetasController.asegurarColumnaPausa).
ALTER TABLE tarjetas ADD COLUMN IF NOT EXISTS pausada BOOLEAN NOT NULL DEFAULT false;
