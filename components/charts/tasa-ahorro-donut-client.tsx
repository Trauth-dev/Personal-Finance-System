"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { formatGuaranies } from "@/lib/utils"
import { TrendingUp, AlertCircle } from "lucide-react"

interface TasaAhorroDonutClientProps {
  tasaAhorro: number
  balance: number
}

export function TasaAhorroDonutClient({ tasaAhorro, balance }: TasaAhorroDonutClientProps) {
  const tasaAhorroAjustada = Math.max(0, Math.min(100, tasaAhorro))
  const data = [
    { name: "Ahorro", value: tasaAhorroAjustada },
    { name: "Restante", value: 100 - tasaAhorroAjustada },
  ]

  // Color based on savings rate
  const getColor = () => {
    if (tasaAhorroAjustada >= 30) return "#10b981" // Green - Excellent
    if (tasaAhorroAjustada >= 20) return "#22c55e" // Light green - Good
    if (tasaAhorroAjustada >= 10) return "#eab308" // Yellow - Fair
    return "#ef4444" // Red - Poor
  }

  const mainColor = getColor()
  const COLORS = [mainColor, "#1e293b"]

  const getMessage = () => {
    if (tasaAhorroAjustada >= 30) return "¡Excelente gestión!"
    if (tasaAhorroAjustada >= 20) return "Muy buen ahorro"
    if (tasaAhorroAjustada >= 10) return "Puedes mejorar"
    return "Intenta ahorrar más"
  }

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 shadow-xl">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Tasa de Ahorro
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6">
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                startAngle={90}
                endAngle={-270}
                paddingAngle={0}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold" style={{ color: mainColor }}>
              {tasaAhorroAjustada.toFixed(1)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">del ingreso</div>
          </div>
        </div>

        <div className="mt-6 w-full space-y-3">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 rounded-lg">
            <span className="text-sm text-slate-300">Balance del mes</span>
            <span className={`text-sm font-bold ${balance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatGuaranies(balance)}
            </span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-300">
            {balance >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm font-medium">{getMessage()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
