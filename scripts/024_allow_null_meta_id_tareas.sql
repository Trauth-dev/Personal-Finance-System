-- Permitir que meta_id sea NULL en tareas_meta para soportar tareas del día independientes
ALTER TABLE tareas_meta ALTER COLUMN meta_id DROP NOT NULL;

-- Agregar comentario explicativo
COMMENT ON COLUMN tareas_meta.meta_id IS 'ID de la meta asociada. NULL para tareas del día independientes';
