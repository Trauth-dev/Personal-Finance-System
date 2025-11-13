-- Agregando manejo de errores robusto al trigger
-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar perfil con manejo de errores
  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      -- Log el error pero no fallar el registro
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Trigger que ejecuta la función al crear un usuario
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
