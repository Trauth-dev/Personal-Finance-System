-- =====================================================
-- Script 031: Otorgar acceso CRM a usuarios existentes
-- =====================================================
-- Este script:
-- 1. Otorga acceso al plan 'crm' a todos los usuarios existentes
-- 2. Crea un perfil CRM por defecto para cada usuario
-- =====================================================

-- 1. Otorgar acceso CRM a todos los usuarios que aún no lo tienen
INSERT INTO user_plan_access (user_id, plan_type, is_active, granted_by)
SELECT DISTINCT u.id, 'crm', true, 'migration_031'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_plan_access upa 
  WHERE upa.user_id = u.id AND upa.plan_type = 'crm'
)
ON CONFLICT (user_id, plan_type) DO NOTHING;

-- 2. Crear perfil CRM por defecto para usuarios que no lo tienen
INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
SELECT DISTINCT u.id, 'Mi CRM', 'crm', '#06B6D4', '👥'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM perfiles p 
  WHERE p.user_id = u.id AND p.tipo = 'crm'
)
ON CONFLICT DO NOTHING;

-- Verificar resultados
DO $$
DECLARE
  access_count INTEGER;
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO access_count FROM user_plan_access WHERE plan_type = 'crm';
  SELECT COUNT(*) INTO profile_count FROM perfiles WHERE tipo = 'crm';
  
  RAISE NOTICE 'Accesos CRM otorgados: %', access_count;
  RAISE NOTICE 'Perfiles CRM creados: %', profile_count;
END $$;
