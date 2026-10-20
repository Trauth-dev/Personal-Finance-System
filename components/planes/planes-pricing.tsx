"use client"

import { Sparkles, ShieldCheck, CreditCard, Headphones, CalendarClock } from "lucide-react"
import { useSuscripcion } from "@/hooks/use-suscripcion"
import { PLANES } from "@/lib/plans/catalogo"
import { PlanCards } from "@/components/planes/plan-cards"

function formatFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })
}

export function PlanesPricing() {
  const { activa, exento, plan, vence, diasRestantes, isLoading } = useSuscripcion()

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

      <div className="relative flex flex-col gap-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Planes Prospera+
          </span>
          <h2 className="mt-5 text-pretty text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Elegí el plan para tus finanzas
          </h2>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
            Ordená tus finanzas personales con Prospera+ Personal, o sumá la gestión de tu negocio y tus
            clientes con Prospera+ Total.
          </p>
        </div>

        {!isLoading && (
          <div className="mx-auto w-full max-w-md">
            {activa ? (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold text-emerald-400">
                    {exento ? "Acceso Total habilitado" : `${PLANES[plan ?? "total"].nombre} activo`}
                  </p>
                  <p className="text-xs text-slate-400">
                    {exento
                      ? "Tu cuenta tiene acceso completo sin vencimiento."
                      : `Vence el ${formatFecha(vence)} · ${diasRestantes} día${diasRestantes === 1 ? "" : "s"} restante${diasRestantes === 1 ? "" : "s"}`}
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
                  <p className="text-xs text-slate-400">Elegí un plan para desbloquear las herramientas.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {!exento && <PlanCards planActual={isLoading ? null : plan} />}

        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, titulo: "Pago protegido", desc: "Transacciones seguras con PagoPar" },
            { icon: CreditCard, titulo: "Múltiples métodos", desc: "Tarjetas, QR y transferencias" },
            { icon: Headphones, titulo: "Soporte cercano", desc: "Te acompañamos en el proceso" },
          ].map((g) => (
            <div key={g.titulo} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
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
