-- Script completamente idempotente para crear sistema de perfiles
-- Puede ejecutarse múltiples veces sin errores

-- PASO 1: Eliminar todo lo existente (en orden inverso de dependencias)
DROP TRIGGER IF EXISTS on_auth_user_created_perfil ON auth.users;
DROP FUNCTION IF EXISTS create_default_perfiles();

-- Eliminar políticas RLS
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios perfiles" ON perfiles;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propios perfiles" ON perfiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios perfiles" ON perfiles;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios perfiles" ON perfiles;

-- PASO 2: Crear o actualizar tabla perfiles
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('personal', 'empresarial')),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icono TEXT DEFAULT '👤',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar constraint único si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'perfiles_user_id_tipo_key'
  ) THEN
    ALTER TABLE perfiles ADD CONSTRAINT perfiles_user_id_tipo_key UNIQUE(user_id, tipo);
  END IF;
END $$;

-- PASO 3: Crear índices
CREATE INDEX IF NOT EXISTS idx_perfiles_user_id ON perfiles(user_id);
CREATE INDEX IF NOT EXISTS idx_perfiles_tipo ON perfiles(tipo);

-- PASO 4: Habilitar RLS
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- PASO 5: Crear políticas RLS
CREATE POLICY "Los usuarios pueden ver sus propios perfiles"
  ON perfiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios perfiles"
  ON perfiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios perfiles"
  ON perfiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios perfiles"
  ON perfiles FOR DELETE
  USING (auth.uid() = user_id);

-- PASO 6: Agregar columna perfil_id a tablas existentes
DO $$ 
BEGIN
  -- ingresos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ingresos' AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE ingresos ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
    CREATE INDEX idx_ingresos_perfil_id ON ingresos(perfil_id);
  END IF;

  -- egresos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'egresos' AND column_name = 'perfil_id'
  ) THEN
    ALTER TABLE egresos ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
    CREATE INDEX idx_egresos_perfil_id ON egresos(perfil_id);
  END IF;

  -- tipos_categoria_egreso
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tipos_categoria_egreso') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'tipos_categoria_egreso' AND column_name = 'perfil_id'
    ) THEN
      ALTER TABLE tipos_categoria_egreso ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
      CREATE INDEX idx_tipos_categoria_egreso_perfil_id ON tipos_categoria_egreso(perfil_id);
    END IF;
  END IF;

  -- categorias_egreso
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias_egreso') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'categorias_egreso' AND column_name = 'perfil_id'
    ) THEN
      ALTER TABLE categorias_egreso ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
      CREATE INDEX idx_categorias_egreso_perfil_id ON categorias_egreso(perfil_id);
    END IF;
  END IF;

  -- categorias_ingresos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'categorias_ingresos') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'categorias_ingresos' AND column_name = 'perfil_id'
    ) THEN
      ALTER TABLE categorias_ingresos ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
      CREATE INDEX idx_categorias_ingresos_perfil_id ON categorias_ingresos(perfil_id);
    END IF;
  END IF;

  -- presupuesto_mensual
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'presupuesto_mensual') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'presupuesto_mensual' AND column_name = 'perfil_id'
    ) THEN
      ALTER TABLE presupuesto_mensual ADD COLUMN perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE;
      CREATE INDEX idx_presupuesto_mensual_perfil_id ON presupuesto_mensual(perfil_id);
    END IF;
  END IF;
END $$;

-- PASO 7: Crear función para auto-crear perfiles
CREATE OR REPLACE FUNCTION create_default_perfiles()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil Personal (solo si no existe)
  INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
  VALUES (NEW.id, 'Personal', 'personal', '#3b82f6', '👤')
  ON CONFLICT (user_id, tipo) DO NOTHING;
  
  -- Crear perfil Empresarial (solo si no existe)
  INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
  VALUES (NEW.id, 'Empresarial', 'empresarial', '#8b5cf6', '🏢')
  ON CONFLICT (user_id, tipo) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 8: Crear trigger
CREATE TRIGGER on_auth_user_created_perfil
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_perfiles();
