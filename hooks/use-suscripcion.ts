"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { COBROS_PAUSADOS, tieneAccesoLibre } from "@/lib/plans/acceso-libre"
import { cambioPendiente, diasDePrueba, enPrueba, resolverPlan, type PlanId } from "@/lib/plans/catalogo"

interface DatosSuscripcion {
  exento: boolean
  vence: string | null
  tier: string | null
  pruebaVence: string | null
  proximo: string | null
  proximoDesde: string | null
  cancelada: boolean
}

interface UseSuscripcionReturn {
  // plan vigente hoy (null si no hay suscripcion activa)
  plan: PlanId | null
  // true si puede usar los perfiles Empresarial y CRM (plan Total o acceso libre)
  accesoTotal: boolean
  // true si tiene acceso (pago vigente, prueba, período sin cobro o acceso libre)
  activa: boolean
  // true si el usuario es socio/fundador con acceso libre (sin abonar)
  exento: boolean
  // true si accede por su plan actual durante el período sin cobro (cuentas anteriores a la prueba)
  sinCobro: boolean
  // true si está dentro de la prueba gratuita de 30 días (cuentas nuevas)
  prueba: boolean
  // fin de la prueba gratuita (ISO) o null
  pruebaVence: string | null
  // dias restantes de la prueba gratuita
  diasPrueba: number
  // true si la prueba gratuita terminó y no tiene pago vigente
  pruebaTerminada: boolean
  // true si tiene un período pago vigente
  pagoVigente: boolean
  // fecha hasta la que está pago (ISO) o null si nunca pagó
  vence: string | null
  // dias restantes hasta el vencimiento del pago (0 si vencido o sin pago)
  diasRestantes: number
  // cambio de plan ya pagado que empieza al terminar el período actual
  cambio: { plan: PlanId; desde: string } | null
  // true si se dio de baja: conserva el acceso hasta `vence` y no se le recuerda renovar
  cancelada: boolean
  // true mientras se consulta
  isLoading: boolean
  refresh: () => Promise<unknown>
}

const VACIO: DatosSuscripcion = {
  exento: false,
  vence: null,
  tier: null,
  pruebaVence: null,
  proximo: null,
  proximoDesde: null,
  cancelada: false,
}

async function cargarSuscripcion(): Promise<DatosSuscripcion> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return VACIO

  const { data: profile } = await supabase
    .from("profiles")
    .select("suscripcion_vence, plan_tier, prueba_vence, plan_proximo, plan_proximo_desde, renovacion_cancelada")
    .eq("id", user.id)
    .maybeSingle()

  return {
    exento: tieneAccesoLibre(user.email),
    vence: profile?.suscripcion_vence ?? null,
    tier: profile?.plan_tier ?? null,
    pruebaVence: profile?.prueba_vence ?? null,
    proximo: profile?.plan_proximo ?? null,
    proximoDesde: profile?.plan_proximo_desde ?? null,
    cancelada: Boolean(profile?.renovacion_cancelada),
  }
}

/**
 * Estado de la suscripcion mensual Prospera+ del usuario.
 * Fuentes: profiles.suscripcion_vence (pago confirmado), profiles.prueba_vence
 * (prueba gratuita) y el cambio de plan / baja programados.
 */
export function useSuscripcion(): UseSuscripcionReturn {
  const { data, isLoading, mutate } = useSWR("suscripcion", cargarSuscripcion, {
    revalidateOnFocus: true,
    fallbackData: undefined,
  })
  const d = data ?? VACIO

  const ahora = Date.now()
  const venceMs = d.vence ? new Date(d.vence).getTime() : 0
  const pagoVigente = venceMs > ahora
  const diasRestantes = pagoVigente ? Math.ceil((venceMs - ahora) / 86_400_000) : 0
  const prueba = !d.exento && enPrueba(d.pruebaVence)
  const pruebaTerminada = !d.exento && !pagoVigente && Boolean(d.pruebaVence) && !prueba
  const sinCobro = !d.exento && !pagoVigente && !d.pruebaVence && COBROS_PAUSADOS
  const plan: PlanId | null = d.exento
    ? "total"
    : resolverPlan({
        email: null,
        tier: d.tier,
        vence: d.vence,
        prueba: d.pruebaVence,
        proximo: d.proximo,
        proximoDesde: d.proximoDesde,
      })

  return {
    plan,
    accesoTotal: plan === "total",
    activa: plan !== null,
    exento: d.exento,
    sinCobro,
    prueba,
    pruebaVence: d.pruebaVence,
    diasPrueba: prueba ? diasDePrueba(d.pruebaVence) : 0,
    pruebaTerminada,
    pagoVigente,
    vence: d.vence,
    diasRestantes,
    cambio: d.exento ? null : cambioPendiente(d.proximo, d.proximoDesde),
    cancelada: pagoVigente && d.cancelada,
    isLoading: isLoading && !data,
    refresh: () => mutate(),
  }
}
