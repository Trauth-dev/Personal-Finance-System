"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatGuaranies } from "@/lib/utils"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import { Calendar, TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react'
import { Progress } from "@/components/ui/progress"

interface Presupuesto {
  id: string
  meta_salario: number
  fecha: string
  pct_donacion: number
  pct_ahorro_2025: number
  pct_gastos_varios: number
  pct_gastos_vivienda: number
  pct_pago_deudas: number
  pct_disfrute: number
  pct_educacion: number
  pct_suenos: number
  pct_libertad_financiera: number
  pct_gastos_personales?: number
  pct_supermercado?: number
  pct_salud?: number
  pct_transportes?: number
}

interface Egreso {
  monto: number
  fecha: string
  tipo_categoria: {
    nombre: string
  } | null
}

export function HistoricoPresupuestosClient({
  presupuestos,
  egresos,
}: {
  presupuestos: Presupuesto[]
  egresos: Egreso[]
}) {
  // Agrupar presupuestos por mes
  const mesesDisponibles = presupuestos.map((p) => {
    const fecha = new Date(p.fecha)
    return {
      valor: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
      label: fecha.toLocaleDateString("es-ES", { year: "numeric", month: "long" }),
      presupuesto: p
    }
  })

  // Estado para el mes seleccionado
  const [mesSeleccionado, setMesSeleccionado] = useState(mesesDisponibles[0]?.valor || "")

  if (presupuestos.length === 0) {
    return (
      <Card className="bg-amber-50 border-2 border-amber-200">
        <CardContent className="p-6">
          <p className="text-amber-800">No hay historial de presupuestos disponible.</p>
        </CardContent>
      </Card>
    )
  }

  // Obtener presupuesto del mes seleccionado
  const mesData = mesesDisponibles.find((m) => m.valor === mesSeleccionado)
  const presupuestoMes = mesData?.presupuesto

  if (!presupuestoMes) {
    return null
  }

  // Calcular egresos del mes seleccionado
  const [year, month] = mesSeleccionado.split("-")
  const primerDia = `${year}-${month}-01`
  const ultimoDia = new Date(Number(year), Number(month), 0).toISOString().split("T")[0]

  const egresosMes = egresos.filter((e) => e.fecha >= primerDia && e.fecha <= ultimoDia)
  const totalEgresos = egresosMes.reduce((sum, e) => sum + Number(e.monto), 0)
  const totalPresupuesto = Number(presupuestoMes.meta_salario)
  const porcentajeUsado = totalPresupuesto > 0 ? (totalEgresos / totalPresupuesto) * 100 : 0

  // Calcular cumplimiento por categoría
  const categoriasConDatos = [
    { nombre: "Gastos Vivienda", pct: Number(presupuestoMes.pct_gastos_vivienda || 0) },
    { nombre: "Gastos Personales", pct: Number(presupuestoMes.pct_gastos_personales || 0) },
    { nombre: "Supermercado", pct: Number(presupuestoMes.pct_supermercado || 0) },
    { nombre: "Pago Deudas", pct: Number(presupuestoMes.pct_pago_deudas || 0) },
    { nombre: "Salud", pct: Number(presupuestoMes.pct_salud || 0) },
    { nombre: "Disfrute", pct: Number(presupuestoMes.pct_disfrute || 0) },
    { nombre: "Transportes", pct: Number(presupuestoMes.pct_transportes || 0) },
    { nombre: "Educacion", pct: Number(presupuestoMes.pct_educacion || 0) },
    { nombre: "Donacion", pct: Number(presupuestoMes.pct_donacion || 0) },
    { nombre: "Ahorro", pct: Number(presupuestoMes.pct_ahorro_2025 || 0) },
    { nombre: "Gastos Varios", pct: Number(presupuestoMes.pct_gastos_varios || 0) },
    { nombre: "Libertad Financiera", pct: Number(presupuestoMes.pct_libertad_financiera || 0) },
  ].filter(cat => cat.pct > 0)

  const egresosPorCategoria = egresosMes.reduce((acc, e) => {
    const nombre = e.tipo_categoria?.nombre || "Sin categoría"
    acc[nombre] = (acc[nombre] || 0) + Number(e.monto)
    return acc
  }, {} as Record<string, number>)

  return (
    <Card className="bg-white border-2 border-slate-200 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-slate-600" />
            Historial de Presupuestos
          </CardTitle>
          <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Seleccionar mes" />
            </SelectTrigger>
            <SelectContent>
              {mesesDisponibles.map((mes) => (
                <SelectItem key={mes.valor} value={mes.valor}>
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen del mes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Presupuesto</span>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{formatGuaranies(totalPresupuesto)}</div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Gastado</span>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{formatGuaranies(totalEgresos)}</div>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Cumplimiento</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className={`text-2xl font-bold ${porcentajeUsado <= 100 ? "text-green-600" : "text-red-600"}`}>
              {porcentajeUsado.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Distribución por categorías */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Distribución por Categoría</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categoriasConDatos.map((categoria) => {
              const presupuestoCategoria = totalPresupuesto * categoria.pct
              const gastadoCategoria = egresosPorCategoria[categoria.nombre] || 0
              const porcentaje = presupuestoCategoria > 0 ? (gastadoCategoria / presupuestoCategoria) * 100 : 0

              return (
                <div key={categoria.nombre} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">{getNombreCategoriaDisplay(categoria.nombre)}</span>
                    <span className={`text-xs font-bold ${porcentaje <= 100 ? "text-green-600" : "text-red-600"}`}>
                      {porcentaje.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={Math.min(porcentaje, 100)} className="h-2 mb-2" />
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{formatGuaranies(gastadoCategoria)}</span>
                    <span>de {formatGuaranies(presupuestoCategoria)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
