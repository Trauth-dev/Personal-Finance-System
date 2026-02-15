"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { MonthSelector } from "@/components/personal/month-selector"
import { useEffect, useState } from "react"
import { PiggyBank, LayoutGrid } from "lucide-react"
import { formatGuaranies } from "@/lib/utils"

interface CajaAhorro {
  id: string
  nombre: string
  tipo: string
  banco: string | null
  monto_actual: number
  color: string | null
  icono: string | null
}

interface DashboardPersonalClientProps {
  children: React.ReactNode
  initialMonth: string
  cajas?: CajaAhorro[]
}

export function DashboardPersonalClient({ children, initialMonth, cajas = [] }: DashboardPersonalClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMonth = searchParams.get("month") || initialMonth
  const currentCaja = searchParams.get("caja") || null
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    setSelectedMonth(currentMonth)
  }, [currentMonth])

  const buildUrl = (month: string, caja: string | null) => {
    const params = new URLSearchParams()
    params.set("month", month)
    if (caja) params.set("caja", caja)
    return `/dashboard/personal?${params.toString()}`
  }

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
    router.push(buildUrl(newMonth, currentCaja))
  }

  const handleCajaChange = (cajaId: string | null) => {
    router.push(buildUrl(currentMonth, cajaId))
  }

  return (
    <div>
      <div className="p-4 md:p-6 pb-0 space-y-3">
        <MonthSelector value={selectedMonth} onChange={handleMonthChange} />

        {/* Filtro de Cajas de Ahorro */}
        {cajas.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Filtrar por cuenta:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleCajaChange(null)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                  !currentCaja
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Total General
              </button>
              {cajas.map((caja) => (
                <button
                  key={caja.id}
                  onClick={() => handleCajaChange(caja.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                    currentCaja === caja.id
                      ? "border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm"
                      : "bg-card text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                  }`}
                >
                  <PiggyBank className="w-3.5 h-3.5" />
                  <div className="flex flex-col items-start">
                    <span>{caja.nombre}</span>
                    <span className={`text-[10px] font-normal ${currentCaja === caja.id ? "text-cyan-400/70" : "text-muted-foreground/60"}`}>
                      {formatGuaranies(caja.monto_actual)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div key={`${currentMonth}-${currentCaja || "all"}`}>{children}</div>
    </div>
  )
}
