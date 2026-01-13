-- =====================================================
-- SISTEMA DE DEUDAS - Préstamos y Tarjetas de Crédito
-- =====================================================

-- 1. Agregar columna tipo_deuda (prestamo o tarjeta_credito)
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS tipo_deuda text DEFAULT 'prestamo';

-- 2. Agregar columna deuda_id a egresos para vincular pagos
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS deuda_id uuid REFERENCES deudas(id) ON DELETE SET NULL;

-- 3. Agregar columna numero_cuota para registrar cuota pagada
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS numero_cuota integer;

-- 4. Agregar limite_credito para tarjetas
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS limite_credito numeric DEFAULT 0;

-- 5. Agregar fecha_corte para tarjetas (día del mes 1-31)
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS fecha_corte integer;

-- 6. Agregar fecha_pago para tarjetas (día del mes 1-31)
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS fecha_pago integer;

-- 7. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_deudas_tipo ON deudas(tipo_deuda);
CREATE INDEX IF NOT EXISTS idx_egresos_deuda_id ON egresos(deuda_id);
