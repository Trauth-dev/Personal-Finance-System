-- Normalizar las fechas de presupuesto_mensual al primer día del mes
-- Esto asegura que solo haya un presupuesto por mes por usuario

-- Paso 1: Para cada par (user_id, mes), mantener solo el registro más reciente
-- y actualizarlo al primer día del mes

-- Primero, eliminar duplicados manteniendo el más reciente por mes
WITH ranked AS (
  SELECT 
    id,
    user_id,
    date_trunc('month', fecha)::date as primer_dia_mes,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, date_trunc('month', fecha) 
      ORDER BY created_at DESC, fecha DESC
    ) as rn
  FROM presupuesto_mensual
)
DELETE FROM presupuesto_mensual 
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Paso 2: Actualizar todas las fechas al primer día de su mes
UPDATE presupuesto_mensual 
SET fecha = date_trunc('month', fecha)::date
WHERE fecha != date_trunc('month', fecha)::date;

-- Paso 3: Intentar agregar un UNIQUE constraint para (perfil_id, fecha) si no existe
-- Esto evita duplicados futuros por perfil y mes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'presupuesto_mensual_perfil_fecha_key'
  ) THEN
    ALTER TABLE presupuesto_mensual 
    ADD CONSTRAINT presupuesto_mensual_perfil_fecha_key UNIQUE(perfil_id, fecha);
  END IF;
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'Hay duplicados que impiden crear el constraint. Los datos fueron limpiados parcialmente.';
END $$;
