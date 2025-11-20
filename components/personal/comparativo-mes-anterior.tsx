import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar, Target } from 'lucide-react'
import { createClient } from "@/lib/supabase/server"

interface Props {
  perfilId: string
}

export async function ComparativoMesAnterior({ perfilId }: Props) {
  const supabase = await createClient()
  
  const now = new Date()
  
  // Mes actual
  const primerDiaMesActual = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMesActual = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  
  // Mes anterior
  const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]

  // Datos mes actual
  const { data: presupuestoActual } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesActual)
    .lte("fecha", ultimoDiaMesActual)
    .order("fecha", { ascending: false })
    .limit(1)
    .single()

  const { data: egresosActuales } = await supabase
    .from("egresos")
    .select("monto, tipo_categoria:tipos_categoria_egreso(nombre)")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesActual)
    .lte("fecha", ultimoDiaMesActual)

  const totalEgresosActual = egresosActuales?.reduce((sum, e) => sum + Number(e.monto), 0) || 0

  // Datos mes anterior
  const { data: presupuestoAnterior } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)
    .order("fecha", { ascending: false })
    .limit(1)
    .single()

  const { data: egresosAnteriores } = await supabase
    .from("egresos")
    .select("monto, tipo_categoria:tipos_categoria_egreso(nombre)")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  const totalEgresosAnterior = egresosAnteriores?.reduce((sum, e) => sum + Number(e.monto), 0) || 0

  // Cálculos comparativos
  const cambioPresupuesto = presupuestoAnterior
    ? ((Number(presupuestoActual?.meta_salario || 0) - Number(presupuestoAnterior.meta_salario)) / Number(presupuestoAnterior.meta_salario)) * 100
    : 0

  const cambioEgresos = totalEgresosAnterior > 0
    ? ((totalEgresosActual - totalEgresosAnterior) / totalEgresosAnterior) * 100
    : 0

  const cumplimientoActual = presupuestoActual
    ? (totalEgresosActual / Number(presupuestoActual.meta_salario)) * 100
    : 0

  const cumplimientoAnterior = presupuestoAnterior
    ? (totalEgresosAnterior / Number(presupuestoAnterior.meta_salario)) * 100
    : 0

  const mejoraCumplimiento = cumplimientoAnterior - cumplimientoActual

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Comparativo con Mes Anterior
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cambio en Presupuesto */}
          <div className="p-4 rounded-xl bg-white border-2 border-purple-200 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Presupuesto</span>
              <Target className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {formatGuaranies(Number(presupuestoActual?.meta_salario || 0))}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {cambioPresupuesto >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-green-600" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${cambioPresupuesto >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Math.abs(cambioPresupuesto).toFixed(1)}% vs mes anterior
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Anterior: {formatGuaranies(Number(presupuestoAnterior?.meta_salario || 0))}
            </p>
          </div>

          {/* Cambio en Egresos */}
          <div className="p-4 rounded-xl bg-white border-2 border-red-200 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Egresos</span>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {formatGuaranies(totalEgresosActual)}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {cambioEgresos >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-red-600" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-green-600" />
              )}
              <span className={`text-xs font-medium ${cambioEgresos >= 0 ? "text-red-600" : "text-green-600"}`}>
                {Math.abs(cambioEgresos).toFixed(1)}% vs mes anterior
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Anterior: {formatGuaranies(totalEgresosAnterior)}
            </p>
          </div>

          {/* Cumplimiento del Presupuesto */}
          <div className="p-4 rounded-xl bg-white border-2 border-green-200 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Cumplimiento</span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${cumplimientoActual <= 100 ? "text-green-600" : "text-red-600"}`}>
                {cumplimientoActual.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {mejoraCumplimiento >= 0 ? (
                <ArrowUpRight className="w-3 h-3 text-green-600" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-600" />
              )}
              <span className={`text-xs font-medium ${mejoraCumplimiento >= 0 ? "text-green-600" : "text-red-600"}`}>
                {mejoraCumplimiento >= 0 ? "Mejoró" : "Empeoró"} {Math.abs(mejoraCumplimiento).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Anterior: {cumplimientoAnterior.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
