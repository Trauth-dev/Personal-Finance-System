-- Migración: Actualizar estructura de tabla egresos para sistema de categorías flexible
-- Este script modifica la tabla egresos para usar el nuevo sistema de categorías personalizables

-- Agregar nuevas columnas para el sistema flexible de categorías
ALTER TABLE egresos 
ADD COLUMN IF NOT EXISTS tipo_categoria_id UUID REFERENCES tipos_categoria_egreso(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias_egreso(id) ON DELETE CASCADE;

-- Hacer las columnas antiguas opcionales (nullable) para compatibilidad
ALTER TABLE egresos 
ALTER COLUMN categoria_vivienda DROP NOT NULL,
ALTER COLUMN categoria_varios DROP NOT NULL;

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_egresos_tipo_categoria ON egresos(tipo_categoria_id);
CREATE INDEX IF NOT EXISTS idx_egresos_categoria ON egresos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_egresos_user_fecha ON egresos(user_id, fecha);

-- Comentarios para documentación
COMMENT ON COLUMN egresos.tipo_categoria_id IS 'Referencia al tipo de categoría personalizada del usuario';
COMMENT ON COLUMN egresos.categoria_id IS 'Referencia a la subcategoría específica dentro del tipo';
