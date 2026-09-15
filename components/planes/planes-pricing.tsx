"use client"

import { useState } from "react"
import { Check, Sparkles, ShieldCheck, CreditCard, Headphones, Loader2, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSuscripcion } from "@/hooks/use-suscripcion"
import { formatMoney } from "@/lib/utils"

// Plan unico Prospera+. Se cobra SIEMPRE en guaraníes (PagoPar liquida en PYG).
const PRECIO_PROSPERA = 100000
const formatPrecio = (precio: number) => formatMoney(precio, "PYG")

// Todo lo que incluye el plan unico.
const BENEFICIOS = [
  { nombre: "Dashboard Principal", desc: "Resumen visual de tus finanzas" },
  { nombre: "Perfiles Personal, Empresarial y CRM", desc: "Acceso a todos los espacios de trabajo" },
  { nombre: "Carga de Ingreso y Egreso", desc: "Registra todos tus movimientos" },
  { nombre: "Editar y Eliminar Cargas", desc: "Historial editable de movimientos" },
  { nombre: "Asesoramiento + Herramientas", desc: "Análisis, gráficos y calculadoras" },
  { nombre: "Cajas de Ahorro", desc: "Organiza tu dinero por objetivos" },
  { nombre: "Deudas y Plan Anti-Deudas", desc: "Control, seguimiento y estrategia" },
  { nombre: "Metas y Plan de Acción", desc: "Define y alcanza tus objetivos" },
]

function formatFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })
}

export function PlanesPricing() {
  const { activa, vence, diasRestantes, isLoading, refresh } = useSuscripcion()
  const [procesando, setProcesando] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)
  const [noConfigurado, setNoConfigurado] = useState(false)

  const iniciarPago = async () => {
    setProcesando(true)
    setErrorPago(null)
    setNoConfigurado(false)
    try {
      const res = await fetch("/api/pagopar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "prospera" }),
      })

      if (res.status === 501) {
        setNoConfigurado(true)
        return
      }

      const data = (await res.json()) as { checkoutUrl?: string; error?: string }
      if (!res.ok || !data.checkoutUrl) {
        setErrorPago("No pudimos iniciar el pago. Intentá nuevamente en unos minutos.")
        return
      }

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
            Plan Prospera+
          </span>
          <h2 className="mt-5 text-pretty text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Tu suscripción Prospera+
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
            Un único plan con acceso total a la plataforma. Todas las herramientas para ordenar tu
            dinero, ahorrar, salir de deudas y cumplir tus metas.
          </p>
        </div>

        {/* Estado de la suscripcion */}
        {!isLoading && (
          <div className="mx-auto mt-6 max-w-md">
            {activa ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-emerald-400">Suscripción activa</p>
                  <p className="text-xs text-slate-400">
                    Vence el {formatFecha(vence)} · {diasRestantes} día{diasRestantes === 1 ? "" : "s"} restante
                    {diasRestantes === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-amber-400">Sin suscripción activa</p>
                  <p className="text-xs text-slate-400">Aboná para desbloquear todas las herramientas.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tarjeta del plan unico */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative flex flex-col rounded-2xl border border-[#D4AF37]/60 bg-slate-900 p-6 shadow-[0_0_40px_-12px_rgba(212,175,55,0.45)] sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-[#D4AF37]">Prospera+</h3>
                <p className="mt-1 text-sm text-slate-400">Acceso total a la plataforma</p>
              </div>
              <span className="shrink-0 rounded-full bg-[#D4AF37]/15 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
                Mensual
              </span>
            </div>

            {/* Precio */}
            <div className="mt-5 flex items-end gap-1">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                {formatPrecio(PRECIO_PROSPERA)}
              </span>
              <span className="pb-1 text-sm text-slate-400">/mes</span>
            </div>

            {/* CTA */}
            <div className="mt-6">
              <Button
                onClick={iniciarPago}
                disabled={procesando}
                className="w-full bg-emerald-500 font-semibold text-white hover:bg-emerald-600"
              >
                {procesando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirigiendo a PagoPar...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    {activa ? "Renovar suscripción" : `Pagar ${formatPrecio(PRECIO_PROSPERA)}`}
                  </>
                )}
              </Button>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pago seguro con PagoPar Paraguay
            </p>

            {noConfigurado && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-slate-300">
                <p className="font-medium text-amber-400">Pago en configuración</p>
                <p className="mt-2 text-slate-400">
                  Estamos terminando de conectar la pasarela PagoPar. En breve vas a poder completar el
                  pago con tarjeta, QR o transferencia.
                </p>
              </div>
            )}

            {errorPago && (
              <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorPago}
              </p>
            )}

            {/* Lista de beneficios */}
            <div className="mt-6 border-t border-slate-800 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Qué incluye</p>
              <ul className="space-y-3">
                {BENEFICIOS.map((b) => (
                  <li key={b.nombre} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-[#D4AF37]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-200">{b.nombre}</span>
                      <span className="block text-xs text-slate-500">{b.desc}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Garantias inferiores */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, titulo: "Pago protegido", desc: "Transacciones seguras con PagoPar" },
            { icon: CreditCard, titulo: "Múltiples métodos", desc: "Tarjetas, QR y transferencias" },
            { icon: Headphones, titulo: "Soporte cercano", desc: "Te acompañamos en el proceso" },
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
    </div>
  )
}
