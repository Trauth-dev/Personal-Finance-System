-- =====================================================
-- FASE 2: TABLAS EXCLUSIVAS DE CRM
-- Todas vinculadas a perfil_id de tipo CRM
-- =====================================================

-- =====================================================
-- 1. CRM_INTERACCIONES
-- Clasificación del cliente y canal de origen
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_interacciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Clasificación del cliente
  clasificacion TEXT NOT NULL CHECK (clasificacion IN ('amistad', 'ahorro')),
  estrellas INTEGER NOT NULL DEFAULT 1 CHECK (estrellas >= 1 AND estrellas <= 3),
  
  -- Cómo llegó el cliente
  como_llego TEXT NOT NULL CHECK (como_llego IN (
    'ventas', 
    'referido', 
    'instagram', 
    'evento', 
    'info_room', 
    'info_consultor'
  )),
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Un cliente solo tiene una interacción por perfil
  UNIQUE(cliente_id, perfil_id)
);

-- =====================================================
-- 2. CRM_SEGUIMIENTOS
-- Notas y recordatorios de clientes
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_seguimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  nota TEXT NOT NULL,
  
  -- Sistema de recordatorios
  recordatorio_tipo TEXT CHECK (recordatorio_tipo IN (
    'semanal',      -- 7 días
    'quincenal',    -- 14 días
    'mensual',      -- 30 días
    'personalizado' -- fecha específica
  )),
  recordatorio_fecha DATE, -- Para tipo personalizado o fecha calculada
  recordatorio_completado BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. CRM_AGENDAMIENTOS
-- Programación de citas/presentaciones
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_agendamientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  titulo TEXT NOT NULL,
  lugar TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER DEFAULT 60,
  
  tipo TEXT DEFAULT 'presentacion' CHECK (tipo IN (
    'presentacion',  -- Presentación de producto
    'seguimiento',   -- Seguimiento post-venta
    'cierre',        -- Intento de cierre
    'otro'
  )),
  
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente',
    'confirmado',
    'completado',
    'cancelado',
    'reprogramado'
  )),
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. CRM_CITAS
-- Resultado de las citas/agendamientos
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  agendamiento_id UUID REFERENCES crm_agendamientos(id) ON DELETE SET NULL,
  
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Resultado de la cita
  resultado TEXT NOT NULL CHECK (resultado IN (
    'exitosa',       -- Se logró el objetivo
    'en_proceso',    -- Interesado pero no cerró
    'reprogramada',  -- Pidió otra fecha
    'no_asistio',    -- El cliente no llegó
    'cancelada'      -- Se canceló
  )),
  
  se_concreto_venta BOOLEAN DEFAULT false,
  detalles TEXT,
  
  -- Próximos pasos
  requiere_seguimiento BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. CRM_VENTAS (Plan de Negocio)
