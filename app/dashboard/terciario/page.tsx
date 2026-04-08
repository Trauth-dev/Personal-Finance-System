import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, DollarSign, Calendar, CheckCircle2, Clock, Tag } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { formatGuaranies } from "@/lib/utils"

export default async function TerciarioDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener fecha actual
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // Obtener todos los ingresos del mes
  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("*")
    .eq("user_id", user.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("fecha", { ascending: false })

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresos } = await supabase
    .from("egresos")
    .select(`
      *,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color),
      categoria:categorias_egreso(id, nombre)
    `)
    .eq("user_id", user.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("monto", { ascending: false })

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  // Top 5 gastos más grandes del mes
  const top5GastosMes = egresos?.slice(0, 5) || []

  // Obtener egresos de hoy
  const hoy = now.toISOString().split("T")[0]
  const { data: egresosHoy } = await supabase
    .from("egresos")
    .select(`
      *,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color),
      categoria:categorias_egreso(id, nombre)
    `)
    .eq("user_id", user.id)
    .eq("fecha", hoy)
    .order("monto", { ascending: false })

  const top5GastosHoy = egresosHoy?.slice(0, 5) || []
  const totalEgresosHoy = egresosHoy?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  // Obtener egresos de la semana
  const inicioSemana = new Date(now)
  inicioSemana.setDate(now.getDate() - now.getDay())
  const inicioSemanaStr = inicioSemana.toISOString().split("T")[0]

  const { data: egresosSemana } = await supabase
    .from("egresos")
    .select(`
      *,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color),
      categoria:categorias_egreso(id, nombre)
    `)
    .eq("user_id", user.id)
    .gte("fecha", inicioSemanaStr)
    .lte("fecha", hoy)
    .order("monto", { ascending: false })

  const top5GastosSemana = egresosSemana?.slice(0, 5) || []
  const totalEgresosSemana = egresosSemana?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: tiposCategorias } = await supabase
    .from("tipos_categoria_egreso")
    .select("*")
    .eq("user_id", user.id)
    .order("nombre")

  const egresosPorTipo = egresos?.reduce(
    (acc, egreso) => {
      const tipoNombre = egreso.tipo_categoria?.nombre || "Sin categoría"
      if (!acc[tipoNombre]) {
        acc[tipoNombre] = {
          total: 0,
          color: egreso.tipo_categoria?.color || "gray",
          items: [],
        }
      }
      acc[tipoNombre].total += Number(egreso.monto)
      acc[tipoNombre].items.push(egreso)
      return acc
    },
    {} as Record<string, { total: number; color: string; items: any[] }>,
  )

  // Calcular promedio diario
  const diasTranscurridos = now.getDate()
  const promedioDiario = totalEgresos / diasTranscurridos

  // Balance
  const balance = totalIngresos - totalEgresos
  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      blue: { bg: "bg-blue-500", border: "border-blue-200", text: "text-blue-600", icon: "bg-blue-500" },
      purple: { bg: "bg-purple-500", border: "border-purple-200", text: "text-purple-600", icon: "bg-purple-500" },
      pink: { bg: "bg-pink-500", border: "border-pink-200", text: "text-pink-600", icon: "bg-pink-500" },
      green: { bg: "bg-green-500", border: "border-green-200", text: "text-green-600", icon: "bg-green-500" },
      yellow: { bg: "bg-yellow-500", border: "border-yellow-200", text: "text-yellow-600", icon: "bg-yellow-500" },
      red: { bg: "bg-red-500", border: "border-red-200", text: "text-red-600", icon: "bg-red-500" },
      indigo: { bg: "bg-indigo-500", border: "border-indigo-200", text: "text-indigo-600", icon: "bg-indigo-500" },
      teal: { bg: "bg-teal-500", border: "border-teal-200", text: "text-teal-600", icon: "bg-teal-500" },
      orange: { bg: "bg-orange-500", border: "border-orange-200", text: "text-orange-600", icon: "bg-orange-500" },
      gray: { bg: "bg-gray-500", border: "border-gray-200", text: "text-gray-600", icon: "bg-gray-500" },
    }
    return colorMap[color] || colorMap.gray
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <DashboardHeader
        title="Dashboard Terciario"
        description="Análisis detallado de ingresos, egresos y patrones de consumo"
      />

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Sidebar Izquierdo - Filtros y Resumen */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filtro de Período */}
            <Card className="bg-white border-2 border-blue-200 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-cyan-500 -mx-6 -mt-6 px-6 pt-6">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4" />
                  Período Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="text-xs text-slate-600 font-medium">Mes</span>
                  <span className="text-sm font-bold text-blue-600">
                    {now.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-600 font-medium">Días transcurridos</span>
                  <span className="text-sm font-semibold text-slate-800">{diasTranscurridos}</span>
                </div>
              </CardContent>
            </Card>

            {/* Gastos por Período */}
            <Card className="bg-white border-2 border-indigo-200 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-600 -mx-6 -mt-6 px-6 pt-6 border-b border-white/20">
                <CardTitle className="text-sm flex items-center gap-2 font-semibold text-white">
                  <TrendingDown className="w-4 h-4" />
                  Gastos por Período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="p-3 rounded-xl bg-white border-2 border-indigo-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold tracking-wide text-indigo-700">Hoy</span>
                    <Clock className="w-3 h-3 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{formatGuaranies(totalEgresosHoy)}</div>
                  <div className="text-xs mt-1 text-slate-600">{egresosHoy?.length || 0} transacciones</div>
                </div>

                <div className="p-3 rounded-xl bg-white border-2 border-purple-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold tracking-wide text-purple-700">Esta Semana</span>
                    <Calendar className="w-3 h-3 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{formatGuaranies(totalEgresosSemana)}</div>
                  <div className="text-xs mt-1 text-slate-600">{egresosSemana?.length || 0} transacciones</div>
                </div>

                <div className="p-3 rounded-xl bg-white border-2 border-violet-200 shadow-md hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold tracking-wide text-violet-700">Este Mes</span>
                    <TrendingDown className="w-3 h-3 text-violet-600" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{formatGuaranies(totalEgresos)}</div>
                  <div className="text-xs mt-1 text-slate-600">{egresos?.length || 0} transacciones</div>
                </div>
              </CardContent>
            </Card>

            {/* Promedio Diario */}
            <Card className="bg-white border-2 border-amber-200 shadow-lg overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-amber-400 to-orange-500 -mx-6 -mt-6 px-6 pt-6">
                <CardTitle className="text-sm flex items-center gap-2 text-white">
                  <DollarSign className="w-4 h-4" />
                  Promedio Diario
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-3xl font-bold text-slate-800">{formatGuaranies(promedioDiario)}</div>
                <p className="text-xs mt-1 text-slate-600">Gasto promedio por día</p>
              </CardContent>
            </Card>
          </div>

          {/* Contenido Principal */}
          <div className="lg:col-span-9 space-y-4 md:space-y-6">
            {/* Métricas Principales - Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="pb-3 bg-gradient-to-br from-green-50 to-emerald-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-600 font-semibold">Total Ingresos</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl md:text-4xl font-bold text-green-600 mb-2">
                    {formatGuaranies(totalIngresos)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-green-100 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <span className="text-xs text-slate-600 font-medium">{ingresos?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-red-200 shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="pb-3 bg-gradient-to-br from-red-50 to-rose-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-600 font-semibold">Total Egresos</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                      <TrendingDown className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl md:text-4xl font-bold text-red-600 mb-2">
                    {formatGuaranies(totalEgresos)}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-red-100 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min((totalEgresos / totalIngresos) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-600 font-medium">{egresos?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all">
                <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-cyan-50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-600 font-semibold">Balance Neto</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                      <Wallet className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-3xl md:text-4xl font-bold mb-2 ${balance >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatGuaranies(balance)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.abs(tasaAhorro)} className="flex-1" />
                    <span className="text-xs text-slate-600 font-medium">{tasaAhorro.toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sección de Top 5 Gastos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top 5 Gastos del Mes */}
              <Card className="bg-white border-2 border-purple-200 shadow-lg overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-purple-500 to-pink-500 -mx-6 -mt-6 px-6 pt-6">
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <CheckCircle2 className="w-4 h-4" />
                    Top 5 Gastos del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosMes.length > 0 ? (
                      top5GastosMes.map((egreso) => {
                        const colorClasses = getColorClasses(egreso.tipo_categoria?.color || "gray")
                        return (
                          <div
                            key={egreso.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50 border border-purple-100"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg ${colorClasses.icon} flex items-center justify-center flex-shrink-0`}
                            >
                              <Tag className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-slate-800">
                                {egreso.tipo_categoria?.nombre || "Sin tipo"}
                              </p>
                              <p className="text-xs text-slate-500">{egreso.categoria?.nombre || "Sin categoría"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">{formatGuaranies(Number(egreso.monto))}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(egreso.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">No hay gastos este mes</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Gastos de la Semana */}
              <Card className="bg-white border-2 border-teal-200 shadow-lg overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-teal-500 to-cyan-500 -mx-6 -mt-6 px-6 pt-6">
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4" />
                    Top 5 Gastos de la Semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosSemana.length > 0 ? (
                      top5GastosSemana.map((egreso) => {
                        const colorClasses = getColorClasses(egreso.tipo_categoria?.color || "gray")
                        return (
                          <div
                            key={egreso.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-teal-50 border border-teal-100"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg ${colorClasses.icon} flex items-center justify-center flex-shrink-0`}
                            >
                              <Tag className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-slate-800">
                                {egreso.tipo_categoria?.nombre || "Sin tipo"}
                              </p>
                              <p className="text-xs text-slate-500">{egreso.categoria?.nombre || "Sin categoría"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">{formatGuaranies(Number(egreso.monto))}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(egreso.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">No hay gastos esta semana</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Gastos de Hoy */}
              <Card className="bg-white border-2 border-orange-200 shadow-lg overflow-hidden">
                <CardHeader className="pb-3 bg-gradient-to-r from-orange-500 to-amber-500 -mx-6 -mt-6 px-6 pt-6">
                  <CardTitle className="text-sm flex items-center gap-2 text-white">
                    <Clock className="w-4 h-4" />
                    Top 5 Gastos de Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosHoy.length > 0 ? (
                      top5GastosHoy.map((egreso) => {
                        const colorClasses = getColorClasses(egreso.tipo_categoria?.color || "gray")
                        return (
                          <div
                            key={egreso.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50 border border-orange-100"
                          >
                            <div
                              className={`w-8 h-8 rounded-lg ${colorClasses.icon} flex items-center justify-center flex-shrink-0`}
                            >
                              <Tag className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate text-slate-800">
                                {egreso.tipo_categoria?.nombre || "Sin tipo"}
                              </p>
                              <p className="text-xs text-slate-500">{egreso.categoria?.nombre || "Sin categoría"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-600">{formatGuaranies(Number(egreso.monto))}</p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">No hay gastos hoy</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {tiposCategorias && tiposCategorias.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tiposCategorias.slice(0, 4).map((tipo) => {
                  const colorClasses = getColorClasses(tipo.color)
                  const dataTipo = egresosPorTipo?.[tipo.nombre]
                  const totalTipo = dataTipo?.total || 0
                  const porcentaje = totalEgresos > 0 ? (totalTipo / totalEgresos) * 100 : 0

                  return (
                    <Card
                      key={tipo.id}
                      className={`bg-white border-2 ${colorClasses.border} shadow-lg overflow-hidden`}
                    >
                      <CardHeader className={`pb-3 bg-gradient-to-r ${colorClasses.bg} -mx-6 -mt-6 px-6 pt-6`}>
                        <CardTitle className="text-sm flex items-center gap-2 text-white">
                          <Tag className="w-4 h-4" />
                          Gastos en {tipo.nombre}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        {dataTipo && dataTipo.items.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-sm font-semibold text-slate-700">Total</span>
                              <div className="text-right">
                                <p className="text-lg font-bold text-slate-800">{formatGuaranies(totalTipo)}</p>
                                <p className="text-xs text-slate-500">{porcentaje.toFixed(1)}% del total</p>
                              </div>
                            </div>
                            <Progress value={porcentaje} className="h-2" />
                            <div className="text-xs text-slate-600 mt-2">
                              {dataTipo.items.length} transacción{dataTipo.items.length !== 1 ? "es" : ""}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 text-center py-4">No hay gastos en esta categoría</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            <Card className="bg-white border-2 border-blue-200 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 -mx-6 -mt-6 px-6 pt-6 border-b border-white/20">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <CheckCircle2 className="w-5 h-5" />
                  Indicadores de Salud Financiera
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">Tasa de Ahorro</span>
                      <Wallet className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="text-3xl font-bold mb-2 text-slate-900">{tasaAhorro.toFixed(1)}%</div>
                    <Progress value={Math.abs(tasaAhorro)} className="h-2 bg-blue-100" />
                    <p className="text-xs mt-2 text-slate-700 font-medium">
                      {tasaAhorro >= 20 ? "Excelente" : tasaAhorro >= 10 ? "Bueno" : "Mejorar"}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">Días Restantes</span>
                      <Calendar className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold mb-2 text-slate-900">
                      {new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - diasTranscurridos}
                    </div>
                    <Progress
                      value={(diasTranscurridos / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100}
                      className="h-2 bg-purple-100"
                    />
                    <p className="text-xs mt-2 text-slate-700 font-medium">del mes actual</p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-800">Proyección Mensual</span>
                      <TrendingUp className="w-4 h-4 text-pink-600" />
                    </div>
                    <div className="text-2xl font-bold mb-2 text-slate-900">
                      {formatGuaranies(promedioDiario * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}
                    </div>
                    <Progress
                      value={
                        (totalEgresos /
                          (promedioDiario * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())) *
                        100
                      }
                      className="h-2 bg-pink-100"
                    />
                    <p className="text-xs mt-2 text-slate-700 font-medium">Gasto proyectado</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
