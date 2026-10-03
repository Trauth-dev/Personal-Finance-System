import { AlertTriangle, BarChart3, TrendingDown, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { ErrorDeCarga } from "@/components/personal/dashboard/indicador"
import { etiquetaComparacion } from "./variacion"
import { TasaAhorroClasico } from "./tasa-ahorro-clasico"

const PALETA = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#64748b"]

export function SuperavitClasico({ data }: { data: PersonalDashboardData }) {
  if (!data.movimientos.ok) {
    return (
      <Card className="border-0 bg-gradient-to-br from-slate-700 to-slate-800 shadow-xl">
        <CardContent className="p-6">
          <ErrorDeCarga />
        </CardContent>
      </Card>
    )
  }

  const { resumen, variacionResultado, comparacionParcial } = data.movimientos.data
  const esSuperavit = resumen.resultado >= 0
  const Icono = esSuperavit ? TrendingUp : TrendingDown

  return (
    <Card
      className={`${esSuperavit ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-red-500 to-rose-600"} border-0 shadow-xl`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{esSuperavit ? "Superávit" : "Déficit"}</p>
            <p className="mt-2 truncate text-3xl font-bold text-white xl:text-4xl">
              {formatMoney(Math.abs(resumen.resultado), data.moneda)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {variacionResultado === null ? (
                <span className="text-sm font-medium text-white/90">Sin datos del mes anterior</span>
              ) : (
                <>
                  {variacionResultado >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-white" aria-hidden="true" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-white" aria-hidden="true" />
                  )}
                  <span className="text-sm font-medium text-white/90">
                    {Math.abs(variacionResultado).toFixed(1)}% {etiquetaComparacion(comparacionParcial)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icono className="h-8 w-8 text-white" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TasaAhorroTarjeta({ data }: { data: PersonalDashboardData }) {
  if (!data.movimientos.ok) {
    return (
      <Card className="border-slate-700 bg-gradient-to-br from-slate-900 to-slate-800 shadow-xl">
        <CardContent className="p-6">
          <ErrorDeCarga />
        </CardContent>
      </Card>
    )
  }
  const { ingresos, resultado } = data.movimientos.data.resumen
  return <TasaAhorroClasico ingresos={ingresos} resultado={resultado} moneda={data.moneda} />
}

export function GastosCategoriaClasico({ data }: { data: PersonalDashboardData }) {
  const m = data.movimientos.ok ? data.movimientos.data : null

  return (
    <Card className="border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <BarChart3 className="h-5 w-5 text-red-500" aria-hidden="true" />
          Gastos por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!m ? (
          <ErrorDeCarga />
        ) : m.distribucion.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <AlertTriangle className="mb-2 h-10 w-10" aria-hidden="true" />
            <p className="text-sm font-medium">No hay egresos registrados este mes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {m.distribucion.map((cat, i) => {
              const color = PALETA[i % PALETA.length]
              return (
                <div
                  key={cat.categoria}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 transition-all hover:shadow-md"
                  style={{ backgroundColor: `${color}14` }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate text-sm font-medium text-slate-700">{cat.categoria}</span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="whitespace-nowrap text-sm font-bold text-slate-900">{formatMoney(cat.monto, data.moneda)}</p>
                    <p className="text-xs text-slate-500">{cat.porcentaje.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
            <div className="mt-2 border-t-2 border-slate-300 pt-3">
              <div className="flex items-center justify-between gap-2 px-2">
                <span className="text-sm font-bold text-slate-700">Total Egresos</span>
                <span className="shrink-0 whitespace-nowrap text-base font-bold text-slate-900 sm:text-lg">
                  {formatMoney(m.resumen.gastos, data.moneda)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
