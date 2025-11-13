"use client"

import { usePerfil } from "@/lib/contexts/perfil-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ChevronDown, User, Building2, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export function PerfilSelector() {
  const { perfilActual, perfiles, cambiarPerfil, isLoading, sistemaActivo } = usePerfil()
  const router = useRouter()

  if (!sistemaActivo) {
    return null
  }

  if (isLoading || !perfilActual) {
    return <div className="h-9 w-40 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
  }

  const getIconForTipo = (tipo: string) => {
    return tipo === "personal" ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />
  }

  return (
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
        {perfiles.map((perfil) => (
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
  )
}
