"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

export type PlanType = "personal" | "empresarial" | "crm"

export interface PlanAccess {
  plan_type: PlanType
  is_active: boolean
  granted_at: string
  expires_at: string | null
  granted_by: string
}

interface UseUserPlanAccessReturn {
  // Lista de planes a los que tiene acceso
  allowedPlans: PlanType[]
  // Todos los accesos con detalles
  planAccesses: PlanAccess[]
  // Estado de carga
  isLoading: boolean
  // Error si ocurrió
  error: string | null
  // Verificar si tiene acceso a un plan específico
  hasAccess: (plan: PlanType) => boolean
  // Verificar si tiene acceso a múltiples planes
  hasAnyAccess: (plans: PlanType[]) => boolean
  // Refrescar los datos
  refresh: () => Promise<void>
}

export function useUserPlanAccess(): UseUserPlanAccessReturn {
  const [planAccesses, setPlanAccesses] = useState<PlanAccess[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccess = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Verificar si hay usuario autenticado
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setPlanAccesses([])
        return
      }

      // Obtener los accesos activos del usuario
      const { data, error: fetchError } = await supabase
        .from("user_plan_access")
        .select("plan_type, is_active, granted_at, expires_at, granted_by")
        .eq("user_id", user.id)
        .eq("is_active", true)

      if (fetchError) {
        throw fetchError
      }

      // Filtrar los que no han expirado
      const now = new Date()
      const validAccesses = (data || []).filter((access: PlanAccess) => {
        if (!access.expires_at) return true // Sin fecha de expiración = válido
        return new Date(access.expires_at) > now
      })

      setPlanAccesses(validAccesses)
    } catch (err) {
      console.error("[useUserPlanAccess] Error fetching plan access:", err)
      setError(err instanceof Error ? err.message : "Error al verificar acceso")
      setPlanAccesses([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccess()
  }, [fetchAccess])

  // Lista de planes permitidos
  const allowedPlans: PlanType[] = planAccesses.map(access => access.plan_type)

  // Verificar si tiene acceso a un plan específico
  const hasAccess = useCallback((plan: PlanType): boolean => {
    return allowedPlans.includes(plan)
  }, [allowedPlans])

  // Verificar si tiene acceso a al menos uno de los planes
  const hasAnyAccess = useCallback((plans: PlanType[]): boolean => {
    return plans.some(plan => allowedPlans.includes(plan))
  }, [allowedPlans])

  return {
    allowedPlans,
    planAccesses,
    isLoading,
    error,
    hasAccess,
    hasAnyAccess,
    refresh: fetchAccess
  }
}

// Mapeo de rutas a planes requeridos
export const ROUTE_PLAN_REQUIREMENTS: Record<string, PlanType> = {
  "/dashboard/personal": "personal",
  "/dashboard/empresarial": "empresarial",
  "/dashboard/crm": "crm",
}

// Obtener el plan requerido para una ruta
export function getRequiredPlanForRoute(pathname: string): PlanType | null {
  // Verificar rutas exactas primero
  if (ROUTE_PLAN_REQUIREMENTS[pathname]) {
    return ROUTE_PLAN_REQUIREMENTS[pathname]
  }
  
  // Verificar si la ruta comienza con alguna de las rutas protegidas
  for (const [route, plan] of Object.entries(ROUTE_PLAN_REQUIREMENTS)) {
    if (pathname.startsWith(route + "/")) {
      return plan
    }
  }
  
  return null // Ruta no requiere plan específico
}

// Labels para mostrar en UI
export const PLAN_LABELS: Record<PlanType, string> = {
  personal: "Personal",
  empresarial: "Empresarial",
  crm: "CRM"
}

// Descripciones de los planes
export const PLAN_DESCRIPTIONS: Record<PlanType, string> = {
  personal: "Gestión de finanzas personales, presupuestos y metas",
  empresarial: "Control de inventario, ventas y proveedores",
  crm: "Gestión de clientes, oportunidades y pipeline de ventas"
}
