"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts"
import { formatMoney } from "@/lib/currency"

export interface FlujoMes {
  mes: string
  ingresos: number
  egresos: number
}

export function FlujoCajaEmpresarialClient({ data }: { data: FlujoMes[] }) {
  const dataConBalance = data.map((item) => ({
    ...item,
    balance: item.ingresos - item.egresos,
  }))

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Flujo de Caja (últimos 6 meses)</CardTitle>
        <CardDescription>Ingresos, egresos y balance mensual real de tu negocio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dataConBalance} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
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
                formatter={(value: number) => formatMoney(value)}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
              <Bar dataKey="ingresos" fill="hsl(142, 76%, 45%)" radius={[6, 6, 0, 0]} name="Ingresos" />
              <Bar dataKey="egresos" fill="hsl(0, 84%, 60%)" radius={[6, 6, 0, 0]} name="Egresos" />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="hsl(258, 90%, 66%)"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(258, 90%, 66%)" }}
                name="Balance"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
