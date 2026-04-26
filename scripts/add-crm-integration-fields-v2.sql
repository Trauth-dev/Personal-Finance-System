-- Migracion: Agregar campos de vinculacion entre modulos del CRM
-- Version: 2 (corrige nombre de tabla clientes)
-- Descripcion: Vincula seguimientos y agendamientos con oportunidades del pipeline

-- 1. Agregar oportunidad_id a la tabla de seguimientos
ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS oportunidad_id UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL;

-- 2. Agregar oportunidad_id a la tabla de agendamientos
ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS oportunidad_id UUID REFERENCES crm_oportunidades(id) ON DELETE SET NULL;

-- 3. Agregar campo para marcar seguimientos/agendamientos creados automaticamente
ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS es_automatico BOOLEAN DEFAULT false;

ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS es_automatico BOOLEAN DEFAULT false;

-- 4. Agregar campo de etapa_origen para saber desde que etapa se creo
ALTER TABLE crm_seguimientos 
ADD COLUMN IF NOT EXISTS etapa_origen TEXT;

ALTER TABLE crm_agendamientos 
ADD COLUMN IF NOT EXISTS etapa_origen TEXT;

-- 5. Crear indices para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_seguimientos_oportunidad ON crm_seguimientos(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_agendamientos_oportunidad ON crm_agendamientos(oportunidad_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_cliente ON crm_seguimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_agendamientos_cliente ON crm_agendamientos(cliente_id);

-- 6. Agregar campo de ultima_actividad a clientes para tracking (tabla correcta: clientes)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS ultima_actividad TIMESTAMPTZ;

-- 7. Crear funcion para actualizar ultima_actividad automaticamente
CREATE OR REPLACE FUNCTION actualizar_ultima_actividad_cliente()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar ultima_actividad del cliente
  IF NEW.cliente_id IS NOT NULL THEN
    UPDATE clientes 
    SET ultima_actividad = NOW() 
    WHERE id = NEW.cliente_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear triggers para actualizar ultima_actividad
DROP TRIGGER IF EXISTS trigger_seguimiento_actividad ON crm_seguimientos;
CREATE TRIGGER trigger_seguimiento_actividad
AFTER INSERT OR UPDATE ON crm_seguimientos
FOR EACH ROW
EXECUTE FUNCTION actualizar_ultima_actividad_cliente();

DROP TRIGGER IF EXISTS trigger_agendamiento_actividad ON crm_agendamientos;
CREATE TRIGGER trigger_agendamiento_actividad
AFTER INSERT OR UPDATE ON crm_agendamientos
FOR EACH ROW
EXECUTE FUNCTION actualizar_ultima_actividad_cliente();

DROP TRIGGER IF EXISTS trigger_oportunidad_actividad ON crm_oportunidades;
CREATE TRIGGER trigger_oportunidad_actividad
AFTER INSERT OR UPDATE ON crm_oportunidades
FOR EACH ROW
EXECUTE FUNCTION actualizar_ultima_actividad_cliente();

-- 9. Comentarios descriptivos
COMMENT ON COLUMN crm_seguimientos.oportunidad_id IS 'Vincula el seguimiento a una oportunidad del pipeline';
COMMENT ON COLUMN crm_agendamientos.oportunidad_id IS 'Vincula el agendamiento a una oportunidad del pipeline';
COMMENT ON COLUMN clientes.ultima_actividad IS 'Fecha de la ultima actividad relacionada con el cliente';
