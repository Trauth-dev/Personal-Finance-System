"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { NotificacionesPlan } from "@/components/notificaciones-plan"
import { PerfilSelector } from "@/components/perfil-selector"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { EmpresarialSubnav } from "@/components/empresarial/empresarial-subnav"

export function DashboardHeader({ title, description }: { title: string; description?: string }) {
  const { sistemaActivo } = usePerfil()

  return (
    <div className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between px-2 sm:px-4 md:px-6 h-14 sm:h-16 gap-2">
        <div className="flex-1 min-w-0 mr-1">
          <h1 className="text-sm sm:text-lg md:text-xl font-bold text-foreground truncate">{title}</h1>
          {description && <p className="text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:block">{description}</p>}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-shrink-0">
          {sistemaActivo && <PerfilSelector />}

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-10 w-48 lg:w-64 bg-background/50 h-9" />
          </div>

          <NotificacionesPlan />
        </div>
      </div>
      <EmpresarialSubnav />
    </div>
  )
}
