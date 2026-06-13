"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { hexToRgba } from "@/lib/utils"
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  BarChart3,
  PieChart,
  AlertTriangle,
  Phone,
  Instagram,
  UserPlus,
  Calendar,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Funnel,
  FunnelChart,
  LabelList,
} from "recharts"

interface CRMMetricsDashboardProps {
  perfilId: string
}

interface Metricas {
  totalClientes: number
  clientesNuevosMes: number
  clientesMesAnterior: number
  totalOportunidades: number
  oportunidadesAbiertas: number
  oportunidadesGanadas: number
  oportunidadesPerdidas: number
  valorPipelineTotal: number
  valorOportunidadesGanadas: number
  tasaConversion: number
  tiempoPromedioCierre: number
  seguimientosPendientes: number
  seguimientosVencidos: number
  citasProgramadas: number
  revisitasPendientes: number
  clientesPorCanal: { canal: string; cantidad: number; color: string }[]
  motivosNoCompra: { motivo: string; cantidad: number }[]
  oportunidadesPorEtapa: { etapa: string; cantidad: number; valor: number; color: string }[]
  ventasPorMes: { mes: string; ventas: number; monto: number }[]
  comparativaMesAnterior: {
    clientes: number
    oportunidades: number
    ventas: number
    valor: number
  }
}

const COLORES_CANALES: Record<string, string> = {
  ventas: "#3b82f6",
  referido: "#10b981",
  instagram: "#ec4899",
  evento: "#f59e0b",
  info: "#8b5cf6",
}

const COLORES_ETAPAS: Record<string, string> = {
  lead: "#6b7280",
  contactado: "#3b82f6",
  propuesta_enviada: "#f59e0b",
  negociacion: "#f97316",
  ganado: "#10b981",
  perdido: "#ef4444",
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("PYG", "Gs")
}

