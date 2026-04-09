-- Agregar campos para el sistema de cobranzas mejorado
-- interes_porcentaje: porcentaje de interes aplicado
-- monto_con_interes: monto total con interes incluido
-- frecuencia_dias: cada cuantos dias se cobra la cuota

ALTER TABLE crm_ventas 
ADD COLUMN IF NOT EXISTS interes_porcentaje DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_con_interes DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS frecuencia_dias INTEGER DEFAULT 30;

-- Actualizar registros existentes: si no tienen monto_con_interes, usar monto_total
UPDATE crm_ventas 
SET monto_con_interes = monto_total 
WHERE monto_con_interes IS NULL;
