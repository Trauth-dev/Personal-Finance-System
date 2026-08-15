"use client"

import { useState } from "react"
import { Check, X, Sparkles, ShieldCheck, CreditCard, Headphones, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePlanTier } from "@/hooks/use-plan-tier"
import { formatMoney } from "@/lib/utils"
import { cn } from "@/lib/utils"

// Los planes se cobran SIEMPRE en guaraníes (PagoPar liquida en PYG), por eso
// el precio se muestra fijo en guaraníes sin importar la moneda del usuario.
const formatPrecioPlan = (precio: number) => formatMoney(precio, "PYG")

// Secciones del perfil Personal. `basico` indica si esta incluida en el Plan Basico.
// (Se excluye "Diagnostico Inteligente" a proposito, se retirara mas adelante.)
const SECCIONES = [
  { nombre: "Dashboard Principal", desc: "Resumen visual de tus finanzas", basico: true },
  { nombre: "Carga de Ingreso y Egreso", desc: "Registra tus ingresos y egresos", basico: true },
  { nombre: "Editar y Eliminar Cargas", desc: "Historial editable de movimientos", basico: true },
  { nombre: "Asesoramiento + Herramientas", desc: "Analisis, graficos y calculadoras", basico: true },
  { nombre: "Cajas de Ahorro", desc: "Organiza tu dinero por objetivos", basico: false },
  { nombre: "Deudas", desc: "Control y seguimiento de tus deudas", basico: false },
  { nombre: "Plan Anti-Deudas", desc: "Estrategia para salir de deudas", basico: false },
  { nombre: "Metas y Plan de Accion", desc: "Define y alcanza tus objetivos", basico: false },
]

type PlanId = "basico" | "completo"

interface PlanDef {
  id: PlanId
  nombre: string
  precio: number
  tagline: string
  descripcion: string
  recomendado: boolean
}

const PLANES: PlanDef[] = [
  {
    id: "basico",
    nombre: "Plan Basico",
    precio: 89000,
    tagline: "Para empezar a ordenar tus finanzas",
    descripcion:
      "Ideal para tener claridad de tus ingresos y egresos y comenzar a tomar el control de tu dinero.",
    recomendado: false,
  },
  {
    id: "completo",
    nombre: "Plan Completo",
    precio: 150000,
    tagline: "Para dominar por completo tus finanzas",
    descripcion:
      "Todas las herramientas: ahorro, deudas, plan anti-deudas y metas con acompanamiento completo.",
    recomendado: true,
  },
]