-- Sistema flexible de pagos: contado o cuotas
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Descripción del producto/servicio vendido
  descripcion TEXT NOT NULL,
  producto_id UUID, -- Opcional, referencia a inventario si aplica
  
  -- Tipo de pago
  tipo_pago TEXT NOT NULL CHECK (tipo_pago IN ('contado', 'cuotas')),
  
  -- Montos (flexible según tipo de pago)
  monto_total DECIMAL(12,2) NOT NULL,
  monto_inicial DECIMAL(12,2) DEFAULT 0, -- Enganche/adelanto
  num_cuotas INTEGER DEFAULT 1,          -- 1 para contado
  monto_cuota DECIMAL(12,2),             -- Monto por cuota
  
  -- Fechas
  fecha_venta DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_inicio_cuotas DATE,              -- Cuándo empiezan las cuotas
  
  -- Estado de la venta
  estado TEXT DEFAULT 'activa' CHECK (estado IN (
    'activa',      -- En curso
    'completada',  -- Pagada totalmente
    'cancelada',   -- Se canceló
    'en_mora'      -- Tiene pagos atrasados
  )),
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. CRM_PAGOS_CUOTAS
-- Registro de pagos de cuotas
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_pagos_cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venta_id UUID NOT NULL REFERENCES crm_ventas(id) ON DELETE CASCADE,
  
  numero_cuota INTEGER NOT NULL,
  monto_pagado DECIMAL(12,2) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  
  estado TEXT DEFAULT 'pagada' CHECK (estado IN (
    'pagada',
    'pendiente',
    'vencida',
    'parcial'
  )),
  
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. CRM_TESTIMONIOS
-- Conformidad o logros del producto
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_testimonios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL CHECK (tipo IN ('conformidad', 'logro')),
  texto TEXT NOT NULL,
  
  -- Opcional: vincular a una venta
  venta_id UUID REFERENCES crm_ventas(id) ON DELETE SET NULL,
  
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  destacado BOOLEAN DEFAULT false, -- Para mostrar en lugar prominente
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. CRM_NO_COMPRAS
-- Registro de clientes que no compraron
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_no_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  motivo TEXT NOT NULL CHECK (motivo IN (
    'precio',           -- Muy caro
    'no_interesado',    -- No le interesa el producto
    'competencia',      -- Eligió otra opción
    'timing',           -- No es el momento
    'sin_recursos',     -- No tiene dinero ahora
    'desconfianza',     -- No confía en el producto/vendedor
    'otro'
  )),
  
  detalle TEXT, -- Explicación adicional
  
  -- Posibilidad de recontacto
  recontactar BOOLEAN DEFAULT true,
  fecha_recontacto DATE, -- Cuándo intentar de nuevo
  
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 9. CRM_REVISITAS
-- Evaluación de satisfacción post-venta
-- =====================================================
CREATE TABLE IF NOT EXISTS crm_revisitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Vincular a venta si aplica
  venta_id UUID REFERENCES crm_ventas(id) ON DELETE SET NULL,
  
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Nivel de satisfacción (1-5 estrellas)
  satisfaccion INTEGER NOT NULL CHECK (satisfaccion >= 1 AND satisfaccion <= 5),
  
  -- Feedback del cliente
  comentarios TEXT,
  
  -- Indicadores
  recomendaria BOOLEAN, -- ¿Nos recomendaría?
  compraria_de_nuevo BOOLEAN, -- ¿Compraría de nuevo?
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDICES PARA PERFORMANCE
-- =====================================================

