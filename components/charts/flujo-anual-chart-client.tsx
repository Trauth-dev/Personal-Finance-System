"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer } from "@/components/ui/chart"

interface FlujoAnualData {
  mes: string
  ingresos: number
  egresos: number
  balance: number
}

export function FlujoAnualChartClient({ data }: { data: FlujoAnualData[] }) {
  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <CardTitle>Flujo de Caja Anual</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            ingresos: {
              label: "Ingresos",
              color: "hsl(var(--primary))",
            },
            egresos: {
              label: "Egresos",
              color: "hsl(var(--destructive))",
            },
            balance: {
              label: "Balance",
              color: "hsl(var(--accent))",
            },
          }}
          className="h-96"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="ingresos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="egresos" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
              <Bar dataKey="balance" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
