-- =====================================================
-- FASE 5: Sistema de Pipeline Visual (Kanban) para CRM
-- =====================================================

-- Tabla de etapas del pipeline (personalizables por usuario)
CREATE TABLE IF NOT EXISTS crm_pipeline_etapas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#6b7280',
  orden INT NOT NULL DEFAULT 0,
  es_etapa_final BOOLEAN DEFAULT false,
  es_etapa_ganada BOOLEAN DEFAULT false,
  es_etapa_perdida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de oportunidades (cada oportunidad es un deal en el pipeline)
CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  etapa_id UUID NOT NULL REFERENCES crm_pipeline_etapas(id) ON DELETE RESTRICT,
  titulo VARCHAR(200) NOT NULL,
  valor_estimado DECIMAL(15,2) DEFAULT 0,
  moneda VARCHAR(3) DEFAULT 'PYG',
  probabilidad INT DEFAULT 50 CHECK (probabilidad >= 0 AND probabilidad <= 100),
  fecha_cierre_estimada DATE,
  fecha_cierre_real DATE,
  producto_interes TEXT,
  notas TEXT,
  prioridad VARCHAR(20) DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  estado VARCHAR(20) DEFAULT 'abierta' CHECK (estado IN ('abierta', 'ganada', 'perdida')),
  motivo_perdida TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de historial de movimientos en el pipeline
CREATE TABLE IF NOT EXISTS crm_pipeline_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidad_id UUID NOT NULL REFERENCES crm_oportunidades(id) ON DELETE CASCADE,
  etapa_anterior_id UUID REFERENCES crm_pipeline_etapas(id) ON DELETE SET NULL,
  etapa_nueva_id UUID NOT NULL REFERENCES crm_pipeline_etapas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_pipeline_etapas_user ON crm_pipeline_etapas(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_etapas_orden ON crm_pipeline_etapas(user_id, orden);
CREATE INDEX IF NOT EXISTS idx_oportunidades_user ON crm_oportunidades(user_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa ON crm_oportunidades(etapa_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente ON crm_oportunidades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_oportunidades_estado ON crm_oportunidades(estado);
CREATE INDEX IF NOT EXISTS idx_pipeline_historial_oportunidad ON crm_pipeline_historial(oportunidad_id);

-- RLS Policies
ALTER TABLE crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_historial ENABLE ROW LEVEL SECURITY;

-- Policies para etapas
DROP POLICY IF EXISTS "Users can view own pipeline etapas" ON crm_pipeline_etapas;
CREATE POLICY "Users can view own pipeline etapas" ON crm_pipeline_etapas
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own pipeline etapas" ON crm_pipeline_etapas;
CREATE POLICY "Users can insert own pipeline etapas" ON crm_pipeline_etapas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pipeline etapas" ON crm_pipeline_etapas;
CREATE POLICY "Users can update own pipeline etapas" ON crm_pipeline_etapas
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own pipeline etapas" ON crm_pipeline_etapas;
CREATE POLICY "Users can delete own pipeline etapas" ON crm_pipeline_etapas
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para oportunidades
DROP POLICY IF EXISTS "Users can view own oportunidades" ON crm_oportunidades;
CREATE POLICY "Users can view own oportunidades" ON crm_oportunidades
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own oportunidades" ON crm_oportunidades;
CREATE POLICY "Users can insert own oportunidades" ON crm_oportunidades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own oportunidades" ON crm_oportunidades;
CREATE POLICY "Users can update own oportunidades" ON crm_oportunidades
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own oportunidades" ON crm_oportunidades;
CREATE POLICY "Users can delete own oportunidades" ON crm_oportunidades
  FOR DELETE USING (auth.uid() = user_id);

-- Policies para historial
DROP POLICY IF EXISTS "Users can view own pipeline historial" ON crm_pipeline_historial;
CREATE POLICY "Users can view own pipeline historial" ON crm_pipeline_historial
  FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can insert own pipeline historial" ON crm_pipeline_historial;
CREATE POLICY "Users can insert own pipeline historial" ON crm_pipeline_historial
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Funcion para crear etapas por defecto para un usuario
CREATE OR REPLACE FUNCTION crear_etapas_pipeline_defecto(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Solo crear si el usuario no tiene etapas
  IF NOT EXISTS (SELECT 1 FROM crm_pipeline_etapas WHERE user_id = p_user_id) THEN
    INSERT INTO crm_pipeline_etapas (user_id, nombre, color, orden, es_etapa_final, es_etapa_ganada, es_etapa_perdida)
    VALUES
      (p_user_id, 'Lead', '#6b7280', 1, false, false, false),
      (p_user_id, 'Contactado', '#3b82f6', 2, false, false, false),
      (p_user_id, 'Propuesta Enviada', '#8b5cf6', 3, false, false, false),
      (p_user_id, 'Negociacion', '#f59e0b', 4, false, false, false),
      (p_user_id, 'Ganado', '#10b981', 5, true, true, false),
      (p_user_id, 'Perdido', '#ef4444', 6, true, false, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear etapas por defecto para usuarios existentes con acceso CRM
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT user_id 
    FROM user_plan_access 
    WHERE plan_type = 'crm' AND is_active = true
  LOOP
    PERFORM crear_etapas_pipeline_defecto(r.user_id);
  END LOOP;
END $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pipeline_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_etapas_updated_at ON crm_pipeline_etapas;
CREATE TRIGGER trigger_update_etapas_updated_at
  BEFORE UPDATE ON crm_pipeline_etapas
  FOR EACH ROW EXECUTE FUNCTION update_pipeline_updated_at();

DROP TRIGGER IF EXISTS trigger_update_oportunidades_updated_at ON crm_oportunidades;
CREATE TRIGGER trigger_update_oportunidades_updated_at
  BEFORE UPDATE ON crm_oportunidades
  FOR EACH ROW EXECUTE FUNCTION update_pipeline_updated_at();
