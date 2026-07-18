"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { formatGuaranies, formatDateWithoutTimezone } from "@/lib/utils"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import { TrendingDown, Medal, AlertCircle } from 'lucide-react'

interface GastosPorCategoria {
  [key: string]: {
    nombre: string
    color: string
    total: number
    gastos: Array<{ monto: number; concepto: string; descripcion: string; fecha: string }>
  }
}

interface ReportesExpandiblesClientProps {
  gastosPorCategoria: GastosPorCategoria
  top5GastosGenerales: Array<{
    monto: number
    concepto: string
    categoria: string
    descripcion: string
    color: string
    fecha: string
  }>
}

export function ReportesExpandiblesClient({
  gastosPorCategoria,
  top5GastosGenerales,
}: ReportesExpandiblesClientProps) {
  const categoriasOrdenadas = Object.values(gastosPorCategoria).sort((a, b) => b.total - a.total)
  
  const totalTop5 = top5GastosGenerales.reduce((sum, gasto) => sum + gasto.monto, 0)

  return (
    <div className="space-y-6">
      {/* Top 5 Gastos Generales del Mes */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center shadow-lg">
              <Medal className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Top 5 Gastos del Mes</CardTitle>
              <p className="text-sm text-slate-600">Mayores egresos sin importar categoría</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {top5GastosGenerales.map((gasto, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: gasto.color }}
                      >
                        {gasto.categoria}
                      </span>
                      <span className="font-semibold text-slate-800 break-words">{gasto.descripcion}</span>
                      <span className="text-xs text-slate-400">• {formatDateWithoutTimezone(gasto.fecha)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base sm:text-lg font-bold text-red-600 whitespace-nowrap">{formatGuaranies(gasto.monto)}</p>
                </div>
              </div>
            ))}
            
            {top5GastosGenerales.length > 0 && (
              <div className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-purple-100 rounded-xl border-2 border-purple-300 mt-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Medal className="w-5 h-5 text-purple-700 shrink-0" />
                  <span className="font-bold text-purple-900">Total 5 Gastos del Mes</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg sm:text-xl font-bold text-purple-900 whitespace-nowrap">{formatGuaranies(totalTop5)}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reportes por Categoría */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">Análisis por Categoría</CardTitle>
              <p className="text-sm text-slate-600">Todos los gastos de cada tipo de categoría</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="space-y-3">
            {categoriasOrdenadas.map((categoria, index) => (
              <AccordionItem
                key={index}
                value={`categoria-${index}`}
                className="border-2 border-slate-200 rounded-xl bg-white overflow-hidden"
              >
                <AccordionTrigger className="px-4 py-3 hover:bg-slate-50 hover:no-underline">
                  <div className="flex items-center justify-between gap-2 flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: categoria.color }}
                      />
                      <span className="font-semibold text-slate-800 truncate">{getNombreCategoriaDisplay(categoria.nombre)}</span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-red-600 whitespace-nowrap shrink-0">{formatGuaranies(categoria.total)}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2 pt-2">
                    {categoria.gastos.map((gasto, gastoIndex) => (
                      <div
                        key={gastoIndex}
                        className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-700 break-words">{gasto.concepto}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <span className="text-xs text-slate-500 break-words">{gasto.descripcion}</span>
                            <span className="text-xs text-slate-400">• {formatDateWithoutTimezone(gasto.fecha)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-slate-800 whitespace-nowrap">{formatGuaranies(gasto.monto)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Alerta de Mayor Gasto */}
      {categoriasOrdenadas.length > 0 && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">Categoría con Mayor Gasto</h3>
                <p className="text-sm text-slate-700">
                  Tu mayor gasto este mes fue en{" "}
                  <span className="font-bold" style={{ color: categoriasOrdenadas[0].color }}>
                    {getNombreCategoriaDisplay(categoriasOrdenadas[0].nombre)}
                  </span>{" "}
                  con un total de{" "}
                  <span className="font-bold text-red-600">{formatGuaranies(categoriasOrdenadas[0].total)}</span>.
                  Considera revisar estos gastos para optimizar tu presupuesto.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
