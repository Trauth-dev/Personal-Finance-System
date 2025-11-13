import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  Calendar,
  ShoppingCart,
  Home,
  Zap,
  Heart,
  GraduationCap,
  Gift,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { formatGuaranies } from "@/lib/utils"

export default async function ResumenDashboardPage() {
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

  // Obtener todos los egresos del mes
  const { data: egresos } = await supabase
    .from("egresos")
    .select("*")
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
    .select("*")
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
    .select("*")
    .eq("user_id", user.id)
    .gte("fecha", inicioSemanaStr)
    .lte("fecha", hoy)
    .order("monto", { ascending: false })

  const top5GastosSemana = egresosSemana?.slice(0, 5) || []
  const totalEgresosSemana = egresosSemana?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  // Agrupar egresos por categoría de vivienda
  const egresosPorVivienda = egresos?.reduce(
    (acc, egreso) => {
      const cat = egreso.categoria_vivienda
      if (!acc[cat]) acc[cat] = 0
      acc[cat] += Number(egreso.monto)
      return acc
    },
    {} as Record<string, number>,
  )

  // Agrupar egresos por categoría varios
  const egresosPorVarios = egresos?.reduce(
    (acc, egreso) => {
      const cat = egreso.categoria_varios
      if (!acc[cat]) acc[cat] = 0
      acc[cat] += Number(egreso.monto)
      return acc
    },
    {} as Record<string, number>,
  )

  // Calcular promedio diario
  const diasTranscurridos = now.getDate()
  const promedioDiario = totalEgresos / diasTranscurridos

  // Balance
  const balance = totalIngresos - totalEgresos
  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0

  // Iconos para categorías de vivienda
  const iconosVivienda: Record<string, any> = {
    Alquiler: Home,
    Claro: Zap,
    "Consulta Médica": Heart,
    Essap: Zap,
    Farmacia: Heart,
    "Internet + Cable": Zap,
    Super: ShoppingCart,
    Tigo: Zap,
  }

  // Iconos para categorías varios
  const iconosVarios: Record<string, any> = {
    "Ahorro 2025": Wallet,
    Disfrute: Sparkles,
    Donaciones: Gift,
    Educación: GraduationCap,
    "Libertad F": TrendingUp,
    "Pago Deudas": AlertCircle,
    Sueños: Heart,
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader
        title="Dashboard Secundario"
        description="Análisis detallado de ingresos, egresos y patrones de consumo"
      />

      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Izquierdo - Filtros y Resumen */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            {/* Filtro de Período */}
            <Card className="glass-effect border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Período Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                  <span className="text-xs text-muted-foreground">Mes</span>
                  <span className="text-sm font-bold text-primary">
                    {now.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                  <span className="text-xs text-muted-foreground">Días transcurridos</span>
                  <span className="text-sm font-semibold">{diasTranscurridos}</span>
                </div>
              </CardContent>
            </Card>

            {/* Resumen de Gastos por Período */}
            <Card className="glass-effect border-purple-500/40 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-violet-600/20 shadow-lg shadow-purple-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-purple-400" />
                  Gastos por Período
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-background/80 border border-purple-400/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Hoy</span>
                    <Clock className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{formatGuaranies(totalEgresosHoy)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{egresosHoy?.length || 0} transacciones</div>
                </div>

                <div className="p-3 rounded-lg bg-background/80 border border-purple-400/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Esta Semana</span>
                    <Calendar className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{formatGuaranies(totalEgresosSemana)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{egresosSemana?.length || 0} transacciones</div>
                </div>

                <div className="p-3 rounded-lg bg-background/80 border border-purple-400/30 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Este Mes</span>
                    <TrendingDown className="w-3 h-3 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{formatGuaranies(totalEgresos)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{egresos?.length || 0} transacciones</div>
                </div>
              </CardContent>
            </Card>

            {/* Promedio Diario */}
            <Card className="glass-effect border-accent/30 bg-gradient-to-br from-accent/20 to-accent/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-accent" />
                  Promedio Diario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-accent">{formatGuaranies(promedioDiario)}</div>
                <p className="text-xs text-muted-foreground mt-1">Gasto promedio por día</p>
              </CardContent>
            </Card>
          </div>

          {/* Contenido Principal */}
          <div className="col-span-12 lg:col-span-9 space-y-6">
            {/* Métricas Principales - Top */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-effect border-primary/30 hover:glow-effect transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">Total Ingresos</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary mb-2">{formatGuaranies(totalIngresos)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background/50 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: "100%" }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{ingresos?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-destructive/30 hover:glow-effect transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">Total Egresos</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-destructive mb-2">{formatGuaranies(totalEgresos)}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-background/50 rounded-full h-2">
                      <div
                        className="bg-destructive h-2 rounded-full"
                        style={{ width: `${Math.min((totalEgresos / totalIngresos) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{egresos?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-effect border-accent/30 hover:glow-effect transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground">Balance Neto</CardTitle>
                    <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-accent" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold mb-2 ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                    {formatGuaranies(balance)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={Math.abs(tasaAhorro)} className="flex-1" />
                    <span className="text-xs text-muted-foreground">{tasaAhorro.toFixed(0)}%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sección de Top 5 Gastos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top 5 Gastos del Mes */}
              <Card className="glass-effect border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Top 5 Gastos del Mes
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosMes.length > 0 ? (
                      top5GastosMes.map((egreso, index) => {
                        const IconVivienda = iconosVivienda[egreso.categoria_vivienda] || ShoppingCart
                        return (
                          <div key={egreso.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <IconVivienda className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{egreso.categoria_vivienda}</p>
                              <p className="text-xs text-muted-foreground">{egreso.categoria_varios}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-destructive">
                                {formatGuaranies(Number(egreso.monto))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(egreso.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay gastos este mes</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Gastos de la Semana */}
              <Card className="glass-effect border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-accent" />
                    Top 5 Gastos de la Semana
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosSemana.length > 0 ? (
                      top5GastosSemana.map((egreso, index) => {
                        const IconVivienda = iconosVivienda[egreso.categoria_vivienda] || ShoppingCart
                        return (
                          <div key={egreso.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <IconVivienda className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{egreso.categoria_vivienda}</p>
                              <p className="text-xs text-muted-foreground">{egreso.categoria_varios}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-destructive">
                                {formatGuaranies(Number(egreso.monto))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(egreso.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay gastos esta semana</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 Gastos de Hoy */}
              <Card className="glass-effect border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-chart-3" />
                    Top 5 Gastos de Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {top5GastosHoy.length > 0 ? (
                      top5GastosHoy.map((egreso, index) => {
                        const IconVivienda = iconosVivienda[egreso.categoria_vivienda] || ShoppingCart
                        return (
                          <div key={egreso.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5">
                            <div className="w-8 h-8 rounded-lg bg-chart-3/10 flex items-center justify-center flex-shrink-0">
                              <IconVivienda className="w-4 h-4 text-chart-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{egreso.categoria_vivienda}</p>
                              <p className="text-xs text-muted-foreground">{egreso.categoria_varios}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-destructive">
                                {formatGuaranies(Number(egreso.monto))}
                              </p>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay gastos hoy</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Análisis por Categorías */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gastos por Categoría de Vivienda */}
              <Card className="glass-effect border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Home className="w-4 h-4 text-primary" />
                    Gastos por Categoría de Vivienda
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {egresosPorVivienda &&
                      Object.entries(egresosPorVivienda)
                        .sort(([, a], [, b]) => b - a)
                        .map(([categoria, monto]) => {
                          const Icon = iconosVivienda[categoria] || ShoppingCart
                          const porcentaje = (monto / totalEgresos) * 100
                          return (
                            <div key={categoria} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="text-sm font-medium">{categoria}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{formatGuaranies(monto)}</p>
                                  <p className="text-xs text-muted-foreground">{porcentaje.toFixed(1)}%</p>
                                </div>
                              </div>
                              <Progress value={porcentaje} className="h-2" />
                            </div>
                          )
                        })}
                  </div>
                </CardContent>
              </Card>

              {/* Gastos por Categoría Varios */}
              <Card className="glass-effect border-border/50">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    Gastos por Categoría Varios
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {egresosPorVarios &&
                      Object.entries(egresosPorVarios)
                        .sort(([, a], [, b]) => b - a)
                        .map(([categoria, monto]) => {
                          const Icon = iconosVarios[categoria] || DollarSign
                          const porcentaje = (monto / totalEgresos) * 100
                          return (
                            <div key={categoria} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-accent" />
                                  </div>
                                  <span className="text-sm font-medium">{categoria}</span>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-bold">{formatGuaranies(monto)}</p>
                                  <p className="text-xs text-muted-foreground">{porcentaje.toFixed(1)}%</p>
                                </div>
                              </div>
                              <Progress value={porcentaje} className="h-2" />
                            </div>
                          )
                        })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Indicadores de Salud Financiera */}
            <Card className="glass-effect border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  Indicadores de Salud Financiera
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-background/50 border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Tasa de Ahorro</span>
                      <Wallet className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary mb-2">{tasaAhorro.toFixed(1)}%</div>
                    <Progress value={Math.abs(tasaAhorro)} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      {tasaAhorro >= 20 ? "Excelente" : tasaAhorro >= 10 ? "Bueno" : "Mejorar"}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-accent/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Días Restantes</span>
                      <Calendar className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-3xl font-bold text-accent mb-2">
                      {new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - diasTranscurridos}
                    </div>
                    <Progress
                      value={(diasTranscurridos / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">del mes actual</p>
                  </div>

                  <div className="p-4 rounded-lg bg-background/50 border border-chart-3/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Proyección Mensual</span>
                      <TrendingUp className="w-4 h-4 text-chart-3" />
                    </div>
                    <div className="text-3xl font-bold text-chart-3 mb-2">
                      {formatGuaranies(promedioDiario * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())}
                    </div>
                    <Progress
                      value={
                        (totalEgresos /
                          (promedioDiario * new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())) *
                        100
                      }
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Gasto proyectado</p>
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
