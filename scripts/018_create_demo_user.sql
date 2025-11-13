-- Script para crear usuario demo con datos de ejemplo
-- Usuario: demo@gmail.com
-- Contraseña: demo123
-- Este script debe ejecutarse después de que el usuario se registre en Supabase Auth

-- IMPORTANTE: 
-- 1. Primero registra el usuario demo@gmail.com con contraseña demo123 en tu aplicación
-- 2. Luego ejecuta este script para agregar los datos de ejemplo
-- 3. El user_id se obtiene automáticamente de auth.users

DO $$
DECLARE
    v_user_id uuid;
    v_perfil_personal_id uuid;
    v_tipo_cat_vivienda_id uuid;
    v_tipo_cat_transporte_id uuid;
    v_tipo_cat_alimentacion_id uuid;
    v_cat_arriendo_id uuid;
    v_cat_servicios_id uuid;
    v_cat_gasolina_id uuid;
    v_cat_supermercado_id uuid;
    v_cat_restaurantes_id uuid;
BEGIN
    -- Obtener el user_id del usuario demo@gmail.com
    SELECT id INTO v_user_id 
    FROM auth.users 
    WHERE email = 'demo@gmail.com'
    LIMIT 1;

    -- Si el usuario no existe, mostrar mensaje y salir
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Usuario demo@gmail.com no encontrado. Por favor registra este usuario primero en la aplicación.';
        RETURN;
    END IF;

    RAISE NOTICE 'Usuario demo encontrado: %', v_user_id;

    -- Verificar si ya existe un perfil personal
    SELECT id INTO v_perfil_personal_id
    FROM perfiles
    WHERE user_id = v_user_id AND tipo = 'personal'
    LIMIT 1;

    -- Si no existe perfil personal, crearlo
    IF v_perfil_personal_id IS NULL THEN
        INSERT INTO perfiles (user_id, nombre, tipo, color, icono)
        VALUES (v_user_id, 'Personal', 'personal', '#8b5cf6', 'user')
        RETURNING id INTO v_perfil_personal_id;
        
        RAISE NOTICE 'Perfil Personal creado: %', v_perfil_personal_id;
    ELSE
        RAISE NOTICE 'Perfil Personal ya existe: %', v_perfil_personal_id;
    END IF;

    -- Crear tipos de categoría de egreso
    INSERT INTO tipos_categoria_egreso (user_id, perfil_id, nombre, color)
    VALUES 
        (v_user_id, v_perfil_personal_id, 'Vivienda', '#ef4444'),
        (v_user_id, v_perfil_personal_id, 'Transporte', '#f59e0b'),
        (v_user_id, v_perfil_personal_id, 'Alimentación', '#10b981')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_tipo_cat_vivienda_id;

    -- Obtener IDs de tipos de categoría
    SELECT id INTO v_tipo_cat_vivienda_id FROM tipos_categoria_egreso 
    WHERE user_id = v_user_id AND nombre = 'Vivienda' LIMIT 1;
    
    SELECT id INTO v_tipo_cat_transporte_id FROM tipos_categoria_egreso 
    WHERE user_id = v_user_id AND nombre = 'Transporte' LIMIT 1;
    
    SELECT id INTO v_tipo_cat_alimentacion_id FROM tipos_categoria_egreso 
    WHERE user_id = v_user_id AND nombre = 'Alimentación' LIMIT 1;

    -- Crear subcategorías de egreso
    INSERT INTO categorias_egreso (user_id, perfil_id, tipo_categoria_id, nombre)
    VALUES 
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, 'Arriendo'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, 'Servicios'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_transporte_id, 'Gasolina'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, 'Supermercado'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, 'Restaurantes')
    ON CONFLICT DO NOTHING;

    -- Obtener IDs de categorías
    SELECT id INTO v_cat_arriendo_id FROM categorias_egreso 
    WHERE user_id = v_user_id AND nombre = 'Arriendo' LIMIT 1;
    
    SELECT id INTO v_cat_servicios_id FROM categorias_egreso 
    WHERE user_id = v_user_id AND nombre = 'Servicios' LIMIT 1;
    
    SELECT id INTO v_cat_gasolina_id FROM categorias_egreso 
    WHERE user_id = v_user_id AND nombre = 'Gasolina' LIMIT 1;
    
    SELECT id INTO v_cat_supermercado_id FROM categorias_egreso 
    WHERE user_id = v_user_id AND nombre = 'Supermercado' LIMIT 1;
    
    SELECT id INTO v_cat_restaurantes_id FROM categorias_egreso 
    WHERE user_id = v_user_id AND nombre = 'Restaurantes' LIMIT 1;

    -- Crear categorías de ingreso
    INSERT INTO categorias_ingresos (user_id, perfil_id, nombre)
    VALUES 
        (v_user_id, v_perfil_personal_id, 'Salario'),
        (v_user_id, v_perfil_personal_id, 'Freelance'),
        (v_user_id, v_perfil_personal_id, 'Inversiones')
    ON CONFLICT DO NOTHING;

    -- Insertar ingresos de ejemplo (últimos 3 meses)
    INSERT INTO ingresos (user_id, perfil_id, tipo_ingreso, monto, fecha)
    VALUES 
        -- Mes actual (noviembre 2025)
        (v_user_id, v_perfil_personal_id, 'Salario', 3758000, '2025-11-01'),
        (v_user_id, v_perfil_personal_id, 'Freelance', 500000, '2025-11-15'),
        -- Octubre 2025
        (v_user_id, v_perfil_personal_id, 'Salario', 3758000, '2025-10-01'),
        (v_user_id, v_perfil_personal_id, 'Freelance', 300000, '2025-10-20'),
        -- Septiembre 2025
        (v_user_id, v_perfil_personal_id, 'Salario', 3758000, '2025-09-01'),
        (v_user_id, v_perfil_personal_id, 'Inversiones', 150000, '2025-09-25')
    ON CONFLICT DO NOTHING;

    -- Insertar egresos de ejemplo (últimos 3 meses)
    INSERT INTO egresos (user_id, perfil_id, tipo_categoria_id, categoria_id, monto, fecha, concepto)
    VALUES 
        -- Noviembre 2025
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_arriendo_id, 800000, '2025-11-05', 'Arriendo mensual'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_servicios_id, 150000, '2025-11-10', 'Servicios públicos'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_transporte_id, v_cat_gasolina_id, 200000, '2025-11-08', 'Gasolina quincenal'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_supermercado_id, 450000, '2025-11-12', 'Compras del mes'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_restaurantes_id, 180000, '2025-11-18', 'Comidas fuera'),
        -- Octubre 2025
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_arriendo_id, 800000, '2025-10-05', 'Arriendo mensual'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_servicios_id, 140000, '2025-10-10', 'Servicios públicos'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_transporte_id, v_cat_gasolina_id, 220000, '2025-10-08', 'Gasolina quincenal'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_supermercado_id, 480000, '2025-10-12', 'Compras del mes'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_restaurantes_id, 200000, '2025-10-20', 'Comidas fuera'),
        -- Septiembre 2025
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_arriendo_id, 800000, '2025-09-05', 'Arriendo mensual'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_vivienda_id, v_cat_servicios_id, 135000, '2025-09-10', 'Servicios públicos'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_transporte_id, v_cat_gasolina_id, 190000, '2025-09-08', 'Gasolina quincenal'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_supermercado_id, 420000, '2025-09-12', 'Compras del mes'),
        (v_user_id, v_perfil_personal_id, v_tipo_cat_alimentacion_id, v_cat_restaurantes_id, 160000, '2025-09-22', 'Comidas fuera')
    ON CONFLICT DO NOTHING;

    -- Insertar presupuesto mensual
    INSERT INTO presupuesto_mensual (user_id, perfil_id, meta_salario, fecha)
    VALUES 
        (v_user_id, v_perfil_personal_id, 4000000, '2025-11-01')
    ON CONFLICT DO NOTHING;

    -- Insertar presupuestos por categoría
    INSERT INTO presupuesto_categorias (perfil_id, tipo_categoria, categoria, monto_presupuestado, mes)
    VALUES 
        (v_perfil_personal_id, 'Vivienda', 'Arriendo', 800000, '2025-11-01'),
        (v_perfil_personal_id, 'Vivienda', 'Servicios', 150000, '2025-11-01'),
        (v_perfil_personal_id, 'Transporte', 'Gasolina', 250000, '2025-11-01'),
        (v_perfil_personal_id, 'Alimentación', 'Supermercado', 500000, '2025-11-01'),
        (v_perfil_personal_id, 'Alimentación', 'Restaurantes', 200000, '2025-11-01')
    ON CONFLICT DO NOTHING;

    -- Insertar deuda de ejemplo
    INSERT INTO deudas (
        user_id, perfil_id, nombre, descripcion, acreedor, 
        monto_total, monto_pagado, monto_cuota, cuotas_totales, cuotas_pagadas,
        tasa_interes, frecuencia_pago, fecha_inicio, fecha_vencimiento,
        estado, prioridad, notas
    )
    VALUES 
        (
            v_user_id, v_perfil_personal_id, 'Préstamo Personal', 
            'Préstamo para emergencia médica', 'Banco Nacional',
            5000000, 1500000, 250000, 20, 6,
            1.2, 'mensual', '2025-06-01', '2027-01-01',
            'activa', 'alta', 'Pago automático cada 5 de mes'
        ),
        (
            v_user_id, v_perfil_personal_id, 'Tarjeta de Crédito', 
            'Saldo tarjeta de crédito', 'Banco Comercio',
            2000000, 800000, 150000, 15, 5,
            2.5, 'mensual', '2025-07-15', '2026-10-15',
            'activa', 'media', 'Revisar estado cada mes'
        )
    ON CONFLICT DO NOTHING;

    -- Insertar cajas de ahorro de ejemplo
    INSERT INTO cajas_ahorro (
        user_id, perfil_id, nombre, descripcion, tipo,
        monto_actual, meta_monto, fecha_meta, prioridad, activa, icono, color
    )
    VALUES 
        (
            v_user_id, v_perfil_personal_id, 'Fondo de Emergencia',
            'Ahorro para imprevistos y emergencias', 'emergencia',
            1200000, 3000000, '2026-06-01', 1, true, 'shield', '#ef4444'
        ),
        (
            v_user_id, v_perfil_personal_id, 'Vacaciones 2026',
            'Ahorro para vacaciones familiares', 'meta',
            500000, 2000000, '2026-07-01', 2, true, 'plane', '#3b82f6'
        ),
        (
            v_user_id, v_perfil_personal_id, 'Vehículo Nuevo',
            'Cuota inicial para compra de vehículo', 'inversion',
            800000, 5000000, '2026-12-01', 3, true, 'car', '#10b981'
        )
    ON CONFLICT DO NOTHING;

    -- Insertar patrimonio de ejemplo
    INSERT INTO patrimonio (
        perfil_id, tipo, categoria, nombre, descripcion, valor, fecha_valuacion
    )
    VALUES 
        (v_perfil_personal_id, 'activo', 'inmueble', 'Apartamento', 'Apartamento 3 habitaciones', 150000000, '2025-01-01'),
        (v_perfil_personal_id, 'activo', 'vehiculo', 'Automóvil', 'Sedán 2020', 35000000, '2025-01-01'),
        (v_perfil_personal_id, 'activo', 'inversion', 'Acciones', 'Portafolio de inversión', 8000000, '2025-11-01'),
        (v_perfil_personal_id, 'pasivo', 'deuda', 'Hipoteca', 'Hipoteca vivienda', -80000000, '2025-01-01'),
        (v_perfil_personal_id, 'pasivo', 'deuda', 'Crédito vehículo', 'Crédito auto', -12000000, '2025-01-01')
    ON CONFLICT DO NOTHING;

    -- Insertar alerta financiera de ejemplo
    INSERT INTO alertas_financieras (
        user_id, perfil_id, tipo, nivel, titulo, mensaje, fecha, leida
    )
    VALUES 
        (
            v_user_id, v_perfil_personal_id, 'presupuesto', 'warning',
            'Presupuesto de Restaurantes al 90%',
            'Has gastado $180.000 de $200.000 en restaurantes este mes.',
            CURRENT_DATE, false
        ),
        (
            v_user_id, v_perfil_personal_id, 'meta', 'info',
            'Meta de Vacaciones al 25%',
            'Has alcanzado el 25% de tu meta de ahorro para vacaciones.',
            CURRENT_DATE - INTERVAL '2 days', true
        )
    ON CONFLICT DO NOTHING;

    -- Insertar logro financiero de ejemplo
    INSERT INTO logros_financieros (
        user_id, perfil_id, tipo, titulo, descripcion, icono, fecha_obtenido
    )
    VALUES 
        (
            v_user_id, v_perfil_personal_id, 'ahorro', 'Primera Meta Alcanzada',
            'Completaste tu primera meta de ahorro', '🎯', '2025-10-15'
        ),
        (
            v_user_id, v_perfil_personal_id, 'registro', 'Mes Completo',
            'Registraste todas tus transacciones durante un mes', '📊', '2025-10-31'
        )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Usuario demo configurado exitosamente con datos de ejemplo';
    RAISE NOTICE 'Email: demo@gmail.com';
    RAISE NOTICE 'Contraseña: demo123';

END $$;
