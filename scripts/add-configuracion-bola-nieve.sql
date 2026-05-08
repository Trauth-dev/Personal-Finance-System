-- Agregar tabla de configuracion de usuario si no existe
-- Esta tabla guarda preferencias del usuario para el plan anti-deudas

-- Crear tabla configuracion_usuario si no existe
CREATE TABLE IF NOT EXISTS configuracion_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_id UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  
  -- Configuracion del plan anti-deudas
  pago_mensual_deudas DECIMAL(15,2) DEFAULT 0,
  metodo_pago_deudas VARCHAR(20) DEFAULT 'bola_nieve',
  
  -- Otras configuraciones futuras
  moneda_principal VARCHAR(3) DEFAULT 'PYG',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, perfil_id)
);

-- Crear indice para busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_configuracion_usuario_user_perfil 
ON configuracion_usuario(user_id, perfil_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_configuracion_usuario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_configuracion_usuario_updated_at ON configuracion_usuario;
CREATE TRIGGER trigger_configuracion_usuario_updated_at
  BEFORE UPDATE ON configuracion_usuario
  FOR EACH ROW
  EXECUTE FUNCTION update_configuracion_usuario_updated_at();

-- Habilitar RLS
ALTER TABLE configuracion_usuario ENABLE ROW LEVEL SECURITY;

-- Politicas RLS
DROP POLICY IF EXISTS "Users can view own configuracion" ON configuracion_usuario;
CREATE POLICY "Users can view own configuracion" ON configuracion_usuario
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own configuracion" ON configuracion_usuario;
CREATE POLICY "Users can insert own configuracion" ON configuracion_usuario
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own configuracion" ON configuracion_usuario;
CREATE POLICY "Users can update own configuracion" ON configuracion_usuario
  FOR UPDATE USING (auth.uid() = user_id);
