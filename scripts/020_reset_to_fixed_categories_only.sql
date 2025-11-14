-- Script para RESETEAR y dejar ÚNICAMENTE las 9 categorías predeterminadas
-- Este script elimina TODAS las categorías personalizadas existentes
-- y deja solo las 9 categorías fijas para cada perfil Personal

-- PASO 1: Eliminar TODAS las categorías personalizadas existentes
-- Esto también eliminará las descripciones asociadas debido a CASCADE
DO $$
DECLARE
  perfil RECORD;
BEGIN
  FOR perfil IN SELECT * FROM perfiles WHERE tipo = 'personal'
  LOOP
    -- Eliminar TODAS las categorías existentes de este perfil
    DELETE FROM tipos_categoria_egreso
    WHERE perfil_id = perfil.id;
    
    -- Eliminar TODAS las descripciones/subcategorías de este perfil
    DELETE FROM categorias_egreso
    WHERE perfil_id = perfil.id;
    
    -- Insertar ÚNICAMENTE las 9 categorías predeterminadas
    INSERT INTO tipos_categoria_egreso (user_id, perfil_id, nombre, color)
    VALUES 
      (perfil.user_id, perfil.id, 'Donación', '#10b981'),
      (perfil.user_id, perfil.id, 'Ahorro 2025', '#3b82f6'),
      (perfil.user_id, perfil.id, 'Gastos Varios', '#a855f7'),
      (perfil.user_id, perfil.id, 'Gastos Fijos', '#ef4444'),
      (perfil.user_id, perfil.id, 'Pago Deudas', '#f97316'),
      (perfil.user_id, perfil.id, 'Disfrute', '#ec4899'),
      (perfil.user_id, perfil.id, 'Educación', '#06b6d4'),
      (perfil.user_id, perfil.id, 'Sueños', '#eab308'),
      (perfil.user_id, perfil.id, 'Libertad Financiera', '#10b981');
      
    RAISE NOTICE 'Categorías reseteadas para perfil: %', perfil.nombre;
  END LOOP;
END $$;

-- PASO 2: Actualizar la función trigger para futuros perfiles
-- Esta función se ejecutará automáticamente cuando se cree un nuevo perfil Personal
CREATE OR REPLACE FUNCTION crear_categorias_predeterminadas_personal()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo aplicar para perfil tipo 'personal'
  IF NEW.tipo = 'personal' THEN
    -- Insertar los 9 tipos de categoría predeterminados
    INSERT INTO tipos_categoria_egreso (user_id, perfil_id, nombre, color)
    VALUES 
      (NEW.user_id, NEW.id, 'Donación', '#10b981'),
      (NEW.user_id, NEW.id, 'Ahorro 2025', '#3b82f6'),
      (NEW.user_id, NEW.id, 'Gastos Varios', '#a855f7'),
      (NEW.user_id, NEW.id, 'Gastos Fijos', '#ef4444'),
      (NEW.user_id, NEW.id, 'Pago Deudas', '#f97316'),
      (NEW.user_id, NEW.id, 'Disfrute', '#ec4899'),
      (NEW.user_id, NEW.id, 'Educación', '#06b6d4'),
      (NEW.user_id, NEW.id, 'Sueños', '#eab308'),
      (NEW.user_id, NEW.id, 'Libertad Financiera', '#10b981');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 3: Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS trigger_crear_categorias_predeterminadas_personal ON perfiles;
CREATE TRIGGER trigger_crear_categorias_predeterminadas_personal
  AFTER INSERT ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION crear_categorias_predeterminadas_personal();

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✓ Todas las categorías personalizadas han sido eliminadas';
  RAISE NOTICE '✓ Se han creado las 9 categorías predeterminadas para todos los perfiles Personal';
  RAISE NOTICE '✓ El trigger está configurado para futuros perfiles';
END $$;
