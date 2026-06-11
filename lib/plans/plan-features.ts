// Configuracion central de capacidades por plan.
// Esto permite que el sistema se adapte facilmente a nuevos planes en el futuro:
// basta con agregar una nueva entrada en PLAN_FEATURES y, si hace falta, un nuevo
// valor en PlanTier. Los formularios y vistas leen estas "features" en vez de
// chequear el nombre del plan directamente.

export type PlanTier = "basico" | "completo"

export interface PlanFeatures {
  ingreso: {
    // Si true, el usuario puede crear/editar/eliminar sus propias categorias de ingreso.
    categoriasPersonalizadas: boolean
    // Categorias predeterminadas y fijas cuando categoriasPersonalizadas es false.
    categoriasFijas: string[]
    // Si true, puede elegir el destino del ingreso (caja de ahorro). Si false, el ingreso
    // se registra sin especificar destino.
    destinoIngreso: boolean
  }
  egreso: {
    // Si true, puede elegir el origen de fondos (caja de ahorro / tarjeta de credito).
    origenFondos: boolean
    // Si true, puede seleccionar una deuda especifica y hacer seguimiento de cuotas.
    // Si false, "Pago de Deudas" solo registra concepto + monto.
    seguimientoDeudas: boolean
  }
  presupuesto: {
    habilitado: boolean
  }
}

// Categorias de ingreso predeterminadas para el plan basico / usuarios nuevos.
export const CATEGORIAS_INGRESO_BASICO = ["Salario", "Emprendimiento", "Ingresos Extras"]

export const PLAN_FEATURES: Record<PlanTier, PlanFeatures> = {
  // Plan basico: registros muy basicos.
  basico: {
    ingreso: {
      categoriasPersonalizadas: false,
      categoriasFijas: CATEGORIAS_INGRESO_BASICO,
      destinoIngreso: false,
    },
    egreso: {
      origenFondos: false,
      seguimientoDeudas: false,
    },
    presupuesto: {
      habilitado: true,
    },
  },
  // Plan completo: acceso total a todas las funciones avanzadas.
  completo: {
    ingreso: {
      categoriasPersonalizadas: true,
      categoriasFijas: [],
      destinoIngreso: true,
    },
    egreso: {
      origenFondos: true,
      seguimientoDeudas: true,
    },
    presupuesto: {
      habilitado: true,
    },
  },
}

export function getPlanFeatures(tier: PlanTier): PlanFeatures {
  return PLAN_FEATURES[tier] ?? PLAN_FEATURES.basico
}
