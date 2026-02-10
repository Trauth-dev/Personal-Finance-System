-- Add origin tracking columns to egresos table
-- This allows tracking where money comes from for each expense:
-- 'caja_ahorro' = from a savings box (bank account, cash, etc.)
-- 'tarjeta_credito' = from a credit card (deuda with tipo_deuda = 'tarjeta_credito')

ALTER TABLE egresos 
ADD COLUMN IF NOT EXISTS origen_tipo text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS origen_id uuid DEFAULT NULL;

-- Add a check constraint for valid origen_tipo values
ALTER TABLE egresos 
ADD CONSTRAINT egresos_origen_tipo_check 
CHECK (origen_tipo IS NULL OR origen_tipo IN ('caja_ahorro', 'tarjeta_credito'));

-- Add index for faster lookups by origin
CREATE INDEX IF NOT EXISTS idx_egresos_origen ON egresos(origen_tipo, origen_id) WHERE origen_tipo IS NOT NULL;
