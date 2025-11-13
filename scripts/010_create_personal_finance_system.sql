-- Script para crear el sistema completo de finanzas personales
-- Incluye: Deudas, Cajas de Ahorro, Alertas, Logros, Categorías Pre-establecidas

-- ============================================
-- TABLA: deudas
-- Gestión de deudas con seguimiento de pagos
-- ============================================
CREATE TABLE IF NOT EXISTS deudas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto_total DECIMAL(15,2) NOT NULL,
  monto_pagado DECIMAL(15,2) DEFAULT 0,
  tasa_interes DECIMAL(5,2) DEFAULT 0,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE,
  cuotas_totales INTEGER,
  cuotas_pagadas INTEGER DEFAULT 0,
  monto_cuota DECIMAL(15,2),
  frecuencia_pago TEXT CHECK (frecuencia_pago IN ('semanal', 'quincenal', 'mensual', 'trimestral', 'anual')),
  acreedor TEXT NOT NULL,
  estado TEXT DEFAULT 'activa' CHECK (estado IN ('activa', 'pagada', 'vencida', 'refinanciada')),
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: pagos_deuda
-- Registro de pagos realizados a deudas
-- ============================================
CREATE TABLE IF NOT EXISTS pagos_deuda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deuda_id UUID REFERENCES deudas(id) ON DELETE CASCADE,
  monto DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  metodo_pago TEXT,
  comprobante TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: cajas_ahorro
-- Sistema de "cajas" para distribuir dinero
-- ============================================
CREATE TABLE IF NOT EXISTS cajas_ahorro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('suenos', 'emergencia', 'vacaciones', 'educacion', 'inversion', 'retiro', 'otro')),
  icono TEXT DEFAULT '💰',
  color TEXT DEFAULT 'blue',
  meta_monto DECIMAL(15,2),
  monto_actual DECIMAL(15,2) DEFAULT 0,
  fecha_meta DATE,
  prioridad INTEGER DEFAULT 1,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: movimientos_caja
-- Movimientos de dinero en cajas de ahorro
-- ============================================
CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caja_id UUID REFERENCES cajas_ahorro(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('deposito', 'retiro')),
  monto DECIMAL(15,2) NOT NULL,
  fecha DATE NOT NULL,
  concepto TEXT,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: alertas_financieras
-- Sistema de alertas y notificaciones
-- ============================================
CREATE TABLE IF NOT EXISTS alertas_financieras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('presupuesto_excedido', 'meta_alcanzada', 'deuda_vencimiento', 'bajo_ahorro', 'logro_mensual')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  nivel TEXT DEFAULT 'info' CHECK (nivel IN ('info', 'warning', 'error', 'success')),
  leida BOOLEAN DEFAULT false,
  fecha DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: logros_financieros
-- Sistema de logros y badges
-- ============================================
CREATE TABLE IF NOT EXISTS logros_financieros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT,
  fecha_obtenido DATE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: categorias_predefinidas
-- Categorías pre-establecidas con guías
-- ============================================
CREATE TABLE IF NOT EXISTS categorias_predefinidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  descripcion TEXT,
  icono TEXT,
  color TEXT,
  porcentaje_sugerido DECIMAL(5,2),
  tips TEXT[],
  orden INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true
);

-- ============================================
-- INSERTAR CATEGORÍAS PREDEFINIDAS
-- ============================================
INSERT INTO categorias_predefinidas (nombre, tipo, descripcion, icono, color, porcentaje_sugerido, tips, orden) VALUES
-- Categorías de Egreso
('Vivienda', 'egreso', 'Alquiler, hipoteca, servicios básicos', '🏠', 'blue', 30.00, ARRAY['Mantén este gasto entre 25-30% de tus ingresos', 'Considera compartir gastos si es posible'], 1),
('Alimentación', 'egreso', 'Supermercado, comidas fuera', '🍽️', 'green', 15.00, ARRAY['Planifica tus comidas semanalmente', 'Compra con lista para evitar gastos innecesarios'], 2),
('Transporte', 'egreso', 'Combustible, transporte público, mantenimiento', '🚗', 'yellow', 10.00, ARRAY['Considera opciones de transporte compartido', 'Mantén tu vehículo en buen estado'], 3),
('Salud', 'egreso', 'Medicamentos, consultas médicas, seguro', '⚕️', 'red', 10.00, ARRAY['Prioriza tu salud preventiva', 'Mantén un fondo de emergencia médica'], 4),
('Educación', 'egreso', 'Cursos, libros, materiales', '📚', 'purple', 5.00, ARRAY['Invierte en tu desarrollo personal', 'Busca opciones gratuitas o de bajo costo'], 5),
('Entretenimiento', 'egreso', 'Ocio, hobbies, suscripciones', '🎮', 'pink', 5.00, ARRAY['Disfruta con moderación', 'Busca actividades gratuitas'], 6),
('Ahorro', 'egreso', 'Ahorro mensual obligatorio', '💰', 'teal', 20.00, ARRAY['Ahorra al menos 20% de tus ingresos', 'Automatiza tus ahorros'], 7),
('Deudas', 'egreso', 'Pago de préstamos y tarjetas', '💳', 'orange', 5.00, ARRAY['Prioriza deudas con mayor interés', 'Evita nuevas deudas innecesarias'], 8),

-- Categorías de Ingreso
('Salario', 'ingreso', 'Ingreso principal por trabajo', '💼', 'green', NULL, ARRAY['Tu fuente principal de ingresos', 'Busca aumentos o promociones'], 1),
('Freelance', 'ingreso', 'Trabajos independientes', '💻', 'blue', NULL, ARRAY['Diversifica tus fuentes de ingreso', 'Guarda para impuestos'], 2),
('Inversiones', 'ingreso', 'Rendimientos de inversiones', '📈', 'purple', NULL, ARRAY['Reinvierte tus ganancias', 'Diversifica tu portafolio'], 3),
('Otros Ingresos', 'ingreso', 'Ingresos adicionales', '💵', 'teal', NULL, ARRAY['Registra todos tus ingresos', 'Considera ahorrar ingresos extras'], 4)
ON CONFLICT DO NOTHING;

