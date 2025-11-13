-- Script para agregar sistema de presupuesto mensual y patrimonio neto
-- Ejecutar este script para habilitar las nuevas funcionalidades

-- Tabla de presupuesto por categoría
CREATE TABLE IF NOT EXISTS presupuesto_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  tipo_categoria TEXT NOT NULL CHECK (tipo_categoria IN ('ingreso', 'egreso')),
  monto_presupuestado DECIMAL(15, 2) NOT NULL DEFAULT 0,
  mes DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(perfil_id, categoria, tipo_categoria, mes)
);

-- Tabla de patrimonio (activos y pasivos)
CREATE TABLE IF NOT EXISTS patrimonio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('activo', 'pasivo')),
  categoria TEXT NOT NULL,
  nombre TEXT NOT NULL,
  valor DECIMAL(15, 2) NOT NULL DEFAULT 0,
  descripcion TEXT,
  fecha_valuacion DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_presupuesto_categorias_perfil ON presupuesto_categorias(perfil_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_categorias_mes ON presupuesto_categorias(mes);
CREATE INDEX IF NOT EXISTS idx_patrimonio_perfil ON patrimonio(perfil_id);
CREATE INDEX IF NOT EXISTS idx_patrimonio_tipo ON patrimonio(tipo);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_presupuesto_categorias_updated_at ON presupuesto_categorias;
CREATE TRIGGER update_presupuesto_categorias_updated_at
  BEFORE UPDATE ON presupuesto_categorias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patrimonio_updated_at ON patrimonio;
CREATE TRIGGER update_patrimonio_updated_at
  BEFORE UPDATE ON patrimonio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE presupuesto_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE patrimonio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios presupuestos" ON presupuesto_categorias;
CREATE POLICY "Los usuarios pueden ver sus propios presupuestos"
  ON presupuesto_categorias FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios presupuestos" ON presupuesto_categorias;
CREATE POLICY "Los usuarios pueden insertar sus propios presupuestos"
  ON presupuesto_categorias FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios presupuestos" ON presupuesto_categorias;
CREATE POLICY "Los usuarios pueden actualizar sus propios presupuestos"
  ON presupuesto_categorias FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios presupuestos" ON presupuesto_categorias;
CREATE POLICY "Los usuarios pueden eliminar sus propios presupuestos"
  ON presupuesto_categorias FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden ver su propio patrimonio" ON patrimonio;
CREATE POLICY "Los usuarios pueden ver su propio patrimonio"
  ON patrimonio FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio patrimonio" ON patrimonio;
CREATE POLICY "Los usuarios pueden insertar su propio patrimonio"
  ON patrimonio FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio patrimonio" ON patrimonio;
CREATE POLICY "Los usuarios pueden actualizar su propio patrimonio"
  ON patrimonio FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar su propio patrimonio" ON patrimonio;
CREATE POLICY "Los usuarios pueden eliminar su propio patrimonio"
  ON patrimonio FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));
