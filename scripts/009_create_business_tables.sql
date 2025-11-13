-- =====================================================
-- FASE 3: Tablas para Funcionalidades Empresariales
-- =====================================================
-- Este script crea todas las tablas necesarias para el perfil empresarial
-- Incluye: inventario, proveedores, materias primas, ventas y compras

-- 1. TABLA DE INVENTARIO (Productos)
CREATE TABLE IF NOT EXISTS inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  sku TEXT,
  stock_actual DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  precio_costo DECIMAL(10,2) DEFAULT 0,
  precio_venta DECIMAL(10,2) DEFAULT 0,
  unidad_medida TEXT DEFAULT 'unidad',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para inventario
CREATE INDEX IF NOT EXISTS idx_inventario_perfil ON inventario(perfil_id);
CREATE INDEX IF NOT EXISTS idx_inventario_sku ON inventario(sku);
CREATE INDEX IF NOT EXISTS idx_inventario_activo ON inventario(activo);

-- 2. TABLA DE PROVEEDORES
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  contacto_nombre TEXT,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para proveedores
CREATE INDEX IF NOT EXISTS idx_proveedores_perfil ON proveedores(perfil_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_activo ON proveedores(activo);

-- 3. TABLA DE MATERIAS PRIMAS
CREATE TABLE IF NOT EXISTS materias_primas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  stock_actual DECIMAL(10,2) DEFAULT 0,
  stock_minimo DECIMAL(10,2) DEFAULT 0,
  costo_unitario DECIMAL(10,2) DEFAULT 0,
  unidad_medida TEXT DEFAULT 'unidad',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para materias primas
CREATE INDEX IF NOT EXISTS idx_materias_primas_perfil ON materias_primas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_materias_primas_proveedor ON materias_primas(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_materias_primas_activo ON materias_primas(activo);

-- 4. TABLA DE VENTAS
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES inventario(id) ON DELETE SET NULL,
  producto_nombre TEXT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  cliente_email TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para ventas
CREATE INDEX IF NOT EXISTS idx_ventas_perfil ON ventas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha);

-- 5. TABLA DE COMPRAS
CREATE TABLE IF NOT EXISTS compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  proveedor_nombre TEXT NOT NULL,
  materia_prima_id UUID REFERENCES materias_primas(id) ON DELETE SET NULL,
  materia_prima_nombre TEXT NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  costo_unitario DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para compras
CREATE INDEX IF NOT EXISTS idx_compras_perfil ON compras(perfil_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON compras(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_materia_prima ON compras(materia_prima_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON compras(fecha);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE materias_primas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

-- Políticas para INVENTARIO
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio inventario" ON inventario;
CREATE POLICY "Los usuarios pueden ver su propio inventario"
  ON inventario FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar en su propio inventario" ON inventario;
CREATE POLICY "Los usuarios pueden insertar en su propio inventario"
  ON inventario FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio inventario" ON inventario;
CREATE POLICY "Los usuarios pueden actualizar su propio inventario"
  ON inventario FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar de su propio inventario" ON inventario;
CREATE POLICY "Los usuarios pueden eliminar de su propio inventario"
  ON inventario FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

-- Políticas para PROVEEDORES
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden ver sus propios proveedores"
  ON proveedores FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden insertar sus propios proveedores"
  ON proveedores FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden actualizar sus propios proveedores"
  ON proveedores FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios proveedores" ON proveedores;
CREATE POLICY "Los usuarios pueden eliminar sus propios proveedores"
  ON proveedores FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

-- Políticas para MATERIAS PRIMAS
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias materias primas" ON materias_primas;
CREATE POLICY "Los usuarios pueden ver sus propias materias primas"
  ON materias_primas FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias materias primas" ON materias_primas;
CREATE POLICY "Los usuarios pueden insertar sus propias materias primas"
  ON materias_primas FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias materias primas" ON materias_primas;
CREATE POLICY "Los usuarios pueden actualizar sus propias materias primas"
  ON materias_primas FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias materias primas" ON materias_primas;
CREATE POLICY "Los usuarios pueden eliminar sus propias materias primas"
  ON materias_primas FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

-- Políticas para VENTAS
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias ventas" ON ventas;
CREATE POLICY "Los usuarios pueden ver sus propias ventas"
  ON ventas FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias ventas" ON ventas;
CREATE POLICY "Los usuarios pueden insertar sus propias ventas"
  ON ventas FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias ventas" ON ventas;
CREATE POLICY "Los usuarios pueden actualizar sus propias ventas"
  ON ventas FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias ventas" ON ventas;
CREATE POLICY "Los usuarios pueden eliminar sus propias ventas"
  ON ventas FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

-- Políticas para COMPRAS
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias compras" ON compras;
CREATE POLICY "Los usuarios pueden ver sus propias compras"
  ON compras FOR SELECT
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias compras" ON compras;
CREATE POLICY "Los usuarios pueden insertar sus propias compras"
  ON compras FOR INSERT
  WITH CHECK (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias compras" ON compras;
CREATE POLICY "Los usuarios pueden actualizar sus propias compras"
  ON compras FOR UPDATE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias compras" ON compras;
CREATE POLICY "Los usuarios pueden eliminar sus propias compras"
  ON compras FOR DELETE
  USING (perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid()));

-- =====================================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para inventario
DROP TRIGGER IF EXISTS update_inventario_updated_at ON inventario;
CREATE TRIGGER update_inventario_updated_at
  BEFORE UPDATE ON inventario
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para materias_primas
DROP TRIGGER IF EXISTS update_materias_primas_updated_at ON materias_primas;
CREATE TRIGGER update_materias_primas_updated_at
  BEFORE UPDATE ON materias_primas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