-- ============================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deudas_updated_at BEFORE UPDATE ON deudas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cajas_ahorro_updated_at BEFORE UPDATE ON cajas_ahorro
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Actualizar monto_pagado en deudas
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_monto_pagado_deuda()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE deudas
  SET 
    monto_pagado = (
      SELECT COALESCE(SUM(monto), 0)
      FROM pagos_deuda
      WHERE deuda_id = NEW.deuda_id
    ),
    cuotas_pagadas = cuotas_pagadas + 1,
    estado = CASE
      WHEN (SELECT COALESCE(SUM(monto), 0) FROM pagos_deuda WHERE deuda_id = NEW.deuda_id) >= monto_total THEN 'pagada'
      ELSE estado
    END
  WHERE id = NEW.deuda_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_monto_pagado_deuda
AFTER INSERT ON pagos_deuda
FOR EACH ROW EXECUTE FUNCTION actualizar_monto_pagado_deuda();

-- ============================================
-- TRIGGER: Actualizar monto_actual en cajas
-- ============================================
CREATE OR REPLACE FUNCTION actualizar_monto_caja()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cajas_ahorro
  SET monto_actual = (
    SELECT COALESCE(
      SUM(CASE WHEN tipo = 'deposito' THEN monto ELSE -monto END),
      0
    )
    FROM movimientos_caja
    WHERE caja_id = NEW.caja_id
  )
  WHERE id = NEW.caja_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_monto_caja
AFTER INSERT ON movimientos_caja
FOR EACH ROW EXECUTE FUNCTION actualizar_monto_caja();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Deudas
ALTER TABLE deudas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias deudas" ON deudas;
CREATE POLICY "Los usuarios pueden ver sus propias deudas" ON deudas FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias deudas" ON deudas;
CREATE POLICY "Los usuarios pueden insertar sus propias deudas" ON deudas FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias deudas" ON deudas;
CREATE POLICY "Los usuarios pueden actualizar sus propias deudas" ON deudas FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias deudas" ON deudas;
CREATE POLICY "Los usuarios pueden eliminar sus propias deudas" ON deudas FOR DELETE USING (auth.uid() = user_id);

-- Pagos de Deuda
ALTER TABLE pagos_deuda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios pagos" ON pagos_deuda;
CREATE POLICY "Los usuarios pueden ver sus propios pagos" ON pagos_deuda FOR SELECT USING (
  EXISTS (SELECT 1 FROM deudas WHERE deudas.id = pagos_deuda.deuda_id AND deudas.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios pagos" ON pagos_deuda;
CREATE POLICY "Los usuarios pueden insertar sus propios pagos" ON pagos_deuda FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM deudas WHERE deudas.id = pagos_deuda.deuda_id AND deudas.user_id = auth.uid())
);

-- Cajas de Ahorro
ALTER TABLE cajas_ahorro ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias cajas" ON cajas_ahorro;
CREATE POLICY "Los usuarios pueden ver sus propias cajas" ON cajas_ahorro FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias cajas" ON cajas_ahorro;
CREATE POLICY "Los usuarios pueden insertar sus propias cajas" ON cajas_ahorro FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias cajas" ON cajas_ahorro;
CREATE POLICY "Los usuarios pueden actualizar sus propias cajas" ON cajas_ahorro FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias cajas" ON cajas_ahorro;
CREATE POLICY "Los usuarios pueden eliminar sus propias cajas" ON cajas_ahorro FOR DELETE USING (auth.uid() = user_id);

-- Movimientos de Caja
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios movimientos" ON movimientos_caja;
CREATE POLICY "Los usuarios pueden ver sus propios movimientos" ON movimientos_caja FOR SELECT USING (
  EXISTS (SELECT 1 FROM cajas_ahorro WHERE cajas_ahorro.id = movimientos_caja.caja_id AND cajas_ahorro.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios movimientos" ON movimientos_caja;
CREATE POLICY "Los usuarios pueden insertar sus propios movimientos" ON movimientos_caja FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM cajas_ahorro WHERE cajas_ahorro.id = movimientos_caja.caja_id AND cajas_ahorro.user_id = auth.uid())
);

-- Alertas Financieras
ALTER TABLE alertas_financieras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias alertas" ON alertas_financieras;
CREATE POLICY "Los usuarios pueden ver sus propias alertas" ON alertas_financieras FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias alertas" ON alertas_financieras;
CREATE POLICY "Los usuarios pueden insertar sus propias alertas" ON alertas_financieras FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias alertas" ON alertas_financieras;
CREATE POLICY "Los usuarios pueden actualizar sus propias alertas" ON alertas_financieras FOR UPDATE USING (auth.uid() = user_id);

-- Logros Financieros
ALTER TABLE logros_financieros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios logros" ON logros_financieros;
CREATE POLICY "Los usuarios pueden ver sus propios logros" ON logros_financieros FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios logros" ON logros_financieros;
CREATE POLICY "Los usuarios pueden insertar sus propios logros" ON logros_financieros FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Categorías Predefinidas (público para lectura)
ALTER TABLE categorias_predefinidas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos pueden ver categorías predefinidas" ON categorias_predefinidas;
CREATE POLICY "Todos pueden ver categorías predefinidas" ON categorias_predefinidas FOR SELECT USING (true);
