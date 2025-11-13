"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"
import { formatGuaranies } from "@/lib/utils"
import { TrendingDown, AlertTriangle } from "lucide-react"

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
  const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16"]

  return (
    <Card className="bg-white border-2 border-slate-200 shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <TrendingDown className="w-5 h-5 text-red-500" />
          Detalle por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mayor Gasto Card */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Mayor Gasto</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">{mayorGasto.nombre}</p>
              <p className="text-sm text-emerald-600 mt-1">{mayorGasto.porcentaje.toFixed(1)}% del total</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-900">{formatGuaranies(mayorGasto.monto)}</p>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        {categorias.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categorias} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fill: "#475569", fontSize: 12, fontWeight: 500 }}
                  width={90}
                />
                <Bar dataKey="monto" radius={[0, 8, 8, 0]}>
                  {categorias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Detailed List */}
            <div className="space-y-2">
              {categorias.map((cat, index) => (
                <div
                  key={cat.nombre}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-medium text-slate-700">{cat.nombre}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatGuaranies(cat.monto)}</p>
                    <p className="text-xs text-slate-500">{cat.porcentaje.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Total Egresos</span>
                <span className="text-lg font-bold text-slate-900">{formatGuaranies(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <AlertTriangle className="w-12 h-12 mb-3" />
            <p className="text-sm font-medium">No hay egresos registrados este mes</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
