-- =============================================
-- SISTEMA DE RE-VISITAS (Posventa)
-- Vinculado con seguimientos de mantenimiento
-- =============================================

-- Eliminar tablas si existen (para recrear limpio)
DROP TABLE IF EXISTS crm_revisitas_sugeridas CASCADE;
DROP TABLE IF EXISTS crm_revisitas CASCADE;

-- Tabla principal de re-visitas
CREATE TABLE crm_revisitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES perfiles_empresariales(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES inventario(id) ON DELETE SET NULL,
  seguimiento_id UUID REFERENCES crm_seguimientos(id) ON DELETE SET NULL,
  
  -- Tipo de re-visita
  tipo VARCHAR(20) NOT NULL DEFAULT 'presencial' CHECK (tipo IN ('presencial', 'virtual', 'llamada')),
  
  -- Motivo de la re-visita
  motivo VARCHAR(50) NOT NULL DEFAULT 'mantenimiento' CHECK (motivo IN (
    'mantenimiento',
    'revision_producto',
    'venta_cruzada',
    'reclamo',
    'capacitacion',
    'otro'
  )),
  motivo_detalle TEXT,
  
  -- Programacion
  fecha_programada DATE NOT NULL,
  hora_programada TIME,
  duracion_estimada_minutos INTEGER DEFAULT 30,
  
  -- Estado y resultado
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente',
    'confirmada',
    'en_progreso',
    'completada',
    'cancelada',
    'reprogramada'
  )),
  
  -- Resultado de la visita
  resultado_visita VARCHAR(30) CHECK (resultado_visita IN (
    'exitosa',
    'parcial',
    'cliente_ausente',
    'reprogramar',
    'sin_resultado'
  )),
  
  -- Oportunidades detectadas
  oportunidad_venta BOOLEAN DEFAULT false,
  oportunidad_detalle TEXT,
  
  -- Notas
  notas TEXT,
  notas_resultado TEXT,
  
  -- Generacion automatica
  generada_automaticamente BOOLEAN DEFAULT false,
  confirmada_por_usuario BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_completada TIMESTAMP WITH TIME ZONE
);

-- Tabla para sugerencias de re-visitas automaticas (pendientes de confirmacion)
CREATE TABLE crm_revisitas_sugeridas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID REFERENCES perfiles_empresariales(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES inventario(id) ON DELETE SET NULL,
  seguimiento_id UUID REFERENCES crm_seguimientos(id) ON DELETE SET NULL,
  
  motivo VARCHAR(50) NOT NULL,
  motivo_detalle TEXT,
  fecha_sugerida DATE NOT NULL,
  
  -- Estado de la sugerencia
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente',
    'aceptada',
    'rechazada',
    'pospuesta'
  )),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  respondida_at TIMESTAMP WITH TIME ZONE
);

-- Indices para performance
CREATE INDEX idx_revisitas_user_id ON crm_revisitas(user_id);
CREATE INDEX idx_revisitas_perfil_id ON crm_revisitas(perfil_id);
CREATE INDEX idx_revisitas_cliente_id ON crm_revisitas(cliente_id);
CREATE INDEX idx_revisitas_fecha ON crm_revisitas(fecha_programada);
CREATE INDEX idx_revisitas_estado ON crm_revisitas(estado);
CREATE INDEX idx_revisitas_seguimiento ON crm_revisitas(seguimiento_id);

CREATE INDEX idx_revisitas_sugeridas_user ON crm_revisitas_sugeridas(user_id);
CREATE INDEX idx_revisitas_sugeridas_estado ON crm_revisitas_sugeridas(estado);

-- Habilitar RLS
ALTER TABLE crm_revisitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_revisitas_sugeridas ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
CREATE POLICY "Users can manage own revisitas" ON crm_revisitas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sugerencias" ON crm_revisitas_sugeridas
  FOR ALL USING (auth.uid() = user_id);
