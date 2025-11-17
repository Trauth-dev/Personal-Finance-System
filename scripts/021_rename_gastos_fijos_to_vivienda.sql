-- Script para cambiar "Gastos Fijos" por "Gastos Vivienda" en todos los perfiles
-- Actualiza el nombre de la categoría en la tabla tipos_categoria_egreso

UPDATE tipos_categoria_egreso
SET nombre = 'Gastos Vivienda'
WHERE nombre = 'Gastos Fijos';
