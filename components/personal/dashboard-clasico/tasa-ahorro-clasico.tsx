"use client"

import { AlertCircle, TrendingUp } from "lucide-react"
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"

interface Props {
  ingresos: number
  resultado: number
  moneda: string
}

function mensaje(tasa: number | null) {
  if (tasa === null) return "Sin ingresos registrados este mes"
  if (tasa >= 20) return "Excelente nivel de ahorro"
  if (tasa >= 10) return "Buen ritmo, podés mejorar"
  if (tasa >= 0) return "Ahorro bajo este mes"
  return "Gastaste más de lo que ingresó"
}

export function TasaAhorroClasico({ ingresos, resultado, moneda }: Props) {
  const tasa = ingresos > 0 ? (resultado / ingresos) * 100 : null
  const visible = Math.max(0, Math.min(100, tasa ?? 0))
  const color = tasa === null ? "#64748b" : tasa >= 20 ? "#10b981" : tasa >= 0 ? "#f59e0b" : "#ef4444"
  const datos = [
    { name: "ahorro", value: visible },
    { name: "resto", value: 100 - visible },
  ]

  return (
    <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" aria-hidden="true" />
          Tasa de Ahorro
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative h-48 w-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={datos}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
                isAnimationActive={false}
              >
                <Cell fill={color} stroke="none" />
                <Cell fill="#334155" stroke="none" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold" style={{ color }}>
              {tasa === null ? "—" : `${tasa.toFixed(1)}%`}
            </div>
            <div className="mt-1 text-xs text-slate-400">del ingreso</div>
          </div>
        </div>
        <div className="mt-6 flex w-full flex-col gap-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-2">
            <span className="text-sm text-slate-300">Balance del mes</span>
            <span className={`text-sm font-bold ${resultado >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatMoney(resultado, moneda)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-300">
            {resultado >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-400" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">{mensaje(tasa)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
