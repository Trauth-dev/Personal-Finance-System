"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatGuaranies } from "@/lib/utils"
import {
  Heart,
  PiggyBank,
  ShoppingBag,
  Home,
  CreditCard,
  Smile,
  GraduationCap,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

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
  fecha: string
  concepto: string
  tipo_categoria: {
    nombre: string
    color: string
  } | null
  categoria: {
    nombre: string
  } | null
}

const CATEGORIAS_CONFIG = {
  Donacion: {
    icon: Heart,
    color: "from-pink-500 to-rose-500",
    textColor: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-300",
  },
  Ahorro: {
    icon: PiggyBank,
    color: "from-green-500 to-emerald-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
  },
  "Gastos Varios": {
    icon: ShoppingBag,
    color: "from-purple-500 to-violet-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
  },
  "Gastos Vivienda": {
    icon: Home,
    color: "from-orange-500 to-amber-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
  },
  "Pago Deudas": {
    icon: CreditCard,
    color: "from-red-500 to-rose-500",
    textColor: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
  },
  Disfrute: {
    icon: Smile,
    color: "from-yellow-500 to-amber-500",
    textColor: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
  },
  Educacion: {
    icon: GraduationCap,
    color: "from-blue-500 to-cyan-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
  },
  Suenos: {
    icon: Star,
    color: "from-indigo-500 to-purple-500",
    textColor: "text-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-300",
  },
  "Libertad Financiera": {
    icon: TrendingUp,
    color: "from-teal-500 to-cyan-500",
    textColor: "text-teal-600",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-300",
  },
}

