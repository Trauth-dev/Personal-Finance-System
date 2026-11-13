// Catálogo de planes Prospera+. Montos EN GUARANÍES (PagoPar liquida en PYG).
// Es la fuente de verdad compartida por la UI, el checkout y el webhook.

import { COBROS_PAUSADOS, tieneAccesoLibre } from "@/lib/plans/acceso-libre"

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
 * Traduce profiles.plan_tier al plan vigente con suscripción paga.
 * Solo "completo" habilita Total (Personal + Empresarial + CRM); cualquier
 * otro valor ("basico", "personal") queda únicamente con el perfil Personal.
 */
export function planDesdeTier(tier: string | null | undefined): PlanId {
  return tier === "completo" ? "total" : "personal"
}

/**
 * Fuente única para decidir el plan de un usuario en todo el sistema.
 * Devuelve null si no tiene acceso (sin pago y con cobros activos).
 */
export function resolverPlan(datos: {
  email: string | null | undefined
  tier: string | null | undefined
  vence: string | null | undefined
  /** profiles.prueba_vence: fin de la prueba gratuita (null en cuentas anteriores a la prueba). */
  prueba?: string | null
}): PlanId | null {
  if (tieneAccesoLibre(datos.email)) return "total"
  const pagoVigente = datos.vence ? new Date(datos.vence).getTime() > Date.now() : false
  if (pagoVigente) return planDesdeTier(datos.tier)
  // Cuentas nuevas: plan Personal gratis hasta el fin de la prueba; después, pago obligatorio.
  if (datos.prueba) return enPrueba(datos.prueba) ? planSinCobro(datos.tier) : null
  return COBROS_PAUSADOS ? planSinCobro(datos.tier) : null
}

export const DIAS_PRUEBA = 30

export function enPrueba(prueba: string | null | undefined): boolean {
  return Boolean(prueba) && new Date(prueba as string).getTime() > Date.now()
}

export function diasDePrueba(prueba: string | null | undefined): number {
  if (!enPrueba(prueba)) return 0
  return Math.ceil((new Date(prueba as string).getTime() - Date.now()) / 86_400_000)
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
