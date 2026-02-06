-- Agregar campo destino_caja_id a ingresos para vincular a que caja va el dinero
ALTER TABLE ingresos ADD COLUMN IF NOT EXISTS destino_caja_id uuid REFERENCES cajas_ahorro(id) ON DELETE SET NULL;

-- Agregar campos bancarios a cajas_ahorro para identificar tipo de cuenta
ALTER TABLE cajas_ahorro ADD COLUMN IF NOT EXISTS tipo_cuenta text DEFAULT 'efectivo';
ALTER TABLE cajas_ahorro ADD COLUMN IF NOT EXISTS banco text;
ALTER TABLE cajas_ahorro ADD COLUMN IF NOT EXISTS numero_cuenta text;
ALTER TABLE cajas_ahorro ADD COLUMN IF NOT EXISTS moneda text DEFAULT 'PYG';

-- Indice para buscar ingresos por caja destino
CREATE INDEX IF NOT EXISTS idx_ingresos_destino_caja ON ingresos(destino_caja_id);