export function PresupuestoDetalladoTerciarioClient({
  presupuesto,
  egresos,
}: {
  presupuesto: Presupuesto | null
  egresos: Egreso[]
}) {
  if (!presupuesto) {
    return (
      <Card className="bg-amber-50 border-2 border-amber-200">
        <CardContent className="p-6">
          <p className="text-amber-800">No hay presupuesto configurado para este mes.</p>
        </CardContent>
      </Card>
    )
  }

  const totalPresupuesto = Number(presupuesto.meta_salario)

  // Calcular egresos por categoría y obtener top 3 por categoría
  const egresosPorCategoria = egresos.reduce(
    (acc, egreso) => {
      const nombre = egreso.tipo_categoria?.nombre || "Sin categoría"
      if (!acc[nombre]) {
        acc[nombre] = []
      }
      acc[nombre].push(egreso)
      return acc
    },
    {} as Record<string, Egreso[]>,
  )

  const categoriasConDatos = [
    { nombre: "Donacion", pct: Number(presupuesto.pct_donacion || 0) },
    { nombre: "Ahorro", pct: Number(presupuesto.pct_ahorro_2025 || 0) },
    { nombre: "Gastos Varios", pct: Number(presupuesto.pct_gastos_varios || 0) },
    { nombre: "Gastos Vivienda", pct: Number(presupuesto.pct_gastos_vivienda || 0) },
    { nombre: "Pago Deudas", pct: Number(presupuesto.pct_pago_deudas || 0) },
    { nombre: "Disfrute", pct: Number(presupuesto.pct_disfrute || 0) },
    { nombre: "Educacion", pct: Number(presupuesto.pct_educacion || 0) },
    { nombre: "Suenos", pct: Number(presupuesto.pct_suenos || 0) },
    { nombre: "Libertad Financiera", pct: Number(presupuesto.pct_libertad_financiera || 0) },
  ]

  const categoriasActivas = categoriasConDatos.filter((cat) => cat.pct > 0)

  const categoriasConGastos = categoriasActivas.filter((cat) => {
    const egresosCategoria = egresosPorCategoria[cat.nombre] || []
    return egresosCategoria.length > 0 || cat.pct > 0
  })

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 shadow-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Análisis Detallado de Presupuesto por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoriasConGastos.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {categoriasConGastos.map((categoria) => {
                const config = CATEGORIAS_CONFIG[categoria.nombre as keyof typeof CATEGORIAS_CONFIG]
                const Icon = config.icon
                const presupuestoCategoria = totalPresupuesto * categoria.pct
                const egresosCategoria = egresosPorCategoria[categoria.nombre] || []
                const totalGastado = egresosCategoria.reduce((sum, e) => sum + Number(e.monto), 0)
                const porcentajeUsado = presupuestoCategoria > 0 ? (totalGastado / presupuestoCategoria) * 100 : 0
                const saldoRestante = presupuestoCategoria - totalGastado

                // Top 3 gastos de esta categoría
                const top3 = egresosCategoria.slice(0, 3)

                // Estado visual
                let EstadoIcon = CheckCircle2
                let estadoColor = "text-green-600"
                let estadoTexto = "Dentro del presupuesto"
                let estadoBg = "bg-green-50"
                let estadoBorder = "border-green-200"

                if (porcentajeUsado > 100) {
                  EstadoIcon = AlertTriangle
                  estadoColor = "text-red-600"
                  estadoTexto = "Presupuesto excedido"
                  estadoBg = "bg-red-50"
                  estadoBorder = "border-red-200"
                } else if (porcentajeUsado > 80) {
                  EstadoIcon = AlertCircle
                  estadoColor = "text-yellow-600"
                  estadoTexto = "Cerca del límite"
                  estadoBg = "bg-yellow-50"
                  estadoBorder = "border-yellow-200"
                }

                return (
                  <Card
                    key={categoria.nombre}
                    className={`${config.bgColor} border-2 ${config.borderColor} shadow-lg overflow-hidden`}
                  >
                    <CardHeader className={`pb-3 bg-gradient-to-r ${config.color} -mx-6 -mt-6 px-6 pt-6`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base font-bold text-white">{categoria.nombre}</CardTitle>
                          <p className="text-xs text-white/90">{(categoria.pct * 100).toFixed(0)}% del presupuesto</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      {/* Indicador de estado */}
                      <div className={`flex items-center gap-2 p-2 rounded-lg ${estadoBg} border ${estadoBorder}`}>
                        <EstadoIcon className={`w-4 h-4 ${estadoColor}`} />
                        <span className={`text-xs font-semibold ${estadoColor}`}>{estadoTexto}</span>
                      </div>

                      {/* Métricas principales */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Presupuestado</p>
                          <p className="text-sm font-bold text-slate-800">{formatGuaranies(presupuestoCategoria)}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">Gastado</p>
                          <p className={`text-sm font-bold ${estadoColor}`}>{formatGuaranies(totalGastado)}</p>
                        </div>
                      </div>

                      {/* Progreso */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Uso del presupuesto</span>
                          <span className={`font-bold ${estadoColor}`}>{porcentajeUsado.toFixed(1)}%</span>
                        </div>
                        <Progress value={Math.min(porcentajeUsado, 100)} className="h-3" />
                        <p className={`text-xs font-medium ${saldoRestante >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {saldoRestante >= 0 ? "Saldo disponible: " : "Excedido por: "}
                          {formatGuaranies(Math.abs(saldoRestante))}
                        </p>
                      </div>

                      {/* Top 3 gastos */}
                      {top3.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Top 3 Gastos</p>
                          {top3.map((egreso, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">
                                  {egreso.categoria?.nombre || egreso.concepto || "Sin descripción"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(egreso.fecha).toLocaleDateString("es-ES", {
                                    day: "2-digit",
                                    month: "short",
                                  })}
                                </p>
                              </div>
                              <p className="text-sm font-bold text-slate-800 ml-2">
                                {formatGuaranies(Number(egreso.monto))}
                              </p>
                            </div>
                          ))}
                          {egresosCategoria.length > 3 && (
                            <p className="text-xs text-slate-500 text-center">
                              +{egresosCategoria.length - 3} gastos más
                            </p>
                          )}
                        </div>
                      )}

                      {/* Estadísticas */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-xs text-slate-600">Total de transacciones</span>
                        <span className="text-sm font-bold text-slate-800">{egresosCategoria.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-600">
              <p>No hay gastos registrados en las categorías presupuestadas este mes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
