-- Script completo para configurar el sistema de perfiles
-- Este script verifica y crea todo lo necesario para que el registro funcione

-- PASO 1: Asegurar que la tabla profiles existe con la estructura correcta
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASO 3: Eliminar políticas antiguas y crear las correctas
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil por usuario o trigger" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

-- Política SELECT
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Política INSERT que permite tanto usuario como trigger
CREATE POLICY "Permitir inserción de perfil por usuario o trigger"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = id OR auth.uid() IS NULL
  );

-- Política UPDATE
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- PASO 4: Crear o reemplazar la función del trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil con manejo robusto de errores
  INSERT INTO public.profiles (id, email, nombre_completo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre_completo', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    nombre_completo = COALESCE(EXCLUDED.nombre_completo, public.profiles.nombre_completo);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Si hay cualquier error, registrarlo pero permitir que el registro continúe
    RAISE WARNING 'Error en handle_new_user para %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- PASO 5: Eliminar trigger antiguo si existe y crear uno nuevo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 6: Verificación
DO $$
BEGIN
  -- Verificar que el trigger existe
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger on_auth_user_created creado correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error: El trigger no se creó correctamente';
  END IF;

  -- Verificar que la función existe
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE '✓ Función handle_new_user() creada correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error: La función no se creó correctamente';
  END IF;

  -- Verificar que las políticas existen
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Permitir inserción de perfil por usuario o trigger'
  ) THEN
    RAISE NOTICE '✓ Política de INSERT creada correctamente';
  ELSE
    RAISE EXCEPTION '✗ Error: La política de INSERT no se creó correctamente';
  END IF;

  RAISE NOTICE '✓ Configuración completa exitosa. El registro de usuarios debería funcionar ahora.';
END $$;
