"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, Star, TrendingUp } from 'lucide-react'

interface Presupuesto {
  meta_salario: number
  pct_donacion: number
  pct_ahorro_2025: number
  pct_gastos_varios: number
  pct_gastos_vivienda: number
  pct_pago_deudas: number
  pct_disfrute: number
  pct_educacion: number
  pct_suenos: number
  pct_libertad_financiera: number
}

interface Egreso {
  monto: number
  tipo_categoria: {
    nombre: string
    color: string
  } | null
}

const CATEGORIAS_CONFIG = {
  "Donación": { icon: Heart, color: "from-pink-500 to-rose-500", textColor: "text-pink-600", bgColor: "bg-pink-50" },
  "Ahorro 2025": { icon: PiggyBank, color: "from-green-500 to-emerald-500", textColor: "text-green-600", bgColor: "bg-green-50" },
  "Gastos Varios": { icon: ShoppingBag, color: "from-purple-500 to-violet-500", textColor: "text-purple-600", bgColor: "bg-purple-50" },
  "Gastos Vivienda": { icon: Home, color: "from-orange-500 to-amber-500", textColor: "text-orange-600", bgColor: "bg-orange-50" },
  "Pago Deudas": { icon: CreditCard, color: "from-red-500 to-rose-500", textColor: "text-red-600", bgColor: "bg-red-50" },
  "Disfrute": { icon: Smile, color: "from-yellow-500 to-amber-500", textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
  "Educación": { icon: GraduationCap, color: "from-blue-500 to-cyan-500", textColor: "text-blue-600", bgColor: "bg-blue-50" },
  "Sueños": { icon: Star, color: "from-indigo-500 to-purple-500", textColor: "text-indigo-600", bgColor: "bg-indigo-50" },
  "Libertad Financiera": { icon: TrendingUp, color: "from-teal-500 to-cyan-500", textColor: "text-teal-600", bgColor: "bg-teal-50" },
}

export function PresupuestoCategoriasComparativoClient({
  presupuesto,
  egresos,
}: {
  presupuesto: Presupuesto | null
  egresos: Egreso[]
}) {
  console.log("[v0] PresupuestoCategoriasComparativo - Presupuesto:", presupuesto)
  console.log("[v0] PresupuestoCategoriasComparativo - Egresos:", egresos)
  
  if (!presupuesto) {
    console.log("[v0] No hay presupuesto configurado")
    return null
  }

  const totalPresupuesto = Number(presupuesto.meta_salario)
  console.log("[v0] Total presupuesto:", totalPresupuesto)

  // Calcular total de egresos por categoría
  const egresosPorCategoria = egresos.reduce(
    (acc, egreso) => {
      const nombre = egreso.tipo_categoria?.nombre || "Sin categoría"
      acc[nombre] = (acc[nombre] || 0) + Number(egreso.monto)
      return acc
    },
    {} as Record<string, number>
  )

  // Mapear las categorías con sus datos
  const categoriasConDatos = [
    { nombre: "Donación", pct: Number(presupuesto.pct_donacion || 0), gastado: egresosPorCategoria["Donación"] || 0 },
    { nombre: "Ahorro 2025", pct: Number(presupuesto.pct_ahorro_2025 || 0), gastado: egresosPorCategoria["Ahorro 2025"] || 0 },
    { nombre: "Gastos Varios", pct: Number(presupuesto.pct_gastos_varios || 0), gastado: egresosPorCategoria["Gastos Varios"] || 0 },
    { nombre: "Gastos Vivienda", pct: Number(presupuesto.pct_gastos_vivienda || 0), gastado: egresosPorCategoria["Gastos Vivienda"] || 0 },
    { nombre: "Pago Deudas", pct: Number(presupuesto.pct_pago_deudas || 0), gastado: egresosPorCategoria["Pago Deudas"] || 0 },
    { nombre: "Disfrute", pct: Number(presupuesto.pct_disfrute || 0), gastado: egresosPorCategoria["Disfrute"] || 0 },
    { nombre: "Educación", pct: Number(presupuesto.pct_educacion || 0), gastado: egresosPorCategoria["Educación"] || 0 },
    { nombre: "Sueños", pct: Number(presupuesto.pct_suenos || 0), gastado: egresosPorCategoria["Sueños"] || 0 },
    { nombre: "Libertad Financiera", pct: Number(presupuesto.pct_libertad_financiera || 0), gastado: egresosPorCategoria["Libertad Financiera"] || 0 },
  ]

  // Filtrar solo las categorías que tienen presupuesto asignado
  const categoriasActivas = categoriasConDatos.filter(cat => cat.pct > 0)
  console.log("[v0] Categorías activas:", categoriasActivas)

  if (categoriasActivas.length === 0) {
    console.log("[v0] No hay categorías con presupuesto asignado")
    return null
  }

  return (
    <Card className="bg-white border-2 border-slate-200 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-600" />
          Presupuesto por Categoría
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {categoriasActivas.map((categoria) => {
            const config = CATEGORIAS_CONFIG[categoria.nombre as keyof typeof CATEGORIAS_CONFIG]
            const Icon = config.icon
            const presupuestoCategoria = totalPresupuesto * categoria.pct
            const porcentajeUsado = presupuestoCategoria > 0 ? (categoria.gastado / presupuestoCategoria) * 100 : 0
            
            // Determinar color según el porcentaje usado
            let estadoColor = "text-green-600"
            let borderColor = "border-green-300"
            if (porcentajeUsado > 100) {
              estadoColor = "text-red-600"
              borderColor = "border-red-300"
            } else if (porcentajeUsado > 80) {
              estadoColor = "text-yellow-600"
              borderColor = "border-yellow-300"
            }

            return (
              <div
                key={categoria.nombre}
                className={`relative p-3 rounded-xl border-2 ${borderColor} ${config.bgColor} hover:shadow-md transition-all`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-full">
                    <p className="text-xs font-semibold text-slate-700 truncate">{categoria.nombre}</p>
                    <p className={`text-2xl font-bold ${estadoColor} mt-1`}>
                      {porcentajeUsado.toFixed(0)}%
                    </p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Presup.:</span>
                        <span className="font-medium text-slate-700">{formatGuaranies(presupuestoCategoria)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Gastado:</span>
                        <span className={`font-medium ${estadoColor}`}>{formatGuaranies(categoria.gastado)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Barra de progreso */}
                <div className="mt-2 w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      porcentajeUsado > 100 ? "bg-red-500" : porcentajeUsado > 80 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(porcentajeUsado, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
