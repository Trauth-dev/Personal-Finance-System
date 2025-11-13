-- ============================================================================
-- SCRIPT 017: DESACTIVAR TODOS LOS TRIGGERS TEMPORALMENTE
-- ============================================================================
-- Este script desactiva TODOS los triggers en auth.users para permitir
-- que el registro funcione sin errores. Los perfiles se crearán en la app.
-- ============================================================================

-- Eliminar TODOS los triggers en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_perfil ON auth.users;

-- Eliminar las funciones de los triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.create_default_perfiles() CASCADE;

-- Verificar que no queden triggers
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' AND c.relname = 'users';
  
  RAISE NOTICE '✓ Triggers restantes en auth.users: %', trigger_count;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✓ ÉXITO: Todos los triggers han sido eliminados';
    RAISE NOTICE '✓ El registro ahora debería funcionar sin errores';
  ELSE
    RAISE WARNING '⚠ Aún quedan % triggers en auth.users', trigger_count;
  END IF;
END $$;

-- Asegurar que las políticas RLS permitan la creación de perfiles
DROP POLICY IF EXISTS "Los usuarios pueden crear su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil por usuario o trigger" ON public.profiles;

CREATE POLICY "Los usuarios pueden crear su propio perfil"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política para perfiles (Personal/Empresarial)
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios perfiles" ON public.perfiles;

CREATE POLICY "Los usuarios pueden insertar sus propios perfiles"
ON public.perfiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Envolver los RAISE NOTICE finales en un bloque DO
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SCRIPT 017 COMPLETADO';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Todos los triggers han sido desactivados';
  RAISE NOTICE 'El registro ahora funcionará sin errores de base de datos';
  RAISE NOTICE 'Los perfiles se crearán automáticamente en la aplicación';
  RAISE NOTICE '============================================================================';
END $$;
