-- Script para crear las 9 categorías predeterminadas y fijas
-- Estas categorías se crearán automáticamente para cada usuario que se registre

-- Función para crear las categorías predeterminadas cuando se crea un perfil Personal
CREATE OR REPLACE FUNCTION crear_categorias_predeterminadas_personal()
RETURNS TRIGGER AS $$
DECLARE
  v_tipo_donacion UUID;
  v_tipo_ahorro UUID;
  v_tipo_gastos_varios UUID;
  v_tipo_gastos_fijos UUID;
  v_tipo_pago_deudas UUID;
  v_tipo_disfrute UUID;
  v_tipo_educacion UUID;
  v_tipo_suenos UUID;
  v_tipo_libertad UUID;
BEGIN
  -- Solo aplicar para perfil tipo 'personal'
  IF NEW.tipo = 'personal' THEN
    -- Insertar los 9 tipos de categoría predeterminados
    INSERT INTO tipos_categoria_egreso (user_id, perfil_id, nombre, color)
    VALUES 
      (NEW.user_id, NEW.id, 'Donacion', '#10b981'),
      (NEW.user_id, NEW.id, 'Ahorro', '#3b82f6'),
      (NEW.user_id, NEW.id, 'Gastos Varios', '#a855f7'),
      (NEW.user_id, NEW.id, 'Gastos Vivienda', '#ef4444'),
      (NEW.user_id, NEW.id, 'Pago Deudas', '#f97316'),
      (NEW.user_id, NEW.id, 'Disfrute', '#ec4899'),
      (NEW.user_id, NEW.id, 'Educacion', '#06b6d4'),
      (NEW.user_id, NEW.id, 'Suenos', '#eab308'),
      (NEW.user_id, NEW.id, 'Libertad Financiera', '#10b981');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DROP TRIGGER IF EXISTS trigger_crear_categorias_predeterminadas_personal ON perfiles;
CREATE TRIGGER trigger_crear_categorias_predeterminadas_personal
  AFTER INSERT ON perfiles
  FOR EACH ROW
  EXECUTE FUNCTION crear_categorias_predeterminadas_personal();

-- Crear las categorías para perfiles Personal existentes que no las tengan
DO $$
DECLARE
  perfil RECORD;
  categoria_count INTEGER;
BEGIN
  FOR perfil IN SELECT * FROM perfiles WHERE tipo = 'personal'
  LOOP
    -- Verificar si ya tiene categorías
    SELECT COUNT(*) INTO categoria_count
    FROM tipos_categoria_egreso
    WHERE perfil_id = perfil.id;
    
    -- Si no tiene categorías, crearlas
    IF categoria_count = 0 THEN
      INSERT INTO tipos_categoria_egreso (user_id, perfil_id, nombre, color)
      VALUES 
        (perfil.user_id, perfil.id, 'Donacion', '#10b981'),
        (perfil.user_id, perfil.id, 'Ahorro', '#3b82f6'),
        (perfil.user_id, perfil.id, 'Gastos Varios', '#a855f7'),
        (perfil.user_id, perfil.id, 'Gastos Vivienda', '#ef4444'),
        (perfil.user_id, perfil.id, 'Pago Deudas', '#f97316'),
        (perfil.user_id, perfil.id, 'Disfrute', '#ec4899'),
        (perfil.user_id, perfil.id, 'Educacion', '#06b6d4'),
        (perfil.user_id, perfil.id, 'Suenos', '#eab308'),
        (perfil.user_id, perfil.id, 'Libertad Financiera', '#10b981');
    END IF;
  END LOOP;
END $$;
