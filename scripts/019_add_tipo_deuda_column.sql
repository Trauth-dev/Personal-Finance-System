-- Agregar columna tipo_deuda a la tabla deudas para diferenciar entre préstamos y tarjetas de crédito
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS tipo_deuda text DEFAULT 'prestamo';

-- Agregar columna deuda_id a la tabla egresos para vincular pagos con deudas
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS deuda_id uuid REFERENCES deudas(id) ON DELETE SET NULL;

-- Agregar columna numero_cuota a la tabla egresos para registrar qué cuota se está pagando
ALTER TABLE egresos ADD COLUMN IF NOT EXISTS numero_cuota integer;

-- Agregar columna limite_credito para tarjetas de crédito
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS limite_credito numeric DEFAULT 0;

-- Agregar columna fecha_corte para tarjetas de crédito
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS fecha_corte integer; -- día del mes (1-31)

-- Agregar columna fecha_pago para tarjetas de crédito
ALTER TABLE deudas ADD COLUMN IF NOT EXISTS fecha_pago integer; -- día del mes (1-31)

-- Crear índice para mejorar búsquedas por tipo de deuda
CREATE INDEX IF NOT EXISTS idx_deudas_tipo ON deudas(tipo_deuda);

-- Crear índice para vincular egresos con deudas
CREATE INDEX IF NOT EXISTS idx_egresos_deuda_id ON egresos(deuda_id);
