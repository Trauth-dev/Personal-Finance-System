-- Tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tablas para categorías personalizadas por usuario
CREATE TABLE IF NOT EXISTS public.categorias_ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nombre)
);

-- Nueva estructura para categorías de egresos completamente personalizables
-- Tabla de tipos de categoría (ej: Vivienda, Transporte, Comida, etc.)
CREATE TABLE IF NOT EXISTS public.tipos_categoria_egreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6', -- Color en formato hex
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, nombre)
);

-- Tabla de subcategorías dentro de cada tipo
CREATE TABLE IF NOT EXISTS public.categorias_egreso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_categoria_id UUID NOT NULL REFERENCES public.tipos_categoria_egreso(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tipo_categoria_id, nombre)
);

-- Tabla de ingresos (sin restricciones CHECK para permitir categorías personalizadas)
CREATE TABLE IF NOT EXISTS public.ingresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_ingreso TEXT NOT NULL,
  monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de egresos actualizada para usar el nuevo sistema de categorías flexible
CREATE TABLE IF NOT EXISTS public.egresos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_categoria_id UUID NOT NULL REFERENCES public.tipos_categoria_egreso(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias_egreso(id) ON DELETE CASCADE,
  monto DECIMAL(12, 2) NOT NULL CHECK (monto > 0),
  fecha DATE NOT NULL,
  concepto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de presupuesto mensual
CREATE TABLE IF NOT EXISTS public.presupuesto_mensual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meta_salario DECIMAL(12, 2) NOT NULL CHECK (meta_salario > 0),
  fecha DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fecha)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_ingresos_user_fecha ON public.ingresos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_egresos_user_fecha ON public.egresos(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_presupuesto_user_fecha ON public.presupuesto_mensual(user_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_categorias_ingresos_user ON public.categorias_ingresos(user_id);
CREATE INDEX IF NOT EXISTS idx_tipos_categoria_egreso_user ON public.tipos_categoria_egreso(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_egreso_user ON public.categorias_egreso(user_id);
CREATE INDEX IF NOT EXISTS idx_categorias_egreso_tipo ON public.categorias_egreso(tipo_categoria_id);

-- Insertar categorías predeterminadas para nuevos usuarios (se ejecutará via trigger)
CREATE OR REPLACE FUNCTION insert_default_categories()
RETURNS TRIGGER AS $$
BEGIN
  -- Categorías de ingreso predeterminadas
  INSERT INTO public.categorias_ingresos (user_id, nombre) VALUES
    (NEW.id, 'Adelanto de Salario'),
    (NEW.id, 'Salario Total');
  
  -- Tipos de categoría de egreso predeterminados
  INSERT INTO public.tipos_categoria_egreso (user_id, nombre) VALUES
    (NEW.id, 'Vivienda'),
    (NEW.id, 'Transporte'),
    (NEW.id, 'Comida'),
    (NEW.id, 'Otros');
  
  -- Subcategorías de vivienda predeterminadas
  INSERT INTO public.categorias_egreso (user_id, tipo_categoria_id, nombre) VALUES
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Alquiler'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Claro'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Consulta Médica'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Essap'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Farmacia'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Internet + Cable'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Super'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Vivienda'), 'Tigo');
  
  -- Subcategorías de transporte predeterminadas
  INSERT INTO public.categorias_egreso (user_id, tipo_categoria_id, nombre) VALUES
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Transporte'), 'Gasolina'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Transporte'), 'Peaje'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Transporte'), 'Mantenimiento');
  
  -- Subcategorías de comida predeterminadas
  INSERT INTO public.categorias_egreso (user_id, tipo_categoria_id, nombre) VALUES
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Comida'), 'Supermercado'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Comida'), 'Restaurante'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Comida'), 'Delivery');
  
  -- Subcategorías de otros predeterminadas
  INSERT INTO public.categorias_egreso (user_id, tipo_categoria_id, nombre) VALUES
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Ahorro 2025'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Disfrute'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Donaciones'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Educación'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Libertad F'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Pago Deudas'),
    (NEW.id, (SELECT id FROM public.tipos_categoria_egreso WHERE user_id = NEW.id AND nombre = 'Otros'), 'Sueños');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
