"use client"

import { useState } from "react"
import useSWR from "swr"
import type { PlanId } from "@/lib/plans/catalogo"

type Disponibilidad = { habilitado: boolean; modoPrueba: boolean }
export type SesionBancard = { processId: string; scriptUrl: string; shopProcessId: number; planId: PlanId }

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Disponibilidad>)

/** Inicia una compra con Bancard. Monto y plan los valida el servidor. */
export function useCheckoutBancard() {
  const { data: disponibilidad } = useSWR("/api/bancard/disponibilidad", fetcher, { revalidateOnFocus: false })
  const [procesando, setProcesando] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noConfigurado, setNoConfigurado] = useState(false)
  const [sesion, setSesion] = useState<SesionBancard | null>(null)

  const iniciarPago = async (planId: PlanId) => {
    if (procesando) return
    setProcesando(planId)
    setError(null)
    setNoConfigurado(false)
    try {
      const res = await fetch("/api/bancard/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<SesionBancard> & { message?: string }

      if (res.status === 501) {
        setNoConfigurado(true)
        return
      }
      if (!res.ok || !data.processId || !data.scriptUrl || !data.shopProcessId) {
        setError(data.message ?? "No pudimos iniciar el pago. Intentá nuevamente en unos minutos.")
        return
      }
      setSesion({ processId: data.processId, scriptUrl: data.scriptUrl, shopProcessId: data.shopProcessId, planId })
    } catch {
      setError("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setProcesando(null)
    }
  }

  return {
    iniciarPago,
    procesando,
    error,
    noConfigurado,
    sesion,
    cerrarSesion: () => setSesion(null),
    habilitado: disponibilidad?.habilitado ?? false,
    modoPrueba: disponibilidad?.modoPrueba ?? false,
  }
}
