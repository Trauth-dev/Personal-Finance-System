"use client"

import { usePerfil } from "@/lib/contexts/perfil-context"
import { useUserPlanAccess, PLAN_LABELS } from "@/hooks/use-user-plan-access"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, User, Building2, Settings, Lock, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function PerfilSelector() {
  const { perfilActual, perfiles, cambiarPerfil, isLoading, sistemaActivo } = usePerfil()
  const { hasAccess, isLoading: isLoadingAccess } = useUserPlanAccess()
  const router = useRouter()

  if (!sistemaActivo) {
    return null
  }

  if (isLoading || isLoadingAccess || !perfilActual) {
    return <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
  }

  const getIconForTipo = (tipo: string) => {
    switch (tipo) {
      case "personal":
        return <User className="h-4 w-4" />
      case "empresarial":
        return <Building2 className="h-4 w-4" />
      case "crm":
        return <Users className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  // Filtrar perfiles segun acceso del usuario
  const perfilesConAcceso = perfiles.filter(perfil => hasAccess(perfil.tipo as 'personal' | 'empresarial' | 'crm'))
  const perfilesSinAcceso = perfiles.filter(perfil => !hasAccess(perfil.tipo as 'personal' | 'empresarial' | 'crm'))

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-[180px] justify-between bg-transparent"
            style={{
              borderColor: perfilActual.color,
              backgroundColor: `${perfilActual.color}10`,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: perfilActual.color }}
              >
                {getIconForTipo(perfilActual.tipo)}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm">{perfilActual.nombre}</span>
                <span className="text-xs text-muted-foreground capitalize">{perfilActual.tipo}</span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Cambiar Perfil</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {/* Perfiles con acceso */}
          {perfilesConAcceso.map((perfil) => (
            <DropdownMenuItem
              key={perfil.id}
              onClick={() => cambiarPerfil(perfil.id)}
              className="flex items-center gap-3 cursor-pointer py-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{ backgroundColor: perfil.color }}
              >
                {getIconForTipo(perfil.tipo)}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{perfil.nombre}</div>
                <div className="text-xs text-muted-foreground capitalize">{perfil.tipo}</div>
              </div>
              {perfilActual.id === perfil.id && <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
            </DropdownMenuItem>
          ))}
          
          {/* Perfiles bloqueados (sin acceso) */}
          {perfilesSinAcceso.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Sin acceso
              </DropdownMenuLabel>
              {perfilesSinAcceso.map((perfil) => (
                <Tooltip key={perfil.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 py-3 px-2 opacity-50 cursor-not-allowed">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 relative"
                        style={{ backgroundColor: perfil.color }}
                      >
                        {getIconForTipo(perfil.tipo)}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-900">
                          <Lock className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-muted-foreground">{perfil.nombre}</div>
                        <div className="text-xs text-muted-foreground capitalize">{perfil.tipo}</div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>No tienes acceso al plan {PLAN_LABELS[perfil.tipo as keyof typeof PLAN_LABELS] || perfil.tipo}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/perfiles")}
            className="flex items-center gap-2 cursor-pointer text-primary"
          >
            <Settings className="h-4 w-4" />
            Configurar Perfiles
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
