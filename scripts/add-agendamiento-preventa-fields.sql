-- Migracion: Agendamientos (Preventa) - Sistema completo
-- Fecha: 2024

-- 1. Agregar campos de clasificacion y resultado a crm_agendamientos
ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS clasificacion_amistad TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS clasificacion_ahorro TEXT DEFAULT 'medio',
ADD COLUMN IF NOT EXISTS estrellas INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS es_referido BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referido_por_cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS resultado TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS motivo_suspension TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fecha_reagendar DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS venta_cerrada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES crm_ventas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS es_prospecto_nuevo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prospecto_nombre TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prospecto_telefono TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prospecto_email TEXT DEFAULT NULL;

-- 2. Actualizar los tipos de agendamiento
COMMENT ON COLUMN crm_agendamientos.tipo IS 'presentacion, seguimiento_preventa, cierre, demostracion, negociacion, otro';
COMMENT ON COLUMN crm_agendamientos.estado IS 'pendiente, confirmada, realizada, suspendido, reagendado, cancelada';
COMMENT ON COLUMN crm_agendamientos.resultado IS 'venta_cerrada, no_interesa, reagendar, indeciso, no_contesto';
COMMENT ON COLUMN crm_agendamientos.clasificacion_ahorro IS 'bajo, medio, alto';
COMMENT ON COLUMN crm_agendamientos.clasificacion_amistad IS 'si, no - indica si es contacto por relacion personal';

-- 3. Crear tabla para prospectos (contactos que aun no son clientes)
CREATE TABLE IF NOT EXISTS crm_prospectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT,
  telefono TEXT,
  email TEXT,
  clasificacion_amistad TEXT DEFAULT NULL,
  clasificacion_ahorro TEXT DEFAULT 'medio',
  estrellas INTEGER DEFAULT 3,
  es_referido BOOLEAN DEFAULT false,
  referido_por_cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  notas TEXT,
  estado TEXT DEFAULT 'nuevo',
  convertido_a_cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  fecha_conversion DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Agregar campo para vincular agendamiento con prospecto
ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS prospecto_id UUID REFERENCES crm_prospectos(id) ON DELETE SET NULL;

-- 5. Crear indices para performance
CREATE INDEX IF NOT EXISTS idx_agendamientos_resultado ON crm_agendamientos(resultado);
CREATE INDEX IF NOT EXISTS idx_agendamientos_clasificacion ON crm_agendamientos(clasificacion_ahorro);
CREATE INDEX IF NOT EXISTS idx_agendamientos_estrellas ON crm_agendamientos(estrellas);
CREATE INDEX IF NOT EXISTS idx_prospectos_user ON crm_prospectos(user_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_perfil ON crm_prospectos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_estado ON crm_prospectos(estado);

-- 6. Habilitar RLS en crm_prospectos
ALTER TABLE crm_prospectos ENABLE ROW LEVEL SECURITY;

-- 7. Crear politicas RLS para crm_prospectos
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_prospectos' AND policyname = 'Users can view own prospectos') THEN
    CREATE POLICY "Users can view own prospectos" ON crm_prospectos FOR SELECT USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_prospectos' AND policyname = 'Users can insert own prospectos') THEN
    CREATE POLICY "Users can insert own prospectos" ON crm_prospectos FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_prospectos' AND policyname = 'Users can update own prospectos') THEN
    CREATE POLICY "Users can update own prospectos" ON crm_prospectos FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_prospectos' AND policyname = 'Users can delete own prospectos') THEN
    CREATE POLICY "Users can delete own prospectos" ON crm_prospectos FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 8. Agregar campo de productos de interes a agendamientos (para pre-cargar al cerrar venta)
ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS productos_interes JSONB DEFAULT '[]';

COMMENT ON COLUMN crm_agendamientos.productos_interes IS 'Array de {producto_id, cantidad, precio} para pre-cargar al cerrar venta';
