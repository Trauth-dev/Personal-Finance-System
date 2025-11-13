"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { formatGuaranies } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

interface DistribucionData {
  name: string
  value: number
}

const COLORS = [
  "hsl(0, 84%, 60%)", // Rojo para el gasto más alto
  "hsl(25, 95%, 53%)", // Naranja
  "hsl(45, 93%, 47%)", // Amarillo
  "hsl(142, 76%, 36%)", // Verde
  "hsl(217, 91%, 60%)", // Azul
]

export function DistribucionGastosChartClient({ data }: { data: DistribucionData[] }) {
  const sortedData = [...data].sort((a, b) => b.value - a.value).slice(0, 5)

  const total = sortedData.reduce((sum, item) => sum + item.value, 0)
  const dataConPorcentaje = sortedData.map((item) => ({
    ...item,
    porcentaje: total > 0 ? (item.value / total) * 100 : 0,
  }))

  const mayorGasto = sortedData[0]

  return (
    <Card className="glass-effect border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Top 5 Categorías de Gastos</CardTitle>
            <CardDescription className="mt-1">Dónde se va tu dinero este mes</CardDescription>
          </div>
          {mayorGasto && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs font-bold text-red-700">Mayor: {mayorGasto.name}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length > 0 ? (
          <>
            <ChartContainer
              config={{
                value: {
                  label: "Monto",
                },
              }}
              className="h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dataConPorcentaje}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 13 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                    formatter={(value: number) => formatGuaranies(value)}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                    {dataConPorcentaje.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList
                      dataKey="porcentaje"
                      position="right"
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      style={{ fontSize: 12, fontWeight: "bold", fill: "hsl(var(--foreground))" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="mt-6 space-y-2">
              <p className="text-sm font-semibold text-slate-700 mb-3">Detalle por Categoría:</p>
              {dataConPorcentaje.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-1 rounded">
                      {item.porcentaje.toFixed(1)}%
                    </span>
                    <span className="text-sm font-bold text-slate-800 min-w-[120px] text-right">
                      {formatGuaranies(item.value)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-2 border-blue-300 mt-4">
                <span className="text-sm font-bold text-blue-700">TOTAL GASTOS</span>
                <span className="text-base font-bold text-blue-600">{formatGuaranies(total)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-80 flex flex-col items-center justify-center text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">No hay datos de gastos para este mes</p>
            <p className="text-xs mt-1">Comienza registrando tus egresos</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
