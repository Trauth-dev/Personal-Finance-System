"use client"

import type { ReactNode } from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { MonthSelector } from "@/components/personal/month-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatMoney } from "@/lib/currency"
import type { Cuenta } from "@/lib/dashboard/fuentes/cajas"
import { cn } from "@/lib/utils"

const TODAS = "todas"

interface DashboardPersonalClientProps {
  children: ReactNode
  mes: string
  cajaId: string | null
  moneda: string
  cuentas: Cuenta[]
}

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
      <div className="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-end md:justify-between md:px-6 md:pt-6">
        <MonthSelector value={mes} onChange={(nuevoMes) => navegar(nuevoMes, cajaId)} />

        {cuentas.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="filtro-cuenta" className="text-xs font-medium text-muted-foreground">
              Cuentas y cajas
            </label>
            <Select value={cajaId ?? TODAS} onValueChange={(v) => navegar(mes, v === TODAS ? null : v)}>
              <SelectTrigger id="filtro-cuenta" className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS}>Todas las cuentas</SelectItem>
                {cuentas.map((cuenta) => (
                  <SelectItem key={cuenta.id} value={cuenta.id}>
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="truncate">{cuenta.nombre}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatMoney(cuenta.saldo, cuenta.moneda)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
