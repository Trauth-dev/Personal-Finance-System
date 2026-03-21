-- ============================================
-- Sistema de Control de Acceso por Planes
-- ============================================
-- Esta tabla controla qué perfiles/planes puede
-- acceder cada usuario (personal, empresarial, crm)
-- ============================================

-- Crear tabla de acceso a planes
CREATE TABLE IF NOT EXISTS user_plan_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('personal', 'empresarial', 'crm')),
  is_active BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL = sin expiracion (para pagos futuros)
  granted_by TEXT DEFAULT 'manual', -- 'manual', 'stripe_payment', 'promotion', etc.
  notes TEXT, -- Notas opcionales del admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, plan_type)
);

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_plan_access_user_id ON user_plan_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plan_access_plan_type ON user_plan_access(plan_type);
CREATE INDEX IF NOT EXISTS idx_user_plan_access_active ON user_plan_access(user_id, is_active);

-- Habilitar RLS
ALTER TABLE user_plan_access ENABLE ROW LEVEL SECURITY;

-- Politica: Usuarios pueden ver sus propios accesos
CREATE POLICY "Users can view own plan access"
ON user_plan_access
FOR SELECT
USING (auth.uid() = user_id);

-- Politica: Solo service_role puede insertar/actualizar/eliminar
-- (Tu lo haces manualmente desde Supabase Dashboard o via API con service_role)
CREATE POLICY "Service role can manage all plan access"
ON user_plan_access
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_plan_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_plan_access_updated_at ON user_plan_access;
CREATE TRIGGER trigger_user_plan_access_updated_at
  BEFORE UPDATE ON user_plan_access
  FOR EACH ROW
  EXECUTE FUNCTION update_user_plan_access_updated_at();

-- ============================================
-- MIGRACION: Dar acceso "personal" a todos los usuarios existentes
-- ============================================
INSERT INTO user_plan_access (user_id, plan_type, granted_by, notes)
SELECT 
  id as user_id,
  'personal' as plan_type,
  'migration' as granted_by,
  'Acceso otorgado automaticamente durante migracion inicial' as notes
FROM auth.users
ON CONFLICT (user_id, plan_type) DO NOTHING;

-- ============================================
-- COMENTARIOS UTILES PARA ADMINISTRACION
-- ============================================
COMMENT ON TABLE user_plan_access IS 'Controla que planes/perfiles puede acceder cada usuario';
COMMENT ON COLUMN user_plan_access.plan_type IS 'Tipo de plan: personal, empresarial, crm';
COMMENT ON COLUMN user_plan_access.is_active IS 'Si el acceso esta activo. Poner false para revocar sin eliminar';
COMMENT ON COLUMN user_plan_access.expires_at IS 'Fecha de expiracion. NULL = sin limite. Util para suscripciones';
COMMENT ON COLUMN user_plan_access.granted_by IS 'Como se otorgo: manual, stripe_payment, promotion, migration';

-- ============================================
-- EJEMPLOS DE USO (NO SE EJECUTAN, SOLO REFERENCIA)
-- ============================================
-- 
-- -- Dar acceso Personal a un usuario
-- INSERT INTO user_plan_access (user_id, plan_type, granted_by)
-- VALUES ('uuid-del-usuario', 'personal', 'manual');
--
-- -- Dar acceso Empresarial adicional
-- INSERT INTO user_plan_access (user_id, plan_type, granted_by)
-- VALUES ('uuid-del-usuario', 'empresarial', 'manual');
--
-- -- Dar acceso CRM con expiracion (prueba de 30 dias)
-- INSERT INTO user_plan_access (user_id, plan_type, granted_by, expires_at)
-- VALUES ('uuid-del-usuario', 'crm', 'promotion', now() + interval '30 days');
--
-- -- Revocar acceso (sin eliminar el registro)
-- UPDATE user_plan_access SET is_active = false 
-- WHERE user_id = 'uuid-del-usuario' AND plan_type = 'empresarial';
--
-- -- Reactivar acceso
-- UPDATE user_plan_access SET is_active = true 
-- WHERE user_id = 'uuid-del-usuario' AND plan_type = 'empresarial';
--
-- -- Ver accesos de un usuario
-- SELECT * FROM user_plan_access WHERE user_id = 'uuid-del-usuario';
--
-- -- Ver todos los usuarios con acceso empresarial activo
-- SELECT u.email, upa.* 
-- FROM user_plan_access upa
-- JOIN auth.users u ON u.id = upa.user_id
-- WHERE upa.plan_type = 'empresarial' AND upa.is_active = true;
