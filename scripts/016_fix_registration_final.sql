-- SOLUCIÓN DEFINITIVA: Eliminar el trigger problemático que bloquea el registro
-- Este script elimina on_auth_user_created (que falla) y mantiene on_auth_user_created_perfil (que funciona)

-- PASO 1: Eliminar el trigger y función problemáticos de script 003
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- PASO 2: Verificar que el trigger correcto existe (el de perfiles personal/empresarial)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_perfil'
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    RAISE NOTICE 'ADVERTENCIA: El trigger on_auth_user_created_perfil no existe. Ejecuta el script 008_create_perfiles_system_v2.sql';
  ELSE
    RAISE NOTICE 'OK: El trigger on_auth_user_created_perfil existe y funcionará correctamente';
  END IF;
END $$;

-- PASO 3: Actualizar la política RLS de profiles para permitir creación lazy
DROP POLICY IF EXISTS "Los usuarios pueden crear su propio perfil" ON profiles;
DROP POLICY IF EXISTS "Permitir inserción de perfil por usuario o trigger" ON profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON profiles;

CREATE POLICY "Los usuarios pueden crear su propio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- PASO 4: Verificación final
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
  AND tgname LIKE '%auth_user_created%';
  
  RAISE NOTICE 'Triggers activos en auth.users: %', trigger_count;
  RAISE NOTICE 'Debería haber exactamente 1 trigger (on_auth_user_created_perfil)';
  
  IF trigger_count = 1 THEN
    RAISE NOTICE '✓ CORRECTO: Solo existe el trigger de perfiles';
  ELSIF trigger_count = 0 THEN
    RAISE NOTICE '✗ ERROR: No hay triggers. Ejecuta script 008';
  ELSE
    RAISE NOTICE '✗ ERROR: Hay múltiples triggers. Revisa la configuración';
  END IF;
END $$;
