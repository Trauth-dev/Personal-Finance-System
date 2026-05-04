-- Migracion para mejorar el sistema de Re-visitas
-- Agrega campos necesarios a la tabla existente crm_revisitas

-- Agregar nuevos campos a crm_revisitas si no existen
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'tipo') THEN
    ALTER TABLE crm_revisitas ADD COLUMN tipo TEXT DEFAULT 'presencial';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'producto_id') THEN
    ALTER TABLE crm_revisitas ADD COLUMN producto_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'seguimiento_id') THEN
    ALTER TABLE crm_revisitas ADD COLUMN seguimiento_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'motivo') THEN
    ALTER TABLE crm_revisitas ADD COLUMN motivo TEXT DEFAULT 'mantenimiento';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'estado') THEN
    ALTER TABLE crm_revisitas ADD COLUMN estado TEXT DEFAULT 'sugerida';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'fecha_programada') THEN
    ALTER TABLE crm_revisitas ADD COLUMN fecha_programada TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'fecha_realizada') THEN
    ALTER TABLE crm_revisitas ADD COLUMN fecha_realizada TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'duracion_minutos') THEN
    ALTER TABLE crm_revisitas ADD COLUMN duracion_minutos INTEGER DEFAULT 30;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'lugar') THEN
    ALTER TABLE crm_revisitas ADD COLUMN lugar TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'notas') THEN
    ALTER TABLE crm_revisitas ADD COLUMN notas TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'resultado_venta') THEN
    ALTER TABLE crm_revisitas ADD COLUMN resultado_venta BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'nueva_venta_id') THEN
    ALTER TABLE crm_revisitas ADD COLUMN nueva_venta_id UUID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'oportunidad_detectada') THEN
    ALTER TABLE crm_revisitas ADD COLUMN oportunidad_detectada TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'es_automatica') THEN
    ALTER TABLE crm_revisitas ADD COLUMN es_automatica BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'confirmada_por_usuario') THEN
    ALTER TABLE crm_revisitas ADD COLUMN confirmada_por_usuario BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_revisitas' AND column_name = 'updated_at') THEN
    ALTER TABLE crm_revisitas ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Crear indices para mejor performance
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_estado ON crm_revisitas(estado);
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_fecha ON crm_revisitas(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_cliente ON crm_revisitas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_revisitas_user ON crm_revisitas(user_id);
