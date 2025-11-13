-- Script para eliminar restricciones CHECK antiguas y permitir categorías personalizadas

-- Eliminar restricción CHECK de tipo_ingreso en la tabla ingresos
ALTER TABLE public.ingresos 
DROP CONSTRAINT IF EXISTS ingresos_tipo_ingreso_check;

-- Eliminar cualquier otra restricción CHECK relacionada con categorías
ALTER TABLE public.egresos 
DROP CONSTRAINT IF EXISTS egresos_categoria_vivienda_check;

ALTER TABLE public.egresos 
DROP CONSTRAINT IF EXISTS egresos_categoria_varios_check;

-- Verificar que las tablas ahora aceptan cualquier valor de texto
-- (No es necesario agregar nada más, solo eliminar las restricciones)

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE 'Restricciones CHECK eliminadas exitosamente. Ahora se permiten categorías personalizadas.';
END $$;
