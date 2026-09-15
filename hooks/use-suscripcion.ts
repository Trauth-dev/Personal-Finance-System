"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

interface UseSuscripcionReturn {
  // true si la suscripcion esta vigente (pago y no vencida)
  activa: boolean
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
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("suscripcion_vence")
        .eq("id", user.id)
        .maybeSingle()

      setVence(profile?.suscripcion_vence ?? null)
    } catch {
      setVence(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuscripcion()
  }, [fetchSuscripcion])

  const ahora = Date.now()
  const venceMs = vence ? new Date(vence).getTime() : 0
  const activa = venceMs > ahora
  const diasRestantes = activa ? Math.ceil((venceMs - ahora) / (1000 * 60 * 60 * 24)) : 0

  return {
    activa,
    vence,
    diasRestantes,
    isLoading,
    refresh: fetchSuscripcion,
  }
}
