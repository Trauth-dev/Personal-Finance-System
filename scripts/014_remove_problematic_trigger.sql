-- =====================================================
-- SCRIPT 014: ELIMINAR TRIGGER PROBLEMÁTICO
-- =====================================================
-- Este script elimina el trigger que está causando
-- el error "Database error saving new user"
-- =====================================================

-- Eliminar el trigger si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Eliminar la función del trigger si existe
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Verificar que se eliminaron correctamente
DO $$
BEGIN
  -- Verificar que el trigger no existe
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE EXCEPTION 'ERROR: El trigger on_auth_user_created todavía existe';
  ELSE
    RAISE NOTICE 'OK: El trigger on_auth_user_created fue eliminado correctamente';
  END IF;

  -- Verificar que la función no existe
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'ERROR: La función handle_new_user todavía existe';
  ELSE
    RAISE NOTICE 'OK: La función handle_new_user fue eliminada correctamente';
  END IF;
END $$;

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- Después de ejecutar este script:
-- 1. Los usuarios podrán registrarse sin errores
-- 2. El perfil se creará automáticamente cuando
--    el usuario inicie sesión por primera vez
-- 3. Esto se maneja en app/dashboard/layout.tsx
-- =====================================================
