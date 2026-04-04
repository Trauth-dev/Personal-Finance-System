-- =====================================================
-- FASE 1: CRM - Tablas Base y Compartidas
-- =====================================================
-- Este script:
-- 1. Crea la tabla 'clientes' compartida (vinculada a user_id)
-- 2. Agrega user_id a proveedores para compartir con CRM
-- 3. Actualiza el constraint de plan_type para incluir 'crm'
-- =====================================================

-- =====================================================
-- 1. TABLA CLIENTES (COMPARTIDA entre Empresarial y CRM)
-- =====================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos básicos del cliente
  nombre TEXT NOT NULL,
  apellido TEXT,
  telefono TEXT,
  email TEXT,
  ciudad TEXT,
  direccion TEXT,
  
  -- Datos adicionales
  empresa TEXT,
  cargo TEXT,
  notas TEXT,
  
  -- Clasificación (para CRM principalmente pero disponible para todos)
  clasificacion TEXT CHECK (clasificacion IN ('amistad', 'ahorro', 'otro')),
  estrellas INTEGER DEFAULT 0 CHECK (estrellas >= 0 AND estrellas <= 3),
  
  -- Canal de origen (cómo llegó)
  canal_origen TEXT CHECK (canal_origen IN ('ventas', 'referido', 'instagram', 'evento', 'info_room', 'info_consultor', 'otro')),
  canal_origen_detalle TEXT,
  
  -- Estado del cliente
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'potencial')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON clientes(nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_ciudad ON clientes(ciudad);
CREATE INDEX IF NOT EXISTS idx_clientes_clasificacion ON clientes(clasificacion);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);

-- RLS para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own clients" ON clientes;
CREATE POLICY "Users can view own clients"
ON clientes FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own clients" ON clientes;
CREATE POLICY "Users can insert own clients"
ON clientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own clients" ON clientes;
CREATE POLICY "Users can update own clients"
ON clientes FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own clients" ON clientes;
CREATE POLICY "Users can delete own clients"
ON clientes FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- 2. ACTUALIZAR PROVEEDORES PARA COMPARTIR
-- =====================================================
-- Agregar user_id a proveedores si no existe (para compartir entre perfiles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'proveedores' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE proveedores ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    
    -- Poblar user_id desde perfil_id existente
    UPDATE proveedores p
    SET user_id = perf.user_id
    FROM perfiles perf
    WHERE p.perfil_id = perf.id AND p.user_id IS NULL;
    
    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_proveedores_user_id ON proveedores(user_id);
  END IF;
END $$;

-- =====================================================
-- 3. ACTUALIZAR CONSTRAINT DE PLAN_TYPE PARA INCLUIR CRM
-- =====================================================
-- Eliminar constraint anterior y crear uno nuevo con 'crm'
ALTER TABLE user_plan_access DROP CONSTRAINT IF EXISTS user_plan_access_plan_type_check;
ALTER TABLE user_plan_access ADD CONSTRAINT user_plan_access_plan_type_check 
  CHECK (plan_type IN ('personal', 'empresarial', 'crm'));

-- =====================================================
-- 4. TRIGGER PARA UPDATED_AT EN CLIENTES
-- =====================================================
CREATE OR REPLACE FUNCTION update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON clientes;
CREATE TRIGGER trigger_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_clientes_updated_at();

-- =====================================================
-- 5. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================
COMMENT ON TABLE clientes IS 'Tabla compartida de clientes entre perfiles Empresarial y CRM';
COMMENT ON COLUMN clientes.user_id IS 'Usuario propietario - permite compartir entre perfiles del mismo usuario';
COMMENT ON COLUMN clientes.clasificacion IS 'Clasificación del cliente: amistad, ahorro, otro';
COMMENT ON COLUMN clientes.estrellas IS 'Calificación de 0 a 3 estrellas';
COMMENT ON COLUMN clientes.canal_origen IS 'Cómo llegó el cliente: ventas, referido, instagram, evento, info_room, info_consultor, otro';
