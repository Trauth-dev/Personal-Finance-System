-- Script para corregir las políticas RLS de la tabla profiles
-- Esto permite que el trigger handle_new_user() funcione correctamente

-- Eliminar la política INSERT existente que está bloqueando el trigger
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON profiles;

-- Crear una nueva política INSERT que permita:
-- 1. Que los usuarios inserten su propio perfil (auth.uid() = id)
-- 2. Que el trigger pueda insertar (cuando auth.uid() es NULL)
CREATE POLICY "Permitir inserción de perfil por usuario o trigger"
ON profiles
FOR INSERT
WITH CHECK (
  -- Permitir si el usuario está autenticado y el ID coincide
  (auth.uid() = id)
  OR
  -- Permitir si auth.uid() es NULL (durante ejecución del trigger)
  (auth.uid() IS NULL)
);

-- Verificar que el trigger existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'ADVERTENCIA: El trigger on_auth_user_created no existe. Ejecuta el script 003_create_profile_trigger.sql primero.';
  END IF;
END $$;

-- Verificar que la función del trigger existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'ADVERTENCIA: La función handle_new_user() no existe. Ejecuta el script 003_create_profile_trigger.sql primero.';
  END IF;
END $$;
