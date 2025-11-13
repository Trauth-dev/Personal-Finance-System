-- Habilitar Row Level Security en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_mensual ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_ingresos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_categoria_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_egreso ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de crearlas

-- Políticas para profiles
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR 
    -- Permitir inserts desde el trigger (cuando auth.uid() es NULL)
    auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para ingresos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios ingresos" ON public.ingresos;
CREATE POLICY "Los usuarios pueden ver sus propios ingresos"
  ON public.ingresos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios ingresos" ON public.ingresos;
CREATE POLICY "Los usuarios pueden insertar sus propios ingresos"
  ON public.ingresos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios ingresos" ON public.ingresos;
CREATE POLICY "Los usuarios pueden actualizar sus propios ingresos"
  ON public.ingresos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios ingresos" ON public.ingresos;
CREATE POLICY "Los usuarios pueden eliminar sus propios ingresos"
  ON public.ingresos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para egresos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios egresos" ON public.egresos;
CREATE POLICY "Los usuarios pueden ver sus propios egresos"
  ON public.egresos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios egresos" ON public.egresos;
CREATE POLICY "Los usuarios pueden insertar sus propios egresos"
  ON public.egresos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios egresos" ON public.egresos;
CREATE POLICY "Los usuarios pueden actualizar sus propios egresos"
  ON public.egresos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios egresos" ON public.egresos;
CREATE POLICY "Los usuarios pueden eliminar sus propios egresos"
  ON public.egresos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para presupuesto_mensual
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio presupuesto" ON public.presupuesto_mensual;
CREATE POLICY "Los usuarios pueden ver su propio presupuesto"
  ON public.presupuesto_mensual FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio presupuesto" ON public.presupuesto_mensual;
CREATE POLICY "Los usuarios pueden insertar su propio presupuesto"
  ON public.presupuesto_mensual FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio presupuesto" ON public.presupuesto_mensual;
CREATE POLICY "Los usuarios pueden actualizar su propio presupuesto"
  ON public.presupuesto_mensual FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar su propio presupuesto" ON public.presupuesto_mensual;
CREATE POLICY "Los usuarios pueden eliminar su propio presupuesto"
  ON public.presupuesto_mensual FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para categorias_ingresos
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias categorías de ingresos" ON public.categorias_ingresos;
CREATE POLICY "Los usuarios pueden ver sus propias categorías de ingresos"
  ON public.categorias_ingresos FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias categorías de ingresos" ON public.categorias_ingresos;
CREATE POLICY "Los usuarios pueden insertar sus propias categorías de ingresos"
  ON public.categorias_ingresos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias categorías de ingresos" ON public.categorias_ingresos;
CREATE POLICY "Los usuarios pueden actualizar sus propias categorías de ingresos"
  ON public.categorias_ingresos FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias categorías de ingresos" ON public.categorias_ingresos;
CREATE POLICY "Los usuarios pueden eliminar sus propias categorías de ingresos"
  ON public.categorias_ingresos FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para tipos_categoria_egreso
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios tipos de categoría" ON public.tipos_categoria_egreso;
CREATE POLICY "Los usuarios pueden ver sus propios tipos de categoría"
  ON public.tipos_categoria_egreso FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios tipos de categoría" ON public.tipos_categoria_egreso;
CREATE POLICY "Los usuarios pueden insertar sus propios tipos de categoría"
  ON public.tipos_categoria_egreso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios tipos de categoría" ON public.tipos_categoria_egreso;
CREATE POLICY "Los usuarios pueden actualizar sus propios tipos de categoría"
  ON public.tipos_categoria_egreso FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios tipos de categoría" ON public.tipos_categoria_egreso;
CREATE POLICY "Los usuarios pueden eliminar sus propios tipos de categoría"
  ON public.tipos_categoria_egreso FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para categorias_egreso
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias categorías de egreso" ON public.categorias_egreso;
CREATE POLICY "Los usuarios pueden ver sus propias categorías de egreso"
  ON public.categorias_egreso FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias categorías de egreso" ON public.categorias_egreso;
CREATE POLICY "Los usuarios pueden insertar sus propias categorías de egreso"
  ON public.categorias_egreso FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias categorías de egreso" ON public.categorias_egreso;
CREATE POLICY "Los usuarios pueden actualizar sus propias categorías de egreso"
  ON public.categorias_egreso FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias categorías de egreso" ON public.categorias_egreso;
CREATE POLICY "Los usuarios pueden eliminar sus propias categorías de egreso"
  ON public.categorias_egreso FOR DELETE
  USING (auth.uid() = user_id);
