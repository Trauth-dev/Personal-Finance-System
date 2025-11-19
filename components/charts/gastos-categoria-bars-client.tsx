"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { TrendingDown, AlertTriangle } from 'lucide-react'

interface Categoria {
  nombre: string
  monto: number
  porcentaje: number
}

interface GastosCategoriaBarsClientProps {
  categorias: Categoria[]
  mayorGasto: Categoria
  total: number
}

export function GastosCategoriaBarsClient({ categorias, mayorGasto, total }: GastosCategoriaBarsClientProps) {
  return (
    <Card className="bg-white border-2 border-slate-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
          <TrendingDown className="w-5 h-5 text-red-500" />
          Detalle por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mayor Gasto Card - Compacto */}
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">Mayor Gasto</p>
          <div className="flex items-baseline justify-between">
            <p className="text-xl font-bold text-emerald-900">{mayorGasto.nombre}</p>
            <p className="text-xl font-bold text-emerald-900">{formatGuaranies(mayorGasto.monto)}</p>
          </div>
          <p className="text-xs text-emerald-600 mt-1">{mayorGasto.porcentaje.toFixed(1)}% del total</p>
        </div>

        {/* Compact List View */}
        {categorias.length > 0 ? (
          <div className="space-y-2">
            {categorias.map((cat, index) => {
              const colorIntensity = 1 - (index / (categorias.length - 1))
              const bgColor = `rgba(239, 68, 68, ${0.1 + colorIntensity * 0.15})`
              const dotColor = index === 0 ? '#ef4444' : index === 1 ? '#f97316' : index === 2 ? '#f59e0b' : '#3b82f6'
              
              return (
                <div
                  key={cat.nombre}
                  className="flex items-center justify-between p-3 rounded-lg hover:shadow-md transition-all border border-slate-200"
                  style={{ backgroundColor: bgColor }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                    <span className="text-sm font-medium text-slate-700">{cat.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatGuaranies(cat.monto)}</p>
                    <p className="text-xs text-slate-500">{cat.porcentaje.toFixed(1)}%</p>
                  </div>
                </div>
              )
            })}
            
            {/* Total Compacto */}
            <div className="pt-3 mt-2 border-t-2 border-slate-300">
              <div className="flex items-center justify-between px-2">
                <span className="text-sm font-bold text-slate-700">Total Egresos</span>
                <span className="text-lg font-bold text-slate-900">{formatGuaranies(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <AlertTriangle className="w-10 h-10 mb-2" />
            <p className="text-sm font-medium">No hay egresos registrados este mes</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
