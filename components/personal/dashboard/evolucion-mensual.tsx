"use client"

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatMoney } from "@/lib/currency"
import type { PuntoEvolucion } from "@/lib/dashboard/personal-dashboard"

const COLORES = {
  ingresos: "#34d399",
  gastos: "hsl(var(--destructive))",
  resultado: "hsl(var(--accent))",
}

const SERIES = [
  { clave: "ingresos", nombre: "Ingresos" },
  { clave: "gastos", nombre: "Gastos" },
  { clave: "resultado", nombre: "Resultado" },
] as const

export function EvolucionMensual({ puntos, moneda }: { puntos: PuntoEvolucion[]; moneda: string }) {
  const compacto = new Intl.NumberFormat("es-PY", { notation: "compact", maximumFractionDigits: 1 })

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
        {SERIES.map((s) => (
          <li key={s.clave} className="flex items-center gap-1.5">
            <span
              className={s.clave === "resultado" ? "h-0.5 w-3 rounded-full" : "size-2.5 rounded-sm"}
              style={{ backgroundColor: COLORES[s.clave] }}
            />
            {s.nombre}
          </li>
        ))}
      </ul>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={puntos} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              tickFormatter={(v: number) => compacto.format(v)}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const punto = payload[0].payload as PuntoEvolucion
                return (
                  <div className="flex flex-col gap-1 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                    <span className="font-medium">{punto.mes}</span>
                    {punto.sinActividad ? (
                      <span className="text-muted-foreground">Sin actividad</span>
                    ) : (
                      SERIES.map((s) => (
                        <span key={s.clave} className="flex items-center justify-between gap-4 tabular-nums">
                          <span className="text-muted-foreground">{s.nombre}</span>
                          {formatMoney(punto[s.clave], moneda)}
                        </span>
                      ))
                    )}
                  </div>
                )
              }}
            />
            <Bar dataKey="ingresos" name="Ingresos" fill={COLORES.ingresos} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Bar dataKey="gastos" name="Gastos" fill={COLORES.gastos} radius={[3, 3, 0, 0]} maxBarSize={22} />
            <Line
              dataKey="resultado"
              name="Resultado"
              type="monotone"
              stroke={COLORES.resultado}
              strokeWidth={2}
              dot={{ r: 3, fill: COLORES.resultado }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