export function CRMMetricsDashboard({ perfilId }: CRMMetricsDashboardProps) {
  const [metricas, setMetricas] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "año">("mes")
  const supabase = createClient()

  useEffect(() => {
    cargarMetricas()
  }, [perfilId, periodo])

  const cargarMetricas = async () => {
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0)

    let fechaInicio: Date
    switch (periodo) {
      case "trimestre":
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth() - 3, 1)
        break
      case "año":
        fechaInicio = new Date(ahora.getFullYear(), 0, 1)
        break
      default:
        fechaInicio = inicioMes
    }

    // Cargar clientes
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, created_at, como_llego")
      .eq("user_id", user.id)

    const totalClientes = clientes?.length || 0
    const clientesNuevosMes = clientes?.filter(c => 
      new Date(c.created_at) >= inicioMes
    ).length || 0
    const clientesMesAnterior = clientes?.filter(c => 
      new Date(c.created_at) >= inicioMesAnterior && 
      new Date(c.created_at) <= finMesAnterior
    ).length || 0

    // Clientes por canal
    const canales = ["ventas", "referido", "instagram", "evento", "info"]
    const clientesPorCanal = canales.map(canal => ({
      canal: canal.charAt(0).toUpperCase() + canal.slice(1),
      cantidad: clientes?.filter(c => c.como_llego === canal).length || 0,
      color: COLORES_CANALES[canal] || "#6b7280"
    }))

    // Cargar oportunidades
    const { data: oportunidades } = await supabase
      .from("crm_oportunidades")
      .select(`
        *,
        etapa:crm_pipeline_etapas(nombre, codigo, color)
      `)
      .eq("perfil_id", perfilId)

    const totalOportunidades = oportunidades?.length || 0
    const oportunidadesAbiertas = oportunidades?.filter(o => 
      !["ganado", "perdido"].includes(o.etapa?.codigo || "")
    ).length || 0
    const oportunidadesGanadas = oportunidades?.filter(o => 
      o.etapa?.codigo === "ganado"
    ).length || 0
    const oportunidadesPerdidas = oportunidades?.filter(o => 
      o.etapa?.codigo === "perdido"
    ).length || 0

    const valorPipelineTotal = oportunidades?.filter(o => 
      !["ganado", "perdido"].includes(o.etapa?.codigo || "")
    ).reduce((sum, o) => sum + (o.monto_estimado || 0), 0) || 0

    const valorOportunidadesGanadas = oportunidades?.filter(o => 
      o.etapa?.codigo === "ganado"
    ).reduce((sum, o) => sum + (o.monto_estimado || 0), 0) || 0

    // Tasa de conversion
    const cerradas = oportunidadesGanadas + oportunidadesPerdidas
    const tasaConversion = cerradas > 0 ? (oportunidadesGanadas / cerradas) * 100 : 0

    // Tiempo promedio de cierre (dias)
    const oportunidadesCerradas = oportunidades?.filter(o => 
      o.etapa?.codigo === "ganado" && o.fecha_cierre_real
    ) || []
    const tiempoPromedioCierre = oportunidadesCerradas.length > 0
      ? oportunidadesCerradas.reduce((sum, o) => {
          const inicio = new Date(o.created_at)
          const cierre = new Date(o.fecha_cierre_real!)
          return sum + Math.ceil((cierre.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
        }, 0) / oportunidadesCerradas.length
      : 0

    // Oportunidades por etapa
    const { data: etapas } = await supabase
      .from("crm_pipeline_etapas")
      .select("*")
      .eq("user_id", user.id)
      .order("orden")

    const oportunidadesPorEtapa = etapas?.map(etapa => ({
      etapa: etapa.nombre,
      cantidad: oportunidades?.filter(o => o.etapa_id === etapa.id).length || 0,
      valor: oportunidades?.filter(o => o.etapa_id === etapa.id)
        .reduce((sum, o) => sum + (o.monto_estimado || 0), 0) || 0,
      color: etapa.color
    })) || []

    // Seguimientos pendientes
    const { data: seguimientos } = await supabase
      .from("crm_seguimientos")
      .select("*")
      .eq("perfil_id", perfilId)
      .eq("completado", false)

    const seguimientosPendientes = seguimientos?.length || 0
    const seguimientosVencidos = seguimientos?.filter(s => 
      s.fecha_recordatorio && new Date(s.fecha_recordatorio) < ahora
    ).length || 0

    // Citas programadas
    const { data: agendamientos } = await supabase
      .from("crm_agendamientos")
      .select("*")
      .eq("perfil_id", perfilId)
      .eq("estado", "programada")
      .gte("fecha_hora", ahora.toISOString())

    const citasProgramadas = agendamientos?.length || 0

    // Revisitas pendientes
    const { data: revisitas } = await supabase
      .from("crm_revisitas")
      .select("*")
      .eq("perfil_id", perfilId)
      .eq("requiere_seguimiento", true)

    const revisitasPendientes = revisitas?.length || 0

    // Motivos de no compra
    const { data: noCompras } = await supabase
      .from("crm_no_compras")
      .select("motivo")
      .eq("perfil_id", perfilId)

    const motivosAgrupados: Record<string, number> = {}
    noCompras?.forEach(nc => {
      const motivo = nc.motivo || "Sin especificar"
      motivosAgrupados[motivo] = (motivosAgrupados[motivo] || 0) + 1
    })
    const motivosNoCompra = Object.entries(motivosAgrupados)
      .map(([motivo, cantidad]) => ({ motivo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    // Ventas por mes (ultimos 6 meses)
    const { data: ventas } = await supabase
      .from("crm_ventas")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("created_at", new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString())

    const meses = Array.from({ length: 6 }, (_, i) => {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - 5 + i, 1)
      return {
        mes: fecha.toLocaleDateString("es", { month: "short" }),
        año: fecha.getFullYear(),
        mesNum: fecha.getMonth()
      }
    })

    const ventasPorMes = meses.map(m => {
      const ventasMes = ventas?.filter(v => {
        const fecha = new Date(v.created_at)
        return fecha.getMonth() === m.mesNum && fecha.getFullYear() === m.año
      }) || []
      return {
        mes: m.mes.charAt(0).toUpperCase() + m.mes.slice(1),
        ventas: ventasMes.length,
        monto: ventasMes.reduce((sum, v) => sum + (v.monto_total || 0), 0)
      }
    })

    // Comparativa mes anterior
    const oportunidadesMesAnterior = oportunidades?.filter(o =>
      new Date(o.created_at) >= inicioMesAnterior &&
      new Date(o.created_at) <= finMesAnterior
    ).length || 0
    const oportunidadesMesActual = oportunidades?.filter(o =>
      new Date(o.created_at) >= inicioMes
    ).length || 0

    const ventasMesAnterior = ventas?.filter(v =>
      new Date(v.created_at) >= inicioMesAnterior &&
      new Date(v.created_at) <= finMesAnterior
    ) || []
    const ventasMesActual = ventas?.filter(v =>
      new Date(v.created_at) >= inicioMes
    ) || []

    setMetricas({
      totalClientes,
      clientesNuevosMes,
      clientesMesAnterior,
      totalOportunidades,
      oportunidadesAbiertas,
      oportunidadesGanadas,
      oportunidadesPerdidas,
      valorPipelineTotal,
      valorOportunidadesGanadas,
      tasaConversion,
      tiempoPromedioCierre,
      seguimientosPendientes,
      seguimientosVencidos,
      citasProgramadas,
      revisitasPendientes,
      clientesPorCanal,
      motivosNoCompra,
      oportunidadesPorEtapa,
      ventasPorMes,
      comparativaMesAnterior: {
        clientes: clientesMesAnterior > 0 
          ? ((clientesNuevosMes - clientesMesAnterior) / clientesMesAnterior) * 100 
          : 100,
        oportunidades: oportunidadesMesAnterior > 0 
          ? ((oportunidadesMesActual - oportunidadesMesAnterior) / oportunidadesMesAnterior) * 100 
          : 100,
        ventas: ventasMesAnterior.length > 0 
          ? ((ventasMesActual.length - ventasMesAnterior.length) / ventasMesAnterior.length) * 100 
          : 100,
        valor: ventasMesAnterior.reduce((s, v) => s + v.monto_total, 0) > 0
          ? ((ventasMesActual.reduce((s, v) => s + v.monto_total, 0) - ventasMesAnterior.reduce((s, v) => s + v.monto_total, 0)) / ventasMesAnterior.reduce((s, v) => s + v.monto_total, 0)) * 100
          : 100
      }
    })

    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    )
  }

  if (!metricas) return null

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue,
    color = "cyan"
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: any
    trend?: "up" | "down" | "neutral"
    trendValue?: string
    color?: string
  }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${
                trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"
              }`}>
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : 
                 trend === "down" ? <ArrowDownRight className="h-3 w-3" /> : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900/30`}>
            <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Filtro de periodo */}
      <div className="flex justify-end">
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Este mes</SelectItem>
            <SelectItem value="trimestre">Trimestre</SelectItem>
            <SelectItem value="año">Este año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clientes"
          value={metricas.totalClientes}
          subtitle={`+${metricas.clientesNuevosMes} este mes`}
          icon={Users}
          trend={metricas.comparativaMesAnterior.clientes >= 0 ? "up" : "down"}
          trendValue={`${Math.abs(metricas.comparativaMesAnterior.clientes).toFixed(0)}% vs mes anterior`}
        />
        <MetricCard
          title="Pipeline Activo"
          value={formatMoney(metricas.valorPipelineTotal)}
          subtitle={`${metricas.oportunidadesAbiertas} oportunidades`}
          icon={Target}
          color="blue"
        />
        <MetricCard
          title="Tasa de Conversion"
          value={`${metricas.tasaConversion.toFixed(1)}%`}
          subtitle={`${metricas.oportunidadesGanadas} ganadas de ${metricas.oportunidadesGanadas + metricas.oportunidadesPerdidas} cerradas`}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Tiempo Promedio Cierre"
          value={`${Math.round(metricas.tiempoPromedioCierre)} dias`}
          subtitle="Desde creacion hasta cierre"
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Alertas y Pendientes */}
      {(metricas.seguimientosVencidos > 0 || metricas.revisitasPendientes > 0) && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <p className="font-medium text-amber-800 dark:text-amber-200">Atencion Requerida</p>
                <div className="flex flex-wrap gap-3 text-sm">
                  {metricas.seguimientosVencidos > 0 && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700">
                      {metricas.seguimientosVencidos} seguimientos vencidos
                    </Badge>
                  )}
                  {metricas.revisitasPendientes > 0 && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700">
                      {metricas.revisitasPendientes} revisitas pendientes
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Graficos */}
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="canales">Canales</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="nocompras">No Compras</TabsTrigger>
        </TabsList>

        {/* Tab Pipeline */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Embudo de Ventas</CardTitle>
                <CardDescription>Oportunidades por etapa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metricas.oportunidadesPorEtapa}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="etapa" type="category" width={80} tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === "cantidad" ? value : formatMoney(value),
                          name === "cantidad" ? "Cantidad" : "Valor"
                        ]}
                      />
                      <Bar dataKey="cantidad" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Valor por Etapa</CardTitle>
                <CardDescription>Monto potencial en cada etapa</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metricas.oportunidadesPorEtapa.map((etapa) => (
                    <div key={etapa.etapa} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: etapa.color }}
                          />
                          {etapa.etapa}
                        </span>
                        <span className="font-medium">{formatMoney(etapa.valor)}</span>
                      </div>
                      <Progress 
                        value={metricas.valorPipelineTotal > 0 
                          ? (etapa.valor / metricas.valorPipelineTotal) * 100 
                          : 0
                        } 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de Oportunidades */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-50 dark:bg-gray-900">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{metricas.totalOportunidades}</p>
                <p className="text-xs text-muted-foreground">Total Oportunidades</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{metricas.oportunidadesAbiertas}</p>
                <p className="text-xs text-muted-foreground">En Proceso</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">{metricas.oportunidadesGanadas}</p>
                <p className="text-xs text-muted-foreground">Ganadas</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-red-600">{metricas.oportunidadesPerdidas}</p>
                <p className="text-xs text-muted-foreground">Perdidas</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Canales */}
        <TabsContent value="canales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clientes por Canal</CardTitle>
                <CardDescription>Como llegaron tus clientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={metricas.clientesPorCanal.filter(c => c.cantidad > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="cantidad"
                        nameKey="canal"
                        label={({ canal, cantidad }) => `${canal}: ${cantidad}`}
                      >
                        {metricas.clientesPorCanal.filter(c => c.cantidad > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalle por Canal</CardTitle>
                <CardDescription>Distribucion de la cartera</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metricas.clientesPorCanal.map((canal) => {
                    const porcentaje = metricas.totalClientes > 0 
                      ? (canal.cantidad / metricas.totalClientes) * 100 
                      : 0
                    const IconCanal = canal.canal.toLowerCase() === "instagram" ? Instagram :
                                     canal.canal.toLowerCase() === "referido" ? UserPlus :
                                     canal.canal.toLowerCase() === "evento" ? Calendar :
                                     canal.canal.toLowerCase() === "info" ? Info : Phone
                    return (
                      <div key={canal.canal} className="flex items-center gap-4">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: hexToRgba(canal.color, 0.125) }}
                        >
                          <IconCanal className="h-4 w-4" style={{ color: canal.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{canal.canal}</span>
                            <span className="text-sm text-muted-foreground">
                              {canal.cantidad} ({porcentaje.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={porcentaje} className="h-2" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Ventas */}
        <TabsContent value="ventas" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Evolucion de Ventas</CardTitle>
                <CardDescription>Ultimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metricas.ventasPorMes}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          name === "ventas" ? value : formatMoney(value),
                          name === "ventas" ? "Cantidad" : "Monto"
                        ]}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="ventas" fill="#06b6d4" name="Ventas" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="monto" stroke="#10b981" name="Monto" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen de Ventas</CardTitle>
                <CardDescription>Totales acumulados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-sm text-muted-foreground">Total Ganado</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatMoney(metricas.valorOportunidadesGanadas)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-900/20">
                  <p className="text-sm text-muted-foreground">Pipeline Activo</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {formatMoney(metricas.valorPipelineTotal)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Oportunidades Ganadas:</span>
                    <span className="font-medium">{metricas.oportunidadesGanadas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tasa de Conversion:</span>
                    <span className="font-medium">{metricas.tasaConversion.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab No Compras */}
        <TabsContent value="nocompras" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Motivos de No Compra</CardTitle>
              <CardDescription>Razones por las que los clientes no compraron</CardDescription>
            </CardHeader>
            <CardContent>
              {metricas.motivosNoCompra.length > 0 ? (
                <div className="space-y-4">
                  {metricas.motivosNoCompra.map((motivo, index) => {
                    const maxCantidad = metricas.motivosNoCompra[0].cantidad
                    const porcentaje = (motivo.cantidad / maxCantidad) * 100
                    return (
                      <div key={motivo.motivo} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <span className="text-lg font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            {motivo.motivo}
                          </span>
                          <Badge variant="secondary">{motivo.cantidad}</Badge>
                        </div>
                        <Progress value={porcentaje} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay registros de no compras aun</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actividad Pendiente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-500" />
              Seguimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metricas.seguimientosPendientes}</div>
            <p className="text-sm text-muted-foreground">pendientes</p>
            {metricas.seguimientosVencidos > 0 && (
              <Badge variant="destructive" className="mt-2">
                {metricas.seguimientosVencidos} vencidos
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              Citas Programadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metricas.citasProgramadas}</div>
            <p className="text-sm text-muted-foreground">proximas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-500" />
              Re-visitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metricas.revisitasPendientes}</div>
            <p className="text-sm text-muted-foreground">requieren seguimiento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
