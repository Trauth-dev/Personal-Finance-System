// Catálogo de planes Prospera+. Montos EN GUARANÍES (PagoPar liquida en PYG).
// Es la fuente de verdad compartida por la UI, el checkout y el webhook.

export type PlanId = "personal" | "total"

export interface PlanProspera {
  id: PlanId
  nombre: string
  resumen: string
  monto: number
  /** Valor guardado en profiles.plan_tier al confirmar el pago. */
  tier: "personal" | "completo"
}

export const PLANES: Record<PlanId, PlanProspera> = {
  personal: {
    id: "personal",
    nombre: "Prospera+ Personal",
    resumen: "Tu perfil Personal completo",
    monto: 80000,
    tier: "personal",
  },
  total: {
    id: "total",
    nombre: "Prospera+ Total",
    resumen: "Acceso total al sistema",
    monto: 120000,
    tier: "completo",
  },
}

export function esPlanId(valor: unknown): valor is PlanId {
  return valor === "personal" || valor === "total"
}

/**
 * Traduce profiles.plan_tier al plan vigente. Solo "personal" restringe el
 * acceso; cualquier otro valor con suscripción vigente (incluidas las
 * suscripciones únicas anteriores de Gs 100.000) conserva el acceso Total.
 */
export function planDesdeTier(tier: string | null | undefined): PlanId {
  return tier === "personal" ? "personal" : "total"
}

/**
 * Plan asignado mientras los cobros están pausados (sin pago registrado):
 * solo las cuentas "completo" tienen acceso Total; el resto, Personal.
 */
export function planSinCobro(tier: string | null | undefined): PlanId {
  return tier === "completo" ? "total" : "personal"
}

/** Rutas que requieren el plan Total (perfiles Empresarial y CRM). */
export function rutaRequierePlanTotal(pathname: string): boolean {
  return /^\/dashboard\/(empresarial|crm)(\/|$)/.test(pathname)
}
