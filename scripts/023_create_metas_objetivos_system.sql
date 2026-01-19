-- =============================================
-- SISTEMA DE METAS Y OBJETIVOS
-- Script para crear tablas de seguimiento de metas,
-- objetivos y hábitos personales
-- =============================================

-- Tabla de Metas (objetivos grandes: mensuales, anuales)
CREATE TABLE IF NOT EXISTS metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('anual', 'mensual', 'semanal')),
  categoria TEXT DEFAULT 'general', -- finanzas, salud, educacion, trabajo, personal, etc.
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  valor_objetivo NUMERIC, -- Para metas medibles (ej: ahorrar 1000000)
  valor_actual NUMERIC DEFAULT 0,
  unidad TEXT, -- Gs, kg, km, horas, etc.
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'completada', 'pausada', 'cancelada')),
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  color TEXT DEFAULT '#22c55e',
  icono TEXT DEFAULT 'target',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Hábitos (acciones recurrentes diarias/semanales)
CREATE TABLE IF NOT EXISTS habitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'dias_especificos')),
  dias_semana INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,0], -- 0=Dom, 1=Lun, ..., 6=Sab
  hora_recordatorio TIME,
  meta_id UUID REFERENCES metas(id) ON DELETE SET NULL, -- Vinculación opcional a una meta
  color TEXT DEFAULT '#22c55e',
  icono TEXT DEFAULT 'check-circle',
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Registro de Hábitos (seguimiento diario)
CREATE TABLE IF NOT EXISTS registro_habitos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habito_id UUID NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  completado BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habito_id, fecha) -- Solo un registro por hábito por día
);

-- Tabla de Tareas (acciones específicas dentro de una meta)
CREATE TABLE IF NOT EXISTS tareas_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id UUID NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  completada BOOLEAN DEFAULT false,
  fecha_limite DATE,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_metas_perfil ON metas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_metas_tipo ON metas(tipo);
CREATE INDEX IF NOT EXISTS idx_metas_estado ON metas(estado);
CREATE INDEX IF NOT EXISTS idx_habitos_perfil ON habitos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_habitos_activo ON habitos(activo);
CREATE INDEX IF NOT EXISTS idx_registro_habitos_fecha ON registro_habitos(fecha);
CREATE INDEX IF NOT EXISTS idx_registro_habitos_habito ON registro_habitos(habito_id);
CREATE INDEX IF NOT EXISTS idx_tareas_meta ON tareas_meta(meta_id);

-- Habilitar RLS
ALTER TABLE metas ENABLE ROW LEVEL SECURITY;
ALTER TABLE habitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_habitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas_meta ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para metas
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias metas" ON metas;
CREATE POLICY "Los usuarios pueden ver sus propias metas" ON metas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias metas" ON metas;
CREATE POLICY "Los usuarios pueden insertar sus propias metas" ON metas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias metas" ON metas;
CREATE POLICY "Los usuarios pueden actualizar sus propias metas" ON metas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias metas" ON metas;
CREATE POLICY "Los usuarios pueden eliminar sus propias metas" ON metas
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para hábitos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios hábitos" ON habitos;
CREATE POLICY "Los usuarios pueden ver sus propios hábitos" ON habitos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios hábitos" ON habitos;
CREATE POLICY "Los usuarios pueden insertar sus propios hábitos" ON habitos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios hábitos" ON habitos;
CREATE POLICY "Los usuarios pueden actualizar sus propios hábitos" ON habitos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios hábitos" ON habitos;
CREATE POLICY "Los usuarios pueden eliminar sus propios hábitos" ON habitos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para registro_habitos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios registros" ON registro_habitos;
CREATE POLICY "Los usuarios pueden ver sus propios registros" ON registro_habitos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios registros" ON registro_habitos;
CREATE POLICY "Los usuarios pueden insertar sus propios registros" ON registro_habitos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios registros" ON registro_habitos;
CREATE POLICY "Los usuarios pueden actualizar sus propios registros" ON registro_habitos
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios registros" ON registro_habitos;
CREATE POLICY "Los usuarios pueden eliminar sus propios registros" ON registro_habitos
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para tareas_meta
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias tareas" ON tareas_meta;
CREATE POLICY "Los usuarios pueden ver sus propias tareas" ON tareas_meta
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias tareas" ON tareas_meta;
CREATE POLICY "Los usuarios pueden insertar sus propias tareas" ON tareas_meta
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias tareas" ON tareas_meta;
CREATE POLICY "Los usuarios pueden actualizar sus propias tareas" ON tareas_meta
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias tareas" ON tareas_meta;
CREATE POLICY "Los usuarios pueden eliminar sus propias tareas" ON tareas_meta
  FOR DELETE USING (auth.uid() = user_id);
