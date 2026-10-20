"use client"

import { usePathname } from "next/navigation"
import { Lock, Sparkles, ArrowLeft } from "lucide-react"
import { useSuscripcion } from "@/hooks/use-suscripcion"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { createClient } from "@/lib/supabase/client"
import { rutaRequierePlanTotal } from "@/lib/plans/catalogo"
import { PlanCards } from "@/components/planes/plan-cards"

interface PlanAccessGuardProps {
  children: React.ReactNode
}

/**
 * Muro de pago de Prospera+.
 * - Sin suscripción vigente: muestra los planes Personal y Total.
 * - Plan Personal intentando usar Empresarial o CRM: ofrece mejorar a Total.
 */
export function PlanAccessGuard({ children }: PlanAccessGuardProps) {
  const { activa, plan, accesoTotal, isLoading } = useSuscripcion()
  const { perfilActual, perfiles, cambiarPerfil } = usePerfil()
  const pathname = usePathname()

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  const usaPerfilNegocio =
    rutaRequierePlanTotal(pathname) || (perfilActual != null && perfilActual.tipo !== "personal")

  if (activa && (accesoTotal || !usaPerfilNegocio)) {
    return <>{children}</>
  }

  const perfilPersonal = perfiles.find((p) => p.tipo === "personal")
  const esMejora = activa && plan === "personal"

  const cerrarSesion = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/auth/login"
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-6 sm:p-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(600px circle at 20% 0%, rgba(16,185,129,0.14), transparent 45%), radial-gradient(600px circle at 90% 10%, rgba(0,85,164,0.16), transparent 45%)",
          }}
        />

        <div className="relative flex flex-col gap-8">
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <Lock className="h-7 w-7 text-emerald-400" />
            </div>
            <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              {esMejora ? "Disponible en Prospera+ Total" : "Planes Prospera+"}
            </span>
            <h1 className="mt-4 text-balance text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {esMejora ? "Mejorá a Total para usar este perfil" : "Activá tu suscripción para continuar"}
            </h1>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-400">
              {esMejora
                ? "Tu plan Personal incluye el perfil Personal completo. Los perfiles Empresarial y CRM forman parte de Prospera+ Total."
                : "Elegí el plan que mejor se adapta a vos. Podés mejorar a Total en cualquier momento."}
            </p>
          </div>

          <PlanCards planActual={plan} planes={esMejora ? ["total"] : ["personal", "total"]} />

          <div className="flex flex-col items-center gap-3">
            {esMejora && perfilPersonal && (
              <button
                onClick={() => cambiarPerfil(perfilPersonal.id)}
                className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a mi perfil Personal
              </button>
            )}
            {!activa && (
              <button
                onClick={cerrarSesion}
                className="text-xs text-slate-500 underline-offset-4 hover:text-slate-300 hover:underline"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
