-- Migrar datos existentes y crear ambos perfiles por defecto
-- Este script asigna todos los datos existentes al perfil "Personal" de cada usuario
-- y crea el perfil "Empresarial" si no existe.

DO $$
DECLARE
  user_record RECORD;
  perfil_personal_id UUID;
  perfil_empresarial_id UUID;
BEGIN
  -- Para cada usuario existente
  FOR user_record IN 
    SELECT DISTINCT user_id FROM ingresos
    UNION
    SELECT DISTINCT user_id FROM egresos
    UNION
    SELECT DISTINCT user_id FROM tipos_categoria_egreso
    UNION
    SELECT DISTINCT user_id FROM categorias_egreso
    UNION
    SELECT DISTINCT user_id FROM categorias_ingresos
  LOOP
    -- Crear o buscar perfil Personal
    SELECT id INTO perfil_personal_id
    FROM perfiles
    WHERE user_id = user_record.user_id AND tipo = 'personal'
    LIMIT 1;

    IF perfil_personal_id IS NULL THEN
      INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
      VALUES (user_record.user_id, 'Personal', 'personal', '#3b82f6', '👤')
      RETURNING id INTO perfil_personal_id;
    END IF;

    -- Crear o buscar perfil Empresarial
    SELECT id INTO perfil_empresarial_id
    FROM perfiles
    WHERE user_id = user_record.user_id AND tipo = 'empresarial'
    LIMIT 1;

    IF perfil_empresarial_id IS NULL THEN
      INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
      VALUES (user_record.user_id, 'Empresarial', 'empresarial', '#8b5cf6', '🏢')
      RETURNING id INTO perfil_empresarial_id;
    END IF;

    -- Asignar todos los datos existentes al perfil Personal
    UPDATE ingresos
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE egresos
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE tipos_categoria_egreso
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE categorias_egreso
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE categorias_ingresos
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE categorias_egresos_vivienda
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE categorias_egresos_varios
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    UPDATE presupuesto_mensual
    SET perfil_id = perfil_personal_id
    WHERE user_id = user_record.user_id AND perfil_id IS NULL;

    -- Asignar datos existentes al perfil Empresarial si es necesario
    -- (Este código puede ser añadido en el futuro según las necesidades)

  END LOOP;
END $$;