export function PlanesPricing() {
  const { tier, isLoading } = usePlanTier()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanDef | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const [noConfigurado, setNoConfigurado] = useState(false)

  const handleSelectPlan = (plan: PlanDef) => {
    setPlanSeleccionado(plan)
    setErrorPago(null)
    setNoConfigurado(false)
    setDialogOpen(true)
  }

  // Llama al backend para crear la transacción en PagoPar y redirige a la
  // pasarela de pago. El cobro es siempre en guaraníes (PagoPar liquida en PYG).
  const iniciarPago = async () => {
    if (!planSeleccionado) return
    setProcesando(true)
    setErrorPago(null)
    setNoConfigurado(false)
    try {
      const res = await fetch("/api/pagopar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: planSeleccionado.id }),
      })

      if (res.status === 501) {
        // Credenciales de PagoPar aún no cargadas.
        setNoConfigurado(true)
        return
      }

      const data = (await res.json()) as { checkoutUrl?: string; error?: string }
      if (!res.ok || !data.checkoutUrl) {
        setErrorPago("No pudimos iniciar el pago. Intentá nuevamente en unos minutos.")
        return
      }

      // Redirigir a la pasarela. Si estamos dentro de un iframe (preview),
      // abrimos en una pestaña nueva.
      if (window.self !== window.top) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = data.checkoutUrl
      }
    } catch {
      setErrorPago("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-5 sm:p-8 lg:p-12">
      {/* Fondo decorativo sutil */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px circle at 15% 0%, rgba(16,185,129,0.12), transparent 45%), radial-gradient(600px circle at 85% 10%, rgba(0,85,164,0.16), transparent 45%)",
        }}
      />

      <div className="relative">
        {/* Encabezado */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Planes Prospera+
          </span>
          <h2 className="mt-5 text-pretty text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Elige el plan ideal para ti
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
            Potencia tu manejo financiero. Empieza con lo esencial o desbloquea todas las
            herramientas para ahorrar, salir de deudas y cumplir tus metas.
          </p>
        </div>

        {/* Tarjetas de planes */}
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {PLANES.map((plan) => {
            const esActual = !isLoading && tier === plan.id
            const esRecomendado = plan.recomendado

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-6 sm:p-7 transition-all",
                  esRecomendado
                    ? "border-[#D4AF37]/60 bg-slate-900 shadow-[0_0_40px_-12px_rgba(212,175,55,0.45)] md:-translate-y-2"
                    : "border-emerald-500/25 bg-slate-900/70 hover:border-emerald-500/50",
                )}
              >
                {/* Cinta Recomendado */}
                {esRecomendado && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#D4AF37] px-4 py-1 text-xs font-bold uppercase tracking-wide text-slate-900 shadow-md">
                    Recomendado
                  </span>
                )}

                {/* Nombre + tagline */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "text-xl font-bold",
                        esRecomendado ? "text-[#D4AF37]" : "text-emerald-400",
                      )}
                    >
                      {plan.nombre}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      esRecomendado
                        ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                        : "bg-emerald-500/15 text-emerald-400",
                    )}
                  >
                    Mensual
                  </span>
                </div>

                {/* Precio */}
                <div className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-white">
                    {formatPrecioPlan(plan.precio)}
                  </span>
                  <span className="pb-1 text-sm text-slate-400">/mes</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{plan.descripcion}</p>

                {/* CTA */}
                <div className="mt-6">
                  {esActual ? (
                    <Button
                      disabled
                      className="w-full cursor-default border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-800"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Tu plan actual
                    </Button>
                  ) : esRecomendado ? (
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full bg-[#D4AF37] font-semibold text-slate-900 hover:bg-[#c39f2e]"
                    >
                      Mejorar a {plan.nombre}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      className="w-full bg-emerald-500 font-semibold text-white hover:bg-emerald-600"
                    >
                      Elegir {plan.nombre}
                    </Button>
                  )}
                </div>

                {/* Nota de pago */}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pago seguro con PagoPar Paraguay
                </p>

                {/* Lista de secciones */}
                <div className="mt-6 border-t border-slate-800 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Que incluye
                  </p>
                  <ul className="space-y-3">
                    {SECCIONES.map((sec) => {
                      const incluida = plan.id === "completo" ? true : sec.basico
                      return (
                        <li key={sec.nombre} className="flex items-start gap-3">
                          <span
                            className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              incluida
                                ? esRecomendado
                                  ? "bg-[#D4AF37]/20 text-[#D4AF37]"
                                  : "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-600",
                            )}
                          >
                            {incluida ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm font-medium",
                                incluida ? "text-slate-200" : "text-slate-500 line-through",
                              )}
                            >
                              {sec.nombre}
                            </span>
                            <span
                              className={cn(
                                "block text-xs",
                                incluida ? "text-slate-500" : "text-slate-600",
                              )}
                            >
                              {sec.desc}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>

        {/* Garantias inferiores */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, titulo: "Pago protegido", desc: "Transacciones seguras con PagoPar" },
            { icon: CreditCard, titulo: "Multiples metodos", desc: "Tarjetas, QR y transferencias" },
            { icon: Headphones, titulo: "Soporte cercano", desc: "Te acompanamos en el proceso" },
          ].map((g) => (
            <div
              key={g.titulo}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0055A4]/20 text-[#5b9bd5]">
                <g.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{g.titulo}</p>
                <p className="text-xs text-slate-400">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogo "proximamente" (placeholder hasta integrar PagoPar) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#D4AF37]" />
              {planSeleccionado?.nombre}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {planSeleccionado && (
                <>
                  Estas a un paso de mejorar tu plan a{" "}
                  <span className="font-semibold text-white">{planSeleccionado.nombre}</span> por{" "}
                  <span className="font-semibold text-emerald-400">
                    {formatPrecioPlan(planSeleccionado.precio)}/mes
                  </span>
                  .
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {noConfigurado ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-slate-300">
              <p className="font-medium text-amber-400">Pago en configuración</p>
              <p className="mt-2 text-slate-400">
                Estamos terminando de conectar la pasarela PagoPar. En breve vas a poder completar la
                mejora de tu plan con tarjeta, QR o transferencia.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#0055A4]/30 bg-[#0055A4]/10 p-4 text-sm text-slate-300">
              <p className="flex items-center gap-2 font-medium text-[#5b9bd5]">
                <ShieldCheck className="h-4 w-4" />
                Pago seguro con PagoPar
              </p>
              <p className="mt-2 text-slate-400">
                Vas a ser redirigido a la pasarela de PagoPar para pagar con tarjeta, QR o
                transferencia. El cobro se realiza en guaraníes (Gs).
              </p>
            </div>
          )}

          {errorPago && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errorPago}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {noConfigurado ? (
              <Button
                onClick={() => setDialogOpen(false)}
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                Entendido
              </Button>
            ) : (
              <Button
                onClick={iniciarPago}
                disabled={procesando}
                className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
              >
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirigiendo a PagoPar...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pagar {planSeleccionado && formatPrecioPlan(planSeleccionado.precio)}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
