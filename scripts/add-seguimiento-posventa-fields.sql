-- =====================================================
-- MIGRACION: Seguimiento Posventa Mejorado
-- =====================================================
-- Agrega campos para diferenciar tipos de seguimiento:
-- - Seguimiento Inmediato (24-72hs posventa)
-- - Seguimiento de Mantenimiento (periodico)
-- =====================================================

-- 1. Agregar nuevos campos a la tabla crm_seguimientos
ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS tipo_seguimiento TEXT DEFAULT 'general';
-- Valores: 'general', 'posventa_inmediato', 'mantenimiento'

ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES crm_ventas(id) ON DELETE SET NULL;

ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS producto_id UUID REFERENCES inventario(id) ON DELETE SET NULL;

ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS ciclo_mantenimiento_meses INTEGER;
-- Ej: 6 = cada 6 meses

ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS horas_posventa INTEGER;
-- Valores: 24, 48, 72 (para seguimiento inmediato)

-- 2. Agregar campo de ciclo de mantenimiento a productos del inventario
ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS requiere_mantenimiento BOOLEAN DEFAULT false;

ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS ciclo_mantenimiento_meses INTEGER;
-- Ej: 6 = mantenimiento cada 6 meses, NULL = sin mantenimiento

ALTER TABLE inventario 
ADD COLUMN IF NOT EXISTS descripcion_mantenimiento TEXT;
-- Ej: "Cambio de minerales", "Revision de filtros"

-- 3. Agregar configuracion de seguimiento posventa por defecto al usuario
-- (en tabla de perfiles empresariales o crear nueva tabla de configuracion)
CREATE TABLE IF NOT EXISTS crm_configuracion_seguimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL,
  
  -- Configuracion de seguimiento inmediato posventa
  seguimiento_inmediato_activo BOOLEAN DEFAULT true,
  horas_posventa_default INTEGER DEFAULT 48, -- 24, 48, 72
  mensaje_posventa_default TEXT DEFAULT 'Contactar al cliente para saber como le va con el producto y resolver dudas.',
  
  -- Configuracion de seguimiento de mantenimiento
  seguimiento_mantenimiento_activo BOOLEAN DEFAULT true,
  crear_seguimientos_automaticos BOOLEAN DEFAULT true, -- Al registrar venta
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, perfil_id)
);

-- 4. Crear indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_seguimientos_tipo ON crm_seguimientos(tipo_seguimiento);
CREATE INDEX IF NOT EXISTS idx_seguimientos_venta ON crm_seguimientos(venta_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_producto ON crm_seguimientos(producto_id);
CREATE INDEX IF NOT EXISTS idx_inventario_mantenimiento ON inventario(requiere_mantenimiento) WHERE requiere_mantenimiento = true;

-- 5. Habilitar RLS en la nueva tabla
ALTER TABLE crm_configuracion_seguimiento ENABLE ROW LEVEL SECURITY;

-- 6. Crear politicas RLS
CREATE POLICY "Users can view own config" ON crm_configuracion_seguimiento
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own config" ON crm_configuracion_seguimiento
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own config" ON crm_configuracion_seguimiento
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own config" ON crm_configuracion_seguimiento
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Actualizar seguimientos existentes como tipo 'general'
UPDATE crm_seguimientos SET tipo_seguimiento = 'general' WHERE tipo_seguimiento IS NULL;

COMMENT ON TABLE crm_configuracion_seguimiento IS 'Configuracion de seguimiento posventa por usuario/perfil';
COMMENT ON COLUMN crm_seguimientos.tipo_seguimiento IS 'Tipo: general, posventa_inmediato, mantenimiento';
COMMENT ON COLUMN crm_seguimientos.horas_posventa IS 'Horas despues de la venta para contactar (24, 48, 72)';
COMMENT ON COLUMN inventario.ciclo_mantenimiento_meses IS 'Frecuencia de mantenimiento en meses (ej: 6)';
