"use client"

import { useEffect, useState } from "react"
import { Loader2, ShieldCheck } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { PLANES } from "@/lib/plans/catalogo"
import { formatMoney } from "@/lib/utils"
import type { SesionBancard } from "@/hooks/use-checkout-bancard"

declare global {
  interface Window {
    Bancard?: { Checkout: { createForm: (containerId: string, processId: string, options?: Record<string, unknown>) => void } }
  }
}

const CONTENEDOR = "bancard-iframe-container"

function cargarScript(src: string): Promise<void> {
  const existente = document.querySelector<HTMLScriptElement>(`script[data-bancard="${src}"]`)
  if (existente && window.Bancard) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = existente ?? document.createElement("script")
    s.src = src
    s.async = true
    s.dataset.bancard = src
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("No se pudo cargar Bancard"))
    if (!existente) document.body.appendChild(s)
  })
}

interface Props {
  sesion: SesionBancard | null
  modoPrueba: boolean
  onClose: () => void
}

/** Formulario oficial de Bancard (iframe): los datos de la tarjeta nunca pasan por nuestro servidor. */
export function BancardCheckoutDialog({ sesion, modoPrueba, onClose }: Props) {
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando")

  useEffect(() => {
    if (!sesion) return
    let cancelado = false
    setEstado("cargando")
    cargarScript(sesion.scriptUrl)
      .then(() => {
        if (cancelado || !window.Bancard) return
        const contenedor = document.getElementById(CONTENEDOR)
        if (contenedor) contenedor.innerHTML = ""
        window.Bancard.Checkout.createForm(CONTENEDOR, sesion.processId, {
          styles: { "form-background-color": "#0f172a", "button-background-color": "#10b981", "button-text-color": "#ffffff" },
        })
        setEstado("listo")
      })
      .catch(() => !cancelado && setEstado("error"))
    return () => {
      cancelado = true
    }
  }, [sesion])

  const plan = sesion ? PLANES[sesion.planId] : null

  return (
    <Dialog open={Boolean(sesion)} onOpenChange={(abierto) => !abierto && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? `Pagar ${plan.nombre}` : "Pago"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {plan ? `${formatMoney(plan.monto, "PYG")} por 30 días. ` : ""}
            Pago procesado por Bancard.
          </DialogDescription>
        </DialogHeader>

        {modoPrueba && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-300">
            Modo de prueba (staging): no se realizan cobros reales. Usá las tarjetas de prueba de Bancard.
          </p>
        )}

        {estado === "cargando" && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400" role="status">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando formulario seguro...
          </div>
        )}
        {estado === "error" && (
          <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            No se pudo cargar el formulario de Bancard. Revisá tu conexión e intentá de nuevo.
          </p>
        )}

        <div id={CONTENEDOR} className="min-h-80 w-full" />

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Tus datos de tarjeta los recibe Bancard directamente.
        </p>
      </DialogContent>
    </Dialog>
  )
}
