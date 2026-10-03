import Link from "next/link"
import { AlertTriangle, FileText, Receipt } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { formatDateWithoutTimezone } from "@/lib/utils"
import { ErrorDeCarga } from "@/components/personal/dashboard/indicador"

export function ReportesClasico({ data }: { data: PersonalDashboardData }) {
  const m = data.movimientos.ok ? data.movimientos.data : null
  const mayor = m?.principales[0]
  const total = m?.resumen.gastos ?? 0

  return (
    <Card className="border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
            Reportes del Mes
          </CardTitle>
          <Link href="/dashboard/personal/historial" className="text-xs font-semibold text-blue-600 hover:underline">
            Ver historial
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {!m ? (
          <ErrorDeCarga />
        ) : m.gastosPorCategoria.length === 0 ? (
          <p className="py-6 text-center text-sm font-medium text-slate-500">No hay egresos registrados este mes</p>
        ) : (
          <div className="flex flex-col gap-4">
            {mayor && total > 0 && mayor.monto / total >= 0.3 && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                <p className="text-sm text-amber-800">
                  Tu mayor gasto del mes es <span className="font-semibold">{mayor.concepto || mayor.categoria || "sin concepto"}</span> por{" "}
                  <span className="font-semibold">{formatMoney(mayor.monto, data.moneda)}</span>, el{" "}
                  {((mayor.monto / total) * 100).toFixed(0)}% de tus gastos.
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">Top 5 gastos</h3>
              <ol className="flex flex-col gap-2">
                {m.principales.map((gasto, i) => (
                  <li key={gasto.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{gasto.concepto || "Sin concepto"}</p>
                        <p className="truncate text-xs text-slate-500">
                          {gasto.categoria || "Sin categoría"} · {formatDateWithoutTimezone(gasto.fecha)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-bold text-red-600">
                      {formatMoney(gasto.monto, data.moneda)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-slate-700">Detalle por categoría</h3>
              <Accordion type="multiple" className="flex flex-col gap-2">
                {m.gastosPorCategoria.map((grupo) => (
                  <AccordionItem key={grupo.categoria} value={grupo.categoria} className="rounded-lg border border-slate-200 bg-white px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <span className="flex w-full items-center justify-between gap-3 pr-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <Receipt className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                          <span className="truncate text-sm font-semibold text-slate-700">{grupo.categoria}</span>
                          <span className="shrink-0 text-xs text-slate-500">({grupo.gastos.length})</span>
                        </span>
                        <span className="shrink-0 whitespace-nowrap text-sm font-bold text-slate-900">
                          {formatMoney(grupo.total, data.moneda)}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="flex flex-col divide-y divide-slate-100">
                        {grupo.gastos.map((gasto) => (
                          <li key={gasto.id} className="flex items-center justify-between gap-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm text-slate-700">{gasto.concepto || "Sin concepto"}</p>
                              <p className="text-xs text-slate-500">
                                {formatDateWithoutTimezone(gasto.fecha)}
                                {gasto.subcategoria ? ` · ${gasto.subcategoria}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-slate-800">
                              {formatMoney(gasto.monto, data.moneda)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
