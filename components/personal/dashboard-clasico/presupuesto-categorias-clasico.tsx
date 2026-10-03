import Link from "next/link"
import { AlertTriangle, CheckCircle2, PieChart } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { ErrorDeCarga } from "@/components/personal/dashboard/indicador"

function tono(porcentaje: number) {
  if (porcentaje > 100) return { barra: "bg-red-500", texto: "text-red-600", borde: "border-red-200 bg-red-50" }
  if (porcentaje >= 80) return { barra: "bg-amber-500", texto: "text-amber-600", borde: "border-amber-200 bg-amber-50" }
  return { barra: "bg-green-500", texto: "text-green-600", borde: "border-slate-200 bg-white" }
}

export function PresupuestoCategoriasClasico({ data }: { data: PersonalDashboardData }) {
  const { presupuesto, moneda } = data

  return (
    <Card className="border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <PieChart className="h-5 w-5 text-purple-600" aria-hidden="true" />
            Presupuesto por Categoría
          </CardTitle>
          <Link href="/dashboard/personal/presupuesto" className="text-xs font-semibold text-purple-600 hover:underline">
            Ver detalle
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!presupuesto.ok ? (
          <ErrorDeCarga />
        ) : !presupuesto.data.configurado ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <p className="text-sm font-medium text-slate-600">No definiste un presupuesto para este mes.</p>
            <Link href="/dashboard/personal/presupuesto" className="text-sm font-semibold text-purple-600 hover:underline">
              Configurar presupuesto
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {presupuesto.data.lineas.map((linea) => {
                const t = tono(linea.porcentaje)
                const excedido = linea.restante < 0
                return (
                  <div key={linea.categoria} className={`flex flex-col gap-2 rounded-lg border p-3 ${t.borde}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-700">{linea.categoria}</span>
                      <span className={`shrink-0 text-xs font-bold ${t.texto}`}>{linea.porcentaje.toFixed(0)}%</span>
                    </div>
                    <div
                      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-label={`Consumo de ${linea.categoria}`}
                      aria-valuenow={Math.round(linea.porcentaje)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className={`h-full rounded-full ${t.barra}`} style={{ width: `${Math.min(linea.porcentaje, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">
                        {formatMoney(linea.utilizado, moneda)} de {formatMoney(linea.presupuestado, moneda)}
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 font-medium ${excedido ? "text-red-600" : "text-green-600"}`}>
                        {excedido ? (
                          <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        )}
                        {excedido ? `Excedido ${formatMoney(-linea.restante, moneda)}` : `Quedan ${formatMoney(linea.restante, moneda)}`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-200 px-1 pt-3 text-sm">
              <span className="font-bold text-slate-700">Total presupuestado: {formatMoney(presupuesto.data.total, moneda)}</span>
              <span className={`font-bold ${presupuesto.data.disponible >= 0 ? "text-green-600" : "text-red-600"}`}>
                {presupuesto.data.disponible >= 0 ? "Disponible" : "Excedido"}:{" "}
                {formatMoney(Math.abs(presupuesto.data.disponible), moneda)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
