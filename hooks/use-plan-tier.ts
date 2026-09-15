"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { getPlanFeatures, type PlanFeatures, type PlanTier } from "@/lib/plans/plan-features"

export type { PlanTier } from "@/lib/plans/plan-features"

interface UsePlanTierReturn {
  // Nivel de plan del usuario: 'basico' | 'completo'
  tier: PlanTier
  // true mientras se consulta
  isLoading: boolean
  // atajo: true si el usuario es de plan basico
  isBasico: boolean
  // capacidades del plan actual (config-driven, escalable a nuevos planes)
  features: PlanFeatures
  // refrescar
  refresh: () => Promise<void>
}

// Rutas a las que SI puede acceder un usuario de plan basico (dentro del area personal)
// Todo lo demas bajo /dashboard/personal/* queda restringido para el plan basico.
export const BASICO_ALLOWED_PREFIXES = [
  "/dashboard/carga",
  "/dashboard/personal/historial",
  "/dashboard/personal/analisis",
  "/dashboard/personal/asesoramiento",
  // Seccion de mejora de plan: accesible para TODOS los planes (basico y completo)
  "/dashboard/personal/mejorar-plan",
  "/dashboard/configuracion",
]

// Determina si una ruta esta permitida para el plan basico
export function isRouteAllowedForBasico(pathname: string): boolean {
  // Dashboard principal personal (solo la ruta exacta)
  if (pathname === "/dashboard/personal") return true
  // Raiz del dashboard (se encarga de redirigir)
  if (pathname === "/dashboard") return true
  // Prefijos permitidos (ruta exacta o subrutas)
  return BASICO_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  )
}

export function usePlanTier(): UsePlanTierReturn {
  const [tier, setTier] = useState<PlanTier>("completo")
  const [isLoading, setIsLoading] = useState(true)

  const fetchTier = useCallback(async () => {
    // Plan unico "Prospera+": ya no hay distincion basico/completo. Todo usuario
    // con la app desbloqueada tiene acceso completo. El acceso real esta gobernado
    // por la suscripcion (ver useSuscripcion + PlanAccessGuard), no por el tier.
    setTier("completo")
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchTier()
  }, [fetchTier])

  return {
    tier,
    isLoading,
    isBasico: tier === "basico",
    features: getPlanFeatures(tier),
    refresh: fetchTier,
  }
}
