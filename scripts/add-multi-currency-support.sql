-- =====================================================
-- MIGRACION: Soporte Multi-Moneda (USD/PYG)
-- Fecha: 2026-04-26
-- =====================================================

-- 1. Tabla para tasas de cambio
CREATE TABLE IF NOT EXISTS tasas_cambio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moneda_origen TEXT NOT NULL DEFAULT 'USD',
  moneda_destino TEXT NOT NULL DEFAULT 'PYG',
  tasa NUMERIC NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  es_automatica BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, moneda_origen, moneda_destino, fecha)
);

-- 2. Agregar campos de moneda a inventario
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'PYG',
ADD COLUMN IF NOT EXISTS precio_costo_usd NUMERIC,
ADD COLUMN IF NOT EXISTS precio_venta_usd NUMERIC,
ADD COLUMN IF NOT EXISTS tasa_cambio_usada NUMERIC;

-- 3. Agregar campos de moneda a crm_ventas
ALTER TABLE crm_ventas
ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'PYG',
ADD COLUMN IF NOT EXISTS monto_original NUMERIC,
ADD COLUMN IF NOT EXISTS tasa_cambio_usada NUMERIC;

-- 4. RLS para tasas_cambio
ALTER TABLE tasas_cambio ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "Users can view own tasas_cambio"
  ON tasas_cambio FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasas_cambio"
  ON tasas_cambio FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasas_cambio"
  ON tasas_cambio FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasas_cambio"
  ON tasas_cambio FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Indice para busquedas rapidas de tasa
CREATE INDEX IF NOT EXISTS idx_tasas_cambio_user_fecha 
ON tasas_cambio(user_id, fecha DESC);

-- 6. Funcion para obtener tasa actual del usuario
CREATE OR REPLACE FUNCTION get_tasa_cambio_actual(p_user_id UUID, p_moneda_origen TEXT DEFAULT 'USD', p_moneda_destino TEXT DEFAULT 'PYG')
RETURNS NUMERIC AS $$
DECLARE
  v_tasa NUMERIC;
BEGIN
  SELECT tasa INTO v_tasa
  FROM tasas_cambio
  WHERE user_id = p_user_id
    AND moneda_origen = p_moneda_origen
    AND moneda_destino = p_moneda_destino
  ORDER BY fecha DESC
  LIMIT 1;
  
  -- Si no hay tasa configurada, retornar un valor por defecto
  IF v_tasa IS NULL THEN
    v_tasa := 7500; -- Tasa aproximada USD/PYG
  END IF;
  
  RETURN v_tasa;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
