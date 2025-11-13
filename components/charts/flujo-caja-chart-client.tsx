"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts"
import { ChartContainer } from "@/components/ui/chart"
import { formatGuaranies } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface FlujoCajaData {
  mes: string
  ingresos: number
  egresos: number
}

export function FlujoCajaChartClient({ data }: { data: FlujoCajaData[] }) {
  const dataConBalance = data.map((item) => ({
    ...item,
    balance: item.ingresos - item.egresos,
  }))

  const mesActual = dataConBalance[0]
  const balanceActual = mesActual.balance
  const esPositivo = balanceActual >= 0

  return (
    <Card className="glass-effect border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Ingresos vs Egresos del Mes</CardTitle>
            <CardDescription className="mt-1">Comparación clara de tu situación financiera actual</CardDescription>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${esPositivo ? "bg-green-100" : "bg-red-100"}`}
          >
            {esPositivo ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-bold ${esPositivo ? "text-green-700" : "text-red-700"}`}>
              {esPositivo ? "Superávit" : "Déficit"}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            ingresos: {
              label: "Ingresos",
              color: "hsl(142, 76%, 36%)", // Verde
            },
            egresos: {
              label: "Egresos",
              color: "hsl(0, 84%, 60%)", // Rojo
            },
            balance: {
              label: "Balance",
              color: "hsl(217, 91%, 60%)", // Azul
            },
          }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataConBalance} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
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
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
              <Bar dataKey="ingresos" fill="hsl(142, 76%, 36%)" radius={[8, 8, 0, 0]} name="Ingresos" />
              <Bar dataKey="egresos" fill="hsl(0, 84%, 60%)" radius={[8, 8, 0, 0]} name="Egresos" />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={3}
                dot={{ r: 5, fill: "hsl(217, 91%, 60%)" }}
                name="Balance (Ahorro)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs font-medium text-green-700 mb-1">Ingresos</p>
            <p className="text-lg font-bold text-green-600">{formatGuaranies(mesActual.ingresos)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <p className="text-xs font-medium text-red-700 mb-1">Egresos</p>
            <p className="text-lg font-bold text-red-600">{formatGuaranies(mesActual.egresos)}</p>
          </div>
          <div
            className={`text-center p-3 rounded-lg border ${esPositivo ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}
          >
            <p className={`text-xs font-medium mb-1 ${esPositivo ? "text-blue-700" : "text-orange-700"}`}>Balance</p>
            <p className={`text-lg font-bold ${esPositivo ? "text-blue-600" : "text-orange-600"}`}>
              {formatGuaranies(Math.abs(balanceActual))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
