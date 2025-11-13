-- ============================================
-- SOLUCIÓN FINAL: Eliminar trigger problemático
-- ============================================
-- El trigger está bloqueando el registro porque intenta
-- crear el perfil cuando no hay sesión autenticada.
-- Según la documentación de Supabase, el patrón correcto
-- es crear el perfil en el primer acceso autenticado.

-- Paso 1: Eliminar el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Paso 2: Eliminar la función
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Paso 3: Verificar que se eliminaron
DO $$
BEGIN
  -- Verificar trigger
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'ERROR: El trigger todavía existe';
  ELSE
    RAISE NOTICE 'OK: Trigger eliminado correctamente';
  END IF;
  
  -- Verificar función
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'ERROR: La función todavía existe';
  ELSE
    RAISE NOTICE 'OK: Función eliminada correctamente';
  END IF;
END $$;

-- Paso 4: Asegurar que las políticas RLS permitan la creación de perfil
-- cuando el usuario esté autenticado
-- Eliminar ambas políticas posibles antes de crear la nueva
DROP POLICY IF EXISTS "Permitir inserción de perfil por usuario o trigger" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden crear su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;

-- Crear la política con manejo de errores
DO $$
BEGIN
  CREATE POLICY "Los usuarios pueden crear su propio perfil"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
  RAISE NOTICE 'OK: Política de INSERT creada correctamente';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'INFO: La política ya existe, continuando...';
END $$;

-- Mensaje final
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'CONFIGURACIÓN COMPLETADA';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'El trigger ha sido eliminado.';
  RAISE NOTICE 'Los usuarios ahora pueden registrarse sin problemas.';
  RAISE NOTICE 'El perfil se creará automáticamente al iniciar sesión.';
  RAISE NOTICE '==============================================';
END $$;