-- Interacciones
CREATE INDEX IF NOT EXISTS idx_crm_interacciones_user ON crm_interacciones(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_interacciones_perfil ON crm_interacciones(perfil_id);
CREATE INDEX IF NOT EXISTS idx_crm_interacciones_cliente ON crm_interacciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_interacciones_clasificacion ON crm_interacciones(clasificacion);

-- Seguimientos
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_user ON crm_seguimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_perfil ON crm_seguimientos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_cliente ON crm_seguimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_seguimientos_recordatorio ON crm_seguimientos(recordatorio_fecha) 
  WHERE recordatorio_completado = false;

-- Agendamientos
CREATE INDEX IF NOT EXISTS idx_crm_agendamientos_user ON crm_agendamientos(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_agendamientos_perfil ON crm_agendamientos(perfil_id);
CREATE INDEX IF NOT EXISTS idx_crm_agendamientos_cliente ON crm_agendamientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_agendamientos_fecha ON crm_agendamientos(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_crm_agendamientos_estado ON crm_agendamientos(estado);

-- Citas
CREATE INDEX IF NOT EXISTS idx_crm_citas_user ON crm_citas(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_citas_perfil ON crm_citas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_crm_citas_cliente ON crm_citas(cliente_id);

-- Ventas
CREATE INDEX IF NOT EXISTS idx_crm_ventas_user ON crm_ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_ventas_perfil ON crm_ventas(perfil_id);
CREATE INDEX IF NOT EXISTS idx_crm_ventas_cliente ON crm_ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_ventas_estado ON crm_ventas(estado);

-- Pagos de cuotas
CREATE INDEX IF NOT EXISTS idx_crm_pagos_venta ON crm_pagos_cuotas(venta_id);
CREATE INDEX IF NOT EXISTS idx_crm_pagos_estado ON crm_pagos_cuotas(estado);

-- Testimonios
CREATE INDEX IF NOT EXISTS idx_crm_testimonios_user ON crm_testimonios(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_testimonios_cliente ON crm_testimonios(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_testimonios_destacado ON crm_testimonios(destacado) WHERE destacado = true;

-- No compras
CREATE INDEX IF NOT EXISTS idx_crm_no_compras_user ON crm_no_compras(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_no_compras_cliente ON crm_no_compras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_no_compras_recontactar ON crm_no_compras(fecha_recontacto) 
  WHERE recontactar = true;

-- Revisitas
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_user ON crm_revisitas(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_cliente ON crm_revisitas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_satisfaccion ON crm_revisitas(satisfaccion);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE crm_interacciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_agendamientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pagos_cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_testimonios ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_no_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_revisitas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cada tabla

-- CRM_INTERACCIONES
CREATE POLICY "Users can view own crm_interacciones"
ON crm_interacciones FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_interacciones"
ON crm_interacciones FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_interacciones"
ON crm_interacciones FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_interacciones"
ON crm_interacciones FOR DELETE USING (auth.uid() = user_id);

-- CRM_SEGUIMIENTOS
CREATE POLICY "Users can view own crm_seguimientos"
ON crm_seguimientos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_seguimientos"
ON crm_seguimientos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_seguimientos"
ON crm_seguimientos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_seguimientos"
ON crm_seguimientos FOR DELETE USING (auth.uid() = user_id);

-- CRM_AGENDAMIENTOS
CREATE POLICY "Users can view own crm_agendamientos"
ON crm_agendamientos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_agendamientos"
ON crm_agendamientos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_agendamientos"
ON crm_agendamientos FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_agendamientos"
ON crm_agendamientos FOR DELETE USING (auth.uid() = user_id);

-- CRM_CITAS
CREATE POLICY "Users can view own crm_citas"
ON crm_citas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_citas"
ON crm_citas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_citas"
ON crm_citas FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_citas"
ON crm_citas FOR DELETE USING (auth.uid() = user_id);

-- CRM_VENTAS
CREATE POLICY "Users can view own crm_ventas"
ON crm_ventas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_ventas"
ON crm_ventas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_ventas"
ON crm_ventas FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_ventas"
ON crm_ventas FOR DELETE USING (auth.uid() = user_id);

-- CRM_PAGOS_CUOTAS
CREATE POLICY "Users can view own crm_pagos_cuotas"
ON crm_pagos_cuotas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_pagos_cuotas"
ON crm_pagos_cuotas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_pagos_cuotas"
ON crm_pagos_cuotas FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_pagos_cuotas"
ON crm_pagos_cuotas FOR DELETE USING (auth.uid() = user_id);

-- CRM_TESTIMONIOS
CREATE POLICY "Users can view own crm_testimonios"
ON crm_testimonios FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_testimonios"
ON crm_testimonios FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_testimonios"
ON crm_testimonios FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_testimonios"
ON crm_testimonios FOR DELETE USING (auth.uid() = user_id);

-- CRM_NO_COMPRAS
CREATE POLICY "Users can view own crm_no_compras"
ON crm_no_compras FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_no_compras"
ON crm_no_compras FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_no_compras"
ON crm_no_compras FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_no_compras"
ON crm_no_compras FOR DELETE USING (auth.uid() = user_id);

-- CRM_REVISITAS
CREATE POLICY "Users can view own crm_revisitas"
ON crm_revisitas FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crm_revisitas"
ON crm_revisitas FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crm_revisitas"
ON crm_revisitas FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own crm_revisitas"
ON crm_revisitas FOR DELETE USING (auth.uid() = user_id);
