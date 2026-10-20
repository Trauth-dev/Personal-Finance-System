"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { tieneAccesoLibre } from "@/lib/plans/acceso-libre"
import { planDesdeTier, type PlanId } from "@/lib/plans/catalogo"

interface UseSuscripcionReturn {
  // plan contratado vigente (null si no hay suscripcion activa)
  plan: PlanId | null
  // true si puede usar los perfiles Empresarial y CRM (plan Total o acceso libre)
  accesoTotal: boolean
  // true si la suscripcion esta vigente (pago y no vencida) o el usuario tiene acceso libre
  activa: boolean
  // true si el usuario es socio/fundador con acceso libre (sin abonar)
  exento: boolean
  // fecha hasta la que esta vigente (ISO) o null si nunca pago
  vence: string | null
  // dias restantes hasta el vencimiento (0 si vencida o sin pago)
  diasRestantes: number
  // true mientras se consulta
  isLoading: boolean
  // refrescar el estado (util despues de volver de PagoPar)
  refresh: () => Promise<void>
}

/**
 * Estado de la suscripcion mensual Prospera+ del usuario.
 * La fuente de verdad es profiles.suscripcion_vence: si es mayor a "ahora",
 * la suscripcion esta activa. El pago se confirma via webhook de PagoPar.
 */
export function useSuscripcion(): UseSuscripcionReturn {
  const [vence, setVence] = useState<string | null>(null)
  const [exento, setExento] = useState(false)
  const [tier, setTier] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSuscripcion = useCallback(async () => {
    try {
      setIsLoading(true)
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setVence(null)
        setExento(false)
        return
      }

      // Los socios/fundadores tienen acceso libre sin abonar.
      setExento(tieneAccesoLibre(user.email))

      const { data: profile } = await supabase
        .from("profiles")
        .select("suscripcion_vence, plan_tier")
        .eq("id", user.id)
        .maybeSingle()

      setVence(profile?.suscripcion_vence ?? null)
      setTier(profile?.plan_tier ?? null)
    } catch {
      setVence(null)
      setTier(null)
      setExento(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuscripcion()
  }, [fetchSuscripcion])

  const ahora = Date.now()
  const venceMs = vence ? new Date(vence).getTime() : 0
  const activa = exento || venceMs > ahora
  const diasRestantes = venceMs > ahora ? Math.ceil((venceMs - ahora) / (1000 * 60 * 60 * 24)) : 0
  const plan: PlanId | null = exento ? "total" : venceMs > ahora ? planDesdeTier(tier) : null
  const accesoTotal = plan === "total"

  return {
    plan,
    accesoTotal,
    activa,
    exento,
    vence,
    diasRestantes,
    isLoading,
    refresh: fetchSuscripcion,
  }
}
