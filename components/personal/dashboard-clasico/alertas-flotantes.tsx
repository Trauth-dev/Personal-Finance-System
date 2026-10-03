"use client"

import { useState } from "react"
import { AlertTriangle, Bell, CalendarClock, X } from "lucide-react"
import { formatMoney } from "@/lib/currency"
import type { Aviso } from "@/lib/dashboard/personal-dashboard"

function texto(aviso: Aviso, moneda: string) {
  switch (aviso.tipo) {
    case "presupuesto_excedido":
      return `Excediste el presupuesto de ${aviso.categoria} por ${formatMoney(aviso.excedente, moneda)}.`
    case "presupuesto_cerca":
      return `Te queda ${aviso.porcentajeRestante.toFixed(0)}% del presupuesto de ${aviso.categoria}.`
    case "proximo_pago": {
      const cuando =
        aviso.dias < 0 ? `venció hace ${Math.abs(aviso.dias)} día(s)` : aviso.dias === 0 ? "vence hoy" : `vence en ${aviso.dias} día(s)`
      return `${aviso.nombre}: pago de ${formatMoney(aviso.monto, moneda)} ${cuando}.`
    }
  }
}

export function AlertasFlotantes({ avisos, moneda }: { avisos: Aviso[]; moneda: string }) {
  const [descartados, setDescartados] = useState<string[]>([])
  const [abierto, setAbierto] = useState(true)
  const visibles = avisos.filter((a) => !descartados.includes(a.id))

  if (visibles.length === 0) return null

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="fixed bottom-20 right-5 z-40 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-600"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {visibles.length} alerta{visibles.length > 1 ? "s" : ""}
      </button>
    )
  }

  return (
    <aside
      aria-label="Alertas financieras"
      className="fixed bottom-20 right-5 z-40 flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2 rounded-xl border-2 border-amber-200 bg-white p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <Bell className="h-4 w-4 text-amber-500" aria-hidden="true" />
          Alertas financieras
        </p>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Minimizar alertas"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
        {visibles.map((aviso) => {
          const pago = aviso.tipo === "proximo_pago"
          const Icono = pago ? CalendarClock : AlertTriangle
          const estilo =
            aviso.tipo === "presupuesto_excedido"
              ? "border-red-200 bg-red-50 text-red-800"
              : pago
                ? "border-blue-200 bg-blue-50 text-blue-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          return (
            <li key={aviso.id} className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${estilo}`}>
              <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 leading-relaxed">{texto(aviso, moneda)}</p>
              <button
                type="button"
                onClick={() => setDescartados((d) => [...d, aviso.id])}
                className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
                aria-label="Descartar alerta"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
