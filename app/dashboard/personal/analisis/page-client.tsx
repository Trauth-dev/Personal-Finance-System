"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { AnalisisMensualComparativo } from "@/components/personal/analisis-mensual-comparativo"
import { getParaguayDate } from "@/lib/utils"
import { TrendingUp, BarChart3, Info, Scale, Snowflake, FileText } from "lucide-react"
import { PresupuestoVsRealidad } from "@/components/personal/presupuesto-vs-realidad"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

    // Calcular evolución de los últimos 6 meses (incluyendo el mes seleccionado)
    const evolucion = []
    for (let i = 5; i >= 0; i--) {
      const mesEvolucion = new Date(year, month - 1 - i, 1)
      const yearEv = mesEvolucion.getFullYear()
      const monthEv = mesEvolucion.getMonth() + 1
      
      const primerDia = new Date(yearEv, monthEv - 1, 1).toISOString().split("T")[0]
      const ultimoDia = new Date(yearEv, monthEv, 0).toISOString().split("T")[0]
      
      // Obtener ingresos del mes
      const { data: ingresosEv } = await supabase
        .from("ingresos")
        .select("monto")
        .eq("perfil_id", perfilId)
        .gte("fecha", primerDia)
        .lte("fecha", ultimoDia)
      
      const totalIngresosEv = ingresosEv?.reduce((sum, i) => sum + Number(i.monto), 0) || 0
      
      // Obtener egresos del mes
      const { data: egresosEv } = await supabase
        .from("egresos")
        .select("monto")
        .eq("perfil_id", perfilId)
        .gte("fecha", primerDia)
        .lte("fecha", ultimoDia)
      
      const totalEgresosEv = egresosEv?.reduce((sum, e) => sum + Number(e.monto), 0) || 0
      
      const balanceEv = totalIngresosEv - totalEgresosEv
      
      evolucion.push({
        mes: monthNames[monthEv - 1].substring(0, 3),
        ingresos: totalIngresosEv,
        egresos: totalEgresosEv,
        balance: balanceEv,
      })
    }

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
      evolucion,
    })

    setLoading(false)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Sub-tabs de navegacion */}
      <Tabs defaultValue="analisis" className="w-full">
        <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
          <TabsTrigger
            value="analisis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 font-medium px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Analisis Financiero
          </TabsTrigger>
          <TabsTrigger
            value="presupuesto-vs-realidad"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 font-medium px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Presupuesto vs Realidad
          </TabsTrigger>
          <TabsTrigger
            value="bola-de-nieve"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 font-medium px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Bola de Nieve
          </TabsTrigger>
          <TabsTrigger
            value="reportes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 font-medium px-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Analisis Financiero */}
        <TabsContent value="analisis" className="mt-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Analisis Financiero</h1>
                <p className="text-muted-foreground">Analisis detallado de tus finanzas personales</p>
              </div>
            </div>
          </div>

          {/* Selector de Mes */}
          <div className="mb-6">
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          </div>

          {/* Mensaje informativo */}
          {!loading && analisisData && (
            <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50/10 to-indigo-50/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Resumen Ejecutivo</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Este analisis compara tus finanzas de <span className="font-semibold">{analisisData.mesActual.mes}</span> con <span className="font-semibold">{analisisData.mesAnterior.mes}</span>. 
                      {analisisData.mesActual.ahorro > analisisData.mesAnterior.ahorro && " Excelente! Has mejorado tu capacidad de ahorro."}
                      {analisisData.mesActual.ahorro < analisisData.mesAnterior.ahorro && " Tu ahorro ha disminuido, revisa tus gastos."}
                      {analisisData.mesActual.egresos < analisisData.mesAnterior.egresos && " Tus gastos han disminuido, sigue asi!"}
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
                <p className="mt-4 text-muted-foreground">Cargando analisis...</p>
              </div>
            </div>
          ) : analisisData ? (
            <AnalisisMensualComparativo data={analisisData} />
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay datos disponibles para el mes seleccionado</p>
            </div>
          )}
        </TabsContent>

        {/* Tab: Presupuesto vs Realidad */}
        <TabsContent value="presupuesto-vs-realidad" className="mt-0">
          <PresupuestoVsRealidad perfilId={perfilId} />
        </TabsContent>

        {/* Tab: Bola de Nieve */}
        <TabsContent value="bola-de-nieve" className="mt-0">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-cyan-100/20 rounded-xl mb-4">
              <Snowflake className="w-12 h-12 text-cyan-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Bola de Nieve</h2>
            <p className="text-muted-foreground max-w-md">
              Estrategia de pago de deudas con el metodo bola de nieve. Proximamente disponible.
            </p>
          </div>
        </TabsContent>

        {/* Tab: Reportes */}
        <TabsContent value="reportes" className="mt-0">
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-green-100/20 rounded-xl mb-4">
              <FileText className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Reportes</h2>
            <p className="text-muted-foreground max-w-md">
              Genera reportes detallados de tus finanzas personales. Proximamente disponible.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
