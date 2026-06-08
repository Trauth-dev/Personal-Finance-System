"use client"

import { usePathname } from "next/navigation"
import { useUserPlanAccess, getRequiredPlanForRoute, PLAN_LABELS, PLAN_DESCRIPTIONS, type PlanType } from "@/hooks/use-user-plan-access"
import { usePlanTier, isRouteAllowedForBasico } from "@/hooks/use-plan-tier"
import { Lock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PlanAccessGuardProps {
  children: React.ReactNode
}

export function PlanAccessGuard({ children }: PlanAccessGuardProps) {
  const pathname = usePathname()
  const { hasAccess, isLoading, allowedPlans } = useUserPlanAccess()
  const { isBasico, isLoading: isLoadingTier } = usePlanTier()
  
  // Determinar que plan requiere la ruta actual
  const requiredPlan = getRequiredPlanForRoute(pathname)
  
  // Si esta cargando, mostrar loading
  if (isLoading || isLoadingTier) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Restriccion por nivel de plan (basico): bloquear rutas no permitidas
  if (isBasico && !isRouteAllowedForBasico(pathname)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
            <Lock className="w-10 h-10 text-slate-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Función Premium</h1>
            <p className="text-slate-400">
              Esta sección no está incluida en tu <span className="text-cyan-400 font-semibold">Plan Básico</span>
            </p>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
            <p className="text-sm text-slate-300">
              Mejora tu plan para acceder a Diagnóstico Inteligente, Cajas de Ahorro, Deudas, Plan Anti-Deudas,
              Metas, Asesoramiento y más herramientas.
            </p>
          </div>
          <div className="pt-4">
            <Link href="/dashboard/personal">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Para mejorar tu plan, contacta al administrador.
          </p>
        </div>
      </div>
    )
  }
  
  // Si no requiere plan especifico o tiene acceso, mostrar contenido
  if (!requiredPlan || hasAccess(requiredPlan)) {
    return <>{children}</>
  }
  
  // No tiene acceso - mostrar pantalla de bloqueo
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icono de bloqueo */}
        <div className="mx-auto w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
          <Lock className="w-10 h-10 text-slate-400" />
        </div>
        
        {/* Titulo */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Acceso Restringido
          </h1>
          <p className="text-slate-400">
            No tienes acceso al plan <span className="text-cyan-400 font-semibold">{PLAN_LABELS[requiredPlan]}</span>
          </p>
        </div>
        
        {/* Descripcion del plan */}
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <p className="text-sm text-slate-300">
            {PLAN_DESCRIPTIONS[requiredPlan]}
          </p>
        </div>
        
        {/* Planes actuales */}
        {allowedPlans.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Tus planes actuales:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {allowedPlans.map((plan) => (
                <span
                  key={plan}
                  className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-sm border border-cyan-500/20"
                >
                  {PLAN_LABELS[plan]}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Boton de regreso */}
        <div className="pt-4">
          <Link href="/dashboard/personal">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
        
        {/* Nota de contacto */}
        <p className="text-xs text-slate-500">
          Si crees que deberias tener acceso a este plan, contacta al administrador.
        </p>
      </div>
    </div>
  )
}
