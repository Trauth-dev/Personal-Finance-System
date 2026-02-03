-- =============================================
-- SISTEMA DE HÁBITOS RECURRENTES
-- Script para crear tablas de hábitos con intervalos flexibles
-- Inspirado en HabitNow
-- =============================================

-- Tabla de Hábitos Recurrentes (cada X días)
CREATE TABLE IF NOT EXISTS habitos_recurrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  intervalo_dias INTEGER NOT NULL DEFAULT 1, -- Cada cuántos días se repite
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- Opcional, puede ser indefinido
  color TEXT DEFAULT '#06b6d4', -- Cyan/Teal
  icono TEXT DEFAULT 'repeat',
  activo BOOLEAN DEFAULT true,
  ultima_completada DATE, -- Fecha en que se completó por última vez
  proxima_ocurrencia DATE, -- Próxima fecha en que debe completarse
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Registro de Hábitos Recurrentes (historial de completados)
CREATE TABLE IF NOT EXISTS registro_habitos_recurrentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habito_id UUID NOT NULL REFERENCES habitos_recurrentes(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  completado BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(habito_id, fecha) -- Solo un registro por hábito por día
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_habitos_recurrentes_perfil ON habitos_recurrentes(perfil_id);
CREATE INDEX IF NOT EXISTS idx_habitos_recurrentes_activo ON habitos_recurrentes(activo);
CREATE INDEX IF NOT EXISTS idx_habitos_recurrentes_proxima ON habitos_recurrentes(proxima_ocurrencia);
CREATE INDEX IF NOT EXISTS idx_registro_recurrentes_fecha ON registro_habitos_recurrentes(fecha);
CREATE INDEX IF NOT EXISTS idx_registro_recurrentes_habito ON registro_habitos_recurrentes(habito_id);

-- Habilitar RLS
ALTER TABLE habitos_recurrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE registro_habitos_recurrentes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para habitos_recurrentes
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios hábitos recurrentes" ON habitos_recurrentes;
CREATE POLICY "Los usuarios pueden ver sus propios hábitos recurrentes" ON habitos_recurrentes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios hábitos recurrentes" ON habitos_recurrentes;
CREATE POLICY "Los usuarios pueden insertar sus propios hábitos recurrentes" ON habitos_recurrentes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios hábitos recurrentes" ON habitos_recurrentes;
CREATE POLICY "Los usuarios pueden actualizar sus propios hábitos recurrentes" ON habitos_recurrentes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios hábitos recurrentes" ON habitos_recurrentes;
CREATE POLICY "Los usuarios pueden eliminar sus propios hábitos recurrentes" ON habitos_recurrentes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para registro_habitos_recurrentes
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios registros recurrentes" ON registro_habitos_recurrentes;
CREATE POLICY "Los usuarios pueden ver sus propios registros recurrentes" ON registro_habitos_recurrentes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios registros recurrentes" ON registro_habitos_recurrentes;
CREATE POLICY "Los usuarios pueden insertar sus propios registros recurrentes" ON registro_habitos_recurrentes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios registros recurrentes" ON registro_habitos_recurrentes;
CREATE POLICY "Los usuarios pueden actualizar sus propios registros recurrentes" ON registro_habitos_recurrentes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios registros recurrentes" ON registro_habitos_recurrentes;
CREATE POLICY "Los usuarios pueden eliminar sus propios registros recurrentes" ON registro_habitos_recurrentes
  FOR DELETE USING (auth.uid() = user_id);
