-- =====================================================
-- Script 034: Compartir Inventario entre Empresarial y CRM
-- =====================================================
-- Este script hace que el inventario sea compartido
-- entre los perfiles Empresarial y CRM del mismo usuario

-- 1. Agregar columna user_id a inventario (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventario' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE inventario ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Actualizar user_id basado en el perfil_id existente
UPDATE inventario i
SET user_id = p.user_id
FROM perfiles p
WHERE i.perfil_id = p.id
AND i.user_id IS NULL;

-- 3. Agregar columna producto_id a crm_ventas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_ventas' AND column_name = 'producto_id'
  ) THEN
    ALTER TABLE crm_ventas ADD COLUMN producto_id UUID REFERENCES inventario(id);
  END IF;
END $$;

-- 4. Agregar columna cantidad a crm_ventas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_ventas' AND column_name = 'cantidad'
  ) THEN
    ALTER TABLE crm_ventas ADD COLUMN cantidad NUMERIC DEFAULT 1;
  END IF;
END $$;

-- 5. Agregar columna precio_costo a crm_ventas para calcular ganancia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_ventas' AND column_name = 'precio_costo'
  ) THEN
    ALTER TABLE crm_ventas ADD COLUMN precio_costo NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 6. Agregar columna precio_unitario a crm_ventas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'crm_ventas' AND column_name = 'precio_unitario'
  ) THEN
    ALTER TABLE crm_ventas ADD COLUMN precio_unitario NUMERIC DEFAULT 0;
  END IF;
END $$;

-- 7. Crear indice para busqueda por user_id en inventario
CREATE INDEX IF NOT EXISTS idx_inventario_user_id ON inventario(user_id);

-- 8. Actualizar las politicas RLS de inventario para permitir acceso por user_id
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio inventario" ON inventario;
DROP POLICY IF EXISTS "Los usuarios pueden insertar en su propio inventario" ON inventario;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio inventario" ON inventario;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar de su propio inventario" ON inventario;

-- Crear nuevas politicas que permitan acceso por user_id O perfil_id
CREATE POLICY "Users can view own inventory"
  ON inventario FOR SELECT
  USING (
    user_id = auth.uid() OR 
    perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own inventory"
  ON inventario FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR 
    perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own inventory"
  ON inventario FOR UPDATE
  USING (
    user_id = auth.uid() OR 
    perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own inventory"
  ON inventario FOR DELETE
  USING (
    user_id = auth.uid() OR 
    perfil_id IN (SELECT id FROM perfiles WHERE user_id = auth.uid())
  );

-- 9. Crear funcion para descontar stock automaticamente
CREATE OR REPLACE FUNCTION descontar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo descontar si tiene producto_id y cantidad
  IF NEW.producto_id IS NOT NULL AND NEW.cantidad IS NOT NULL THEN
    UPDATE inventario
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = NOW()
    WHERE id = NEW.producto_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Crear trigger para descontar stock en ventas CRM
DROP TRIGGER IF EXISTS trigger_descontar_stock_crm_venta ON crm_ventas;
CREATE TRIGGER trigger_descontar_stock_crm_venta
  AFTER INSERT ON crm_ventas
  FOR EACH ROW
  EXECUTE FUNCTION descontar_stock_venta();

-- 11. Crear funcion para restaurar stock al eliminar venta
CREATE OR REPLACE FUNCTION restaurar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo restaurar si tenia producto_id y cantidad
  IF OLD.producto_id IS NOT NULL AND OLD.cantidad IS NOT NULL THEN
    UPDATE inventario
    SET stock_actual = stock_actual + OLD.cantidad,
        updated_at = NOW()
    WHERE id = OLD.producto_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Crear trigger para restaurar stock al eliminar venta
DROP TRIGGER IF EXISTS trigger_restaurar_stock_crm_venta ON crm_ventas;
CREATE TRIGGER trigger_restaurar_stock_crm_venta
  BEFORE DELETE ON crm_ventas
  FOR EACH ROW
  EXECUTE FUNCTION restaurar_stock_venta();
