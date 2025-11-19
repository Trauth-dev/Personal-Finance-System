-- Script para agregar porcentajes de presupuesto por tipo de categoría
-- Esto permitirá distribuir el presupuesto mensual entre las diferentes categorías

-- Cambiando a DECIMAL(5,4) para almacenar como decimales (0.10, 0.20) en lugar de porcentajes (10, 20)
ALTER TABLE presupuesto_mensual
ADD COLUMN IF NOT EXISTS pct_donacion DECIMAL(5, 4) DEFAULT 0 CHECK (pct_donacion >= 0 AND pct_donacion <= 1),
ADD COLUMN IF NOT EXISTS pct_ahorro_2025 DECIMAL(5, 4) DEFAULT 0.10 CHECK (pct_ahorro_2025 >= 0 AND pct_ahorro_2025 <= 1),
ADD COLUMN IF NOT EXISTS pct_gastos_varios DECIMAL(5, 4) DEFAULT 0.20 CHECK (pct_gastos_varios >= 0 AND pct_gastos_varios <= 1),
ADD COLUMN IF NOT EXISTS pct_gastos_vivienda DECIMAL(5, 4) DEFAULT 0.30 CHECK (pct_gastos_vivienda >= 0 AND pct_gastos_vivienda <= 1),
ADD COLUMN IF NOT EXISTS pct_pago_deudas DECIMAL(5, 4) DEFAULT 0.20 CHECK (pct_pago_deudas >= 0 AND pct_pago_deudas <= 1),
ADD COLUMN IF NOT EXISTS pct_disfrute DECIMAL(5, 4) DEFAULT 0.20 CHECK (pct_disfrute >= 0 AND pct_disfrute <= 1),
ADD COLUMN IF NOT EXISTS pct_educacion DECIMAL(5, 4) DEFAULT 0 CHECK (pct_educacion >= 0 AND pct_educacion <= 1),
ADD COLUMN IF NOT EXISTS pct_suenos DECIMAL(5, 4) DEFAULT 0 CHECK (pct_suenos >= 0 AND pct_suenos <= 1),
ADD COLUMN IF NOT EXISTS pct_libertad_financiera DECIMAL(5, 4) DEFAULT 0 CHECK (pct_libertad_financiera >= 0 AND pct_libertad_financiera <= 1);

-- Actualizando valores predeterminados como decimales
UPDATE presupuesto_mensual
SET 
  pct_donacion = 0,
  pct_ahorro_2025 = 0.10,
  pct_gastos_varios = 0.20,
  pct_gastos_vivienda = 0.30,
  pct_pago_deudas = 0.20,
  pct_disfrute = 0.20,
  pct_educacion = 0,
  pct_suenos = 0,
  pct_libertad_financiera = 0
WHERE 
  pct_donacion IS NULL 
  OR pct_ahorro_2025 IS NULL 
  OR pct_gastos_varios IS NULL;

COMMENT ON COLUMN presupuesto_mensual.pct_donacion IS 'Porcentaje del presupuesto asignado a Donación (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_ahorro_2025 IS 'Porcentaje del presupuesto asignado a Ahorro 2025 (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_gastos_varios IS 'Porcentaje del presupuesto asignado a Gastos Varios (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_gastos_vivienda IS 'Porcentaje del presupuesto asignado a Gastos Vivienda (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_pago_deudas IS 'Porcentaje del presupuesto asignado a Pago Deudas (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_disfrute IS 'Porcentaje del presupuesto asignado a Disfrute (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_educacion IS 'Porcentaje del presupuesto asignado a Educación (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_suenos IS 'Porcentaje del presupuesto asignado a Sueños (decimal 0-1)';
COMMENT ON COLUMN presupuesto_mensual.pct_libertad_financiera IS 'Porcentaje del presupuesto asignado a Libertad Financiera (decimal 0-1)';
