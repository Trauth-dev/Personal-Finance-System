"use client"

import { useState } from "react"
import type { PlanId } from "@/lib/plans/catalogo"

/** Inicia el checkout de PagoPar para el plan elegido. */
export function useCheckoutPagopar() {
  const [procesando, setProcesando] = useState<PlanId | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [noConfigurado, setNoConfigurado] = useState(false)

  const iniciarPago = async (planId: PlanId) => {
    setProcesando(planId)
    setError(null)
    setNoConfigurado(false)
    try {
      const res = await fetch("/api/pagopar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })

      if (res.status === 501) {
        setNoConfigurado(true)
        return
      }

      const data = (await res.json()) as { checkoutUrl?: string }
      if (!res.ok || !data.checkoutUrl) {
        setError("No pudimos iniciar el pago. Intentá nuevamente en unos minutos.")
        return
      }

      // Dentro de un iframe (preview) la pasarela se abre en una pestaña nueva.
      if (window.self !== window.top) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = data.checkoutUrl
      }
    } catch {
      setError("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setProcesando(null)
    }
  }

  return { iniciarPago, procesando, error, noConfigurado }
}
