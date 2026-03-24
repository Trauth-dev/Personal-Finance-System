-- =====================================================
-- Script 032: Fix perfiles tipo constraint for CRM
-- =====================================================
-- Este script actualiza el constraint de la tabla perfiles
-- para permitir el tipo 'crm'
-- =====================================================

-- Paso 1: Eliminar el constraint existente
ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_tipo_check;

-- Paso 2: Crear nuevo constraint que incluye 'crm'
ALTER TABLE perfiles ADD CONSTRAINT perfiles_tipo_check 
  CHECK (tipo IN ('personal', 'empresarial', 'crm'));

-- Verificar que el constraint se creo correctamente
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'perfiles'::regclass 
AND contype = 'c';
