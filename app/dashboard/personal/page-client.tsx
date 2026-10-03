"use client"

import type { ReactNode } from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { LayoutGrid, PiggyBank } from "lucide-react"
import { MonthSelector } from "@/components/personal/month-selector"
import { formatMoney } from "@/lib/currency"
import type { Cuenta } from "@/lib/dashboard/fuentes/cajas"
import { cn } from "@/lib/utils"

interface DashboardPersonalClientProps {
  children: ReactNode
  mes: string
  cajaId: string | null
  cuentas: Cuenta[]
}

const chipInactivo = "bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground"

export function DashboardPersonalClient({ children, mes, cajaId, cuentas }: DashboardPersonalClientProps) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()

  const navegar = (nuevoMes: string, nuevaCaja: string | null) => {
    const params = new URLSearchParams({ month: nuevoMes })
    if (nuevaCaja) params.set("caja", nuevaCaja)
    startTransition(() => router.push(`/dashboard/personal?${params.toString()}`, { scroll: false }))
  }

  return (
    <div>
      <div className="flex flex-col gap-3 p-4 pb-0 md:p-6 md:pb-0">
        <MonthSelector value={mes} onChange={(nuevoMes) => navegar(nuevoMes, cajaId)} />

        {cuentas.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Filtrar por cuenta:</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por cuenta">
              <button
                type="button"
                aria-pressed={!cajaId}
                onClick={() => navegar(mes, null)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border-2 px-3.5 py-2 text-xs font-semibold transition-all",
                  !cajaId ? "border-primary bg-primary text-primary-foreground shadow-sm" : chipInactivo,
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Total General
              </button>
              {cuentas.map((cuenta) => {
                const activa = cajaId === cuenta.id
                return (
                  <button
                    type="button"
                    key={cuenta.id}
                    aria-pressed={activa}
                    onClick={() => navegar(mes, cuenta.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-xs font-semibold transition-all",
                      activa ? "border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm" : chipInactivo,
                    )}
                  >
                    <PiggyBank className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="flex flex-col items-start">
                      <span>{cuenta.nombre}</span>
                      <span className={cn("text-[10px] font-normal", activa ? "text-cyan-400/70" : "text-muted-foreground/60")}>
                        {formatMoney(cuenta.saldo, cuenta.moneda)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div
        aria-busy={pendiente}
        className={cn("transition-opacity duration-200", pendiente && "pointer-events-none opacity-60")}
      >
        {children}
      </div>
    </div>
  )
}
