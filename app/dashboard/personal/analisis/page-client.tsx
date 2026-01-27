"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { AnalisisMensualComparativo } from "@/components/personal/analisis-mensual-comparativo"
import { getParaguayDate } from "@/lib/utils"
import { TrendingUp, BarChart3, Info } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  perfilId: string
}

export function AnalisisFinancieroClient({ perfilId }: Props) {
  const today = getParaguayDate()
  const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)
  const [analisisData, setAnalisisData] = useState<any>(null)

  useEffect(() => {
    loadAnalisisData()
  }, [selectedMonth, perfilId])

  const loadAnalisisData = async () => {
    setLoading(true)
    const supabase = createClient()

    // Parsear mes seleccionado
    const [year, month] = selectedMonth.split("-").map(Number)
    
    // Mes actual seleccionado
    const primerDiaMesActual = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDiaMesActual = new Date(year, month, 0).toISOString().split("T")[0]
    
    // Mes anterior
    const primerDiaMesAnterior = new Date(year, month - 2, 1).toISOString().split("T")[0]
    const ultimoDiaMesAnterior = new Date(year, month - 1, 0).toISOString().split("T")[0]

    // Obtener nombres de meses
    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    const mesActualNombre = monthNames[month - 1]
    const mesAnteriorNombre = month === 1 ? monthNames[11] : monthNames[month - 2]

    // Obtener presupuesto mes actual
    const { data: presupuestoActual } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesActual)
      .lte("fecha", ultimoDiaMesActual)
      .order("fecha", { ascending: false })
      .limit(1)

    // Obtener presupuesto mes anterior
    const { data: presupuestoAnterior } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesAnterior)
      .lte("fecha", ultimoDiaMesAnterior)
      .order("fecha", { ascending: false })
      .limit(1)

    // Obtener ingresos mes actual
    const { data: ingresosActuales } = await supabase
      .from("ingresos")
      .select("monto")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesActual)
      .lte("fecha", ultimoDiaMesActual)

    const totalIngresosActual = ingresosActuales?.reduce((sum, i) => sum + Number(i.monto), 0) || 0

    // Obtener ingresos mes anterior
    const { data: ingresosAnteriores } = await supabase
      .from("ingresos")
      .select("monto")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesAnterior)
      .lte("fecha", ultimoDiaMesAnterior)

    const totalIngresosAnterior = ingresosAnteriores?.reduce((sum, i) => sum + Number(i.monto), 0) || 0

    // Obtener egresos por categoría mes actual
    const { data: egresosActuales } = await supabase
      .from("egresos")
      .select("monto, categoria_id, tipo_categoria:tipos_categoria_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesActual)
      .lte("fecha", ultimoDiaMesActual)

    const totalEgresosActual = egresosActuales?.reduce((sum, e) => sum + Number(e.monto), 0) || 0

    // Obtener egresos por categoría mes anterior
    const { data: egresosAnteriores } = await supabase
      .from("egresos")
      .select("monto, categoria_id, tipo_categoria:tipos_categoria_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMesAnterior)
      .lte("fecha", ultimoDiaMesAnterior)

    const totalEgresosAnterior = egresosAnteriores?.reduce((sum, e) => sum + Number(e.monto), 0) || 0

    // Agrupar por categoría
    const categoriasMap = new Map()

    // Procesar mes actual
    egresosActuales?.forEach((egreso: any) => {
      const categoria = egreso.tipo_categoria?.nombre || "Sin categoría"
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, { nombre: categoria, mesActual: 0, mesAnterior: 0 })
      }
      const cat = categoriasMap.get(categoria)
      cat.mesActual += Number(egreso.monto)
    })

    // Procesar mes anterior
    egresosAnteriores?.forEach((egreso: any) => {
      const categoria = egreso.tipo_categoria?.nombre || "Sin categoría"
      if (!categoriasMap.has(categoria)) {
        categoriasMap.set(categoria, { nombre: categoria, mesActual: 0, mesAnterior: 0 })
      }
      const cat = categoriasMap.get(categoria)
      cat.mesAnterior += Number(egreso.monto)
    })

    // Convertir a array y calcular cambios
    const categorias = Array.from(categoriasMap.values())
      .map((cat) => ({
        ...cat,
        cambio: cat.mesAnterior > 0 ? ((cat.mesActual - cat.mesAnterior) / cat.mesAnterior) * 100 : 0,
      }))
      .sort((a, b) => b.mesActual - a.mesActual)

    // Calcular ahorros
    const ahorroActual = totalIngresosActual - totalEgresosActual
    const ahorroAnterior = totalIngresosAnterior - totalEgresosAnterior

    setAnalisisData({
      mesActual: {
        mes: mesActualNombre,
        ingresos: totalIngresosActual,
        egresos: totalEgresosActual,
        presupuesto: Number(presupuestoActual?.[0]?.meta_salario || 0),
        ahorro: ahorroActual,
      },
      mesAnterior: {
        mes: mesAnteriorNombre,
        ingresos: totalIngresosAnterior,
        egresos: totalEgresosAnterior,
        presupuesto: Number(presupuestoAnterior?.[0]?.meta_salario || 0),
        ahorro: ahorroAnterior,
      },
      categorias,
    })

    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BarChart3 className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Análisis Financiero</h1>
            <p className="text-slate-600">Análisis detallado de tus finanzas personales</p>
          </div>
        </div>
      </div>

      {/* Selector de Mes */}
      <div className="mb-6">
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Mensaje informativo */}
      {!loading && analisisData && (
        <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 mb-1">Resumen Ejecutivo</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Este análisis compara tus finanzas de <span className="font-semibold">{analisisData.mesActual.mes}</span> con <span className="font-semibold">{analisisData.mesAnterior.mes}</span>. 
                  {analisisData.mesActual.ahorro > analisisData.mesAnterior.ahorro && " ¡Excelente! Has mejorado tu capacidad de ahorro."}
                  {analisisData.mesActual.ahorro < analisisData.mesAnterior.ahorro && " Tu ahorro ha disminuido, revisa tus gastos."}
                  {analisisData.mesActual.egresos < analisisData.mesAnterior.egresos && " Tus gastos han disminuido, ¡sigue así!"}
                  {analisisData.mesActual.egresos > analisisData.mesAnterior.egresos && " Tus gastos han aumentado, considera optimizar."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Cargando análisis...</p>
          </div>
        </div>
      ) : analisisData ? (
        <AnalisisMensualComparativo data={analisisData} />
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600">No hay datos disponibles para el mes seleccionado</p>
        </div>
      )}
    </div>
  )
}
