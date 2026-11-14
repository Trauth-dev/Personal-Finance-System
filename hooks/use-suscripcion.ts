"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { COBROS_PAUSADOS, tieneAccesoLibre } from "@/lib/plans/acceso-libre"
import { diasDePrueba, enPrueba, resolverPlan, type PlanId } from "@/lib/plans/catalogo"

interface UseSuscripcionReturn {
  // plan contratado vigente (null si no hay suscripcion activa)
  plan: PlanId | null
  // true si puede usar los perfiles Empresarial y CRM (plan Total o acceso libre)
  accesoTotal: boolean
  // true si la suscripcion esta vigente (pago y no vencida) o el usuario tiene acceso libre
  activa: boolean
  // true si el usuario es socio/fundador con acceso libre (sin abonar)
  exento: boolean
  // true si accede por su plan actual durante el período sin cobro (cuentas anteriores a la prueba)
  sinCobro: boolean
  // true si está dentro de la prueba gratuita de 30 días (cuentas nuevas)
  prueba: boolean
  // dias restantes de la prueba gratuita
  diasPrueba: number
  // true si la prueba gratuita terminó y no tiene pago vigente
  pruebaTerminada: boolean
  // fecha hasta la que esta vigente (ISO) o null si nunca pago
  vence: string | null
  // dias restantes hasta el vencimiento (0 si vencida o sin pago)
  diasRestantes: number
  // true mientras se consulta
  isLoading: boolean
  refresh: () => Promise<void>
}

/**
 * Estado de la suscripcion mensual Prospera+ del usuario.
 * Fuentes: profiles.suscripcion_vence (pago confirmado) y profiles.prueba_vence
 * (prueba gratuita de las cuentas nuevas).
 */
export function useSuscripcion(): UseSuscripcionReturn {
  const [vence, setVence] = useState<string | null>(null)
  const [pruebaVence, setPruebaVence] = useState<string | null>(null)
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
        setPruebaVence(null)
        setExento(false)
        return
      }

      setExento(tieneAccesoLibre(user.email))

      const { data: profile } = await supabase
        .from("profiles")
        .select("suscripcion_vence, plan_tier, prueba_vence")
        .eq("id", user.id)
        .maybeSingle()

      setVence(profile?.suscripcion_vence ?? null)
      setTier(profile?.plan_tier ?? null)
      setPruebaVence(profile?.prueba_vence ?? null)
    } catch {
      setVence(null)
      setTier(null)
      setPruebaVence(null)
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
  const pagoVigente = venceMs > ahora
  const diasRestantes = pagoVigente ? Math.ceil((venceMs - ahora) / (1000 * 60 * 60 * 24)) : 0
  const prueba = !exento && !pagoVigente && enPrueba(pruebaVence)
  const pruebaTerminada = !exento && !pagoVigente && Boolean(pruebaVence) && !prueba
  const sinCobro = !exento && !pagoVigente && !pruebaVence && COBROS_PAUSADOS
  const plan: PlanId | null = exento ? "total" : resolverPlan({ email: null, tier, vence, prueba: pruebaVence })
  const activa = plan !== null
  const accesoTotal = plan === "total"

  return {
    plan,
    accesoTotal,
    activa,
    exento,
    sinCobro,
    prueba,
    diasPrueba: prueba ? diasDePrueba(pruebaVence) : 0,
    pruebaTerminada,
    vence,
    diasRestantes,
    isLoading,
    refresh: fetchSuscripcion,
  }
}
