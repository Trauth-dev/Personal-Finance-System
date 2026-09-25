"use client"

import { useState } from "react"
import { useSuscripcion } from "@/hooks/use-suscripcion"
import { Lock, ShieldCheck, CreditCard, Loader2, Sparkles, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { formatMoney } from "@/lib/utils"

interface PlanAccessGuardProps {
  children: React.ReactNode
}

// Precio del plan unico Prospera+ (guaraníes). PagoPar liquida en PYG.
const PRECIO_PROSPERA = 100000

const BENEFICIOS = [
  "Acceso a los perfiles Personal, Empresarial y CRM",
  "Carga de ingresos y egresos ilimitada",
  "Cajas de ahorro, deudas y plan anti-deudas",
  "Metas, presupuesto y asesoramiento con herramientas",
  "Todas las funciones actuales y futuras del plan",
]

/**
 * Muro de pago (paywall) de Prospera+.
 *
 * Modelo de plan unico: si el usuario tiene la suscripcion activa
 * (profiles.suscripcion_vence > ahora), ve la app completa. Si no pago o su
 * suscripcion vencio, ve esta pantalla con el boton para pagar via PagoPar.
 */
export function PlanAccessGuard({ children }: PlanAccessGuardProps) {
  const { activa, isLoading } = useSuscripcion()
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noConfigurado, setNoConfigurado] = useState(false)

  const iniciarPago = async () => {
    setProcesando(true)
    setError(null)
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
        setError("No pudimos iniciar el pago. Intentá nuevamente en unos minutos.")
        return
      }

      // Redirigir a la pasarela. Dentro de un iframe (preview) abrimos pestaña nueva.
      if (window.self !== window.top) {
        window.open(data.checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = data.checkoutUrl
      }
    } catch {
      setError("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setProcesando(false)
    }
  }

  const cerrarSesion = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  // Cargando estado de la suscripcion
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  // Suscripcion activa: acceso completo
  if (activa) {
    return <>{children}</>
  }

  // Sin suscripcion activa: muro de pago
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(600px circle at 90% 10%, rgba(0,85,164,0.16), transparent 45%)",
          }}
        />

        <div className="relative">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <Lock className="h-8 w-8 text-emerald-400" />
          </div>

          <div className="mt-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              Plan Prospera+
            </span>
            <h1 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Activá tu suscripción para continuar
            </h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400">
              Prospera+ es una suscripción mensual con acceso total a la plataforma. Aboná para
              desbloquear todas las herramientas.
            </p>
          </div>

          {/* Precio */}
          <div className="mt-6 flex items-end justify-center gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-white">
              {formatMoney(PRECIO_PROSPERA, "PYG")}
            </span>
            <span className="pb-1 text-sm text-slate-400">/mes</span>
          </div>

          {/* Beneficios */}
          <ul className="mx-auto mt-6 max-w-sm space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm text-slate-300">{b}</span>
              </li>
            ))}
          </ul>

          {noConfigurado && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
              <p className="font-medium text-amber-400">Pago en configuración</p>
              <p className="mt-2 text-slate-400">
                Estamos terminando de conectar la pasarela PagoPar. En breve vas a poder completar el
                pago con tarjeta, QR o transferencia.
              </p>
            </div>
          )}

          {error && (
            <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
              {error}
            </p>
          )}

          {/* CTA */}
          <div className="mt-7 space-y-3">
            <Button
              onClick={iniciarPago}
              disabled={procesando}
              className="w-full bg-emerald-500 py-6 text-base font-semibold text-white hover:bg-emerald-600"
            >
              {procesando ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Redirigiendo a PagoPar...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Pagar {formatMoney(PRECIO_PROSPERA, "PYG")}
                </>
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              Pago seguro con PagoPar Paraguay — tarjetas, QR y transferencias
            </p>

            <button
              onClick={cerrarSesion}
              className="mx-auto block text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
