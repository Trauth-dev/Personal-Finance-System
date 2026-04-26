"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  History,
  User,
  DollarSign,
  Calendar,
  ClipboardList,
  ShoppingCart,
  TrendingUp,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Package
} from "lucide-react"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
  email: string | null
  ciudad: string | null
  ultima_actividad: string | null
}

interface Oportunidad {
  id: string
  titulo: string
  valor_estimado: number | null
  probabilidad: number
  prioridad: string
  created_at: string
  etapa?: {
    nombre: string
    color: string
    es_etapa_ganada: boolean
  }
}

interface Seguimiento {
  id: string
  nota: string
  recordatorio_fecha: string | null
  recordatorio_completado: boolean
  created_at: string
  oportunidad?: {
    titulo: string
  }
}

interface Agendamiento {
  id: string
  titulo: string
  tipo: string
  fecha_hora: string
  estado: string
  oportunidad?: {
    titulo: string
  }
}

interface Venta {
  id: string
  monto_total: number
  estado: string
  created_at: string
}

interface ActividadUnificada {
  id: string
  tipo: "oportunidad" | "seguimiento" | "agendamiento" | "venta" | "pipeline_cambio"
  titulo: string
  descripcion: string
  fecha: string
  estado?: string
  monto?: number
  color: string
  icono: string
  datos?: Record<string, unknown>
}

// Formatear a GMT-3 (Paraguay)
const formatDateGMT3 = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-PY', { 
    timeZone: 'America/Asuncion',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

const formatDateTimeGMT3 = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleString('es-PY', { 
    timeZone: 'America/Asuncion',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("PYG", "Gs.")
}

interface ClienteHistorialUnificadoProps {
  clienteId: string
  perfilId: string
}

export function ClienteHistorialUnificado({ clienteId, perfilId }: ClienteHistorialUnificadoProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [agendamientos, setAgendamientos] = useState<Agendamiento[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [actividades, setActividades] = useState<ActividadUnificada[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("timeline")
  
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    if (clienteId) {
      loadHistorial()
    }
  }, [clienteId, perfilId])

  const loadHistorial = async () => {
    try {
      setLoading(true)

      // Cargar cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", clienteId)
        .single()

      if (clienteError) throw clienteError
      setCliente(clienteData)

      // Cargar oportunidades
      const { data: oportunidadesData } = await supabase
        .from("crm_oportunidades")
        .select(`
          *,
          etapa:crm_pipeline_etapas(nombre, color, es_etapa_ganada)
        `)
        .eq("cliente_id", clienteId)
        .eq("perfil_id", perfilId)
        .order("created_at", { ascending: false })

      setOportunidades(oportunidadesData || [])

      // Cargar seguimientos
      const { data: seguimientosData } = await supabase
        .from("crm_seguimientos")
        .select(`
          *,
          oportunidad:crm_oportunidades(titulo)
        `)
        .eq("cliente_id", clienteId)
        .eq("perfil_id", perfilId)
        .order("created_at", { ascending: false })

      setSeguimientos(seguimientosData || [])

      // Cargar agendamientos
      const { data: agendamientosData } = await supabase
        .from("crm_agendamientos")
        .select(`
          *,
          oportunidad:crm_oportunidades(titulo)
        `)
        .eq("cliente_id", clienteId)
        .eq("perfil_id", perfilId)
        .order("fecha_hora", { ascending: false })

      setAgendamientos(agendamientosData || [])

      // Cargar ventas
      const { data: ventasData } = await supabase
        .from("crm_ventas")
        .select("*")
        .eq("cliente_id", clienteId)
        .eq("perfil_id", perfilId)
        .order("created_at", { ascending: false })

      setVentas(ventasData || [])

      // Construir timeline unificado
      const actividadesUnificadas: ActividadUnificada[] = []

      // Agregar oportunidades
      oportunidadesData?.forEach(op => {
        actividadesUnificadas.push({
          id: `op-${op.id}`,
          tipo: "oportunidad",
          titulo: op.titulo,
          descripcion: `Nueva oportunidad creada - ${op.etapa?.nombre || "Sin etapa"}`,
          fecha: op.created_at,
          monto: op.valor_estimado || undefined,
          color: op.etapa?.color || "#6366f1",
          icono: "trending-up",
          datos: op
        })
      })

      // Agregar seguimientos
      seguimientosData?.forEach(seg => {
        actividadesUnificadas.push({
          id: `seg-${seg.id}`,
          tipo: "seguimiento",
          titulo: "Seguimiento",
          descripcion: seg.nota,
          fecha: seg.created_at,
          estado: seg.recordatorio_completado ? "completado" : "pendiente",
          color: seg.recordatorio_completado ? "#22c55e" : "#eab308",
          icono: "clipboard-list",
          datos: seg
        })
      })

      // Agregar agendamientos
      agendamientosData?.forEach(ag => {
        actividadesUnificadas.push({
          id: `ag-${ag.id}`,
          tipo: "agendamiento",
          titulo: ag.titulo,
          descripcion: `${ag.tipo} - ${ag.estado}`,
          fecha: ag.fecha_hora,
          estado: ag.estado,
          color: ag.estado === "realizado" ? "#22c55e" : ag.estado === "cancelado" ? "#ef4444" : "#3b82f6",
          icono: "calendar",
          datos: ag
        })
      })

      // Agregar ventas
      ventasData?.forEach(v => {
        actividadesUnificadas.push({
          id: `v-${v.id}`,
          tipo: "venta",
          titulo: "Venta realizada",
          descripcion: `Venta por ${formatMoney(v.monto_total)}`,
          fecha: v.created_at,
          monto: v.monto_total,
          estado: v.estado,
          color: "#10b981",
          icono: "shopping-cart",
          datos: v
        })
      })

      // Ordenar por fecha descendente
      actividadesUnificadas.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )

      setActividades(actividadesUnificadas)

    } catch (error) {
      console.error("Error loading historial:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el historial del cliente",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (icono: string) => {
    switch (icono) {
      case "trending-up": return <TrendingUp className="h-4 w-4" />
      case "clipboard-list": return <ClipboardList className="h-4 w-4" />
      case "calendar": return <Calendar className="h-4 w-4" />
      case "shopping-cart": return <ShoppingCart className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  const getEstadoBadge = (actividad: ActividadUnificada) => {
    if (!actividad.estado) return null
    
    const colores: Record<string, string> = {
      completado: "bg-green-100 text-green-700",
      pendiente: "bg-yellow-100 text-yellow-700",
      realizado: "bg-green-100 text-green-700",
      cancelado: "bg-red-100 text-red-700",
      pagado: "bg-green-100 text-green-700"
    }
    
    return (
      <Badge className={`text-xs ${colores[actividad.estado] || "bg-gray-100 text-gray-700"}`}>
        {actividad.estado}
      </Badge>
    )
  }

  // Calcular estadisticas
  const stats = {
    totalOportunidades: oportunidades.length,
    oportunidadesGanadas: oportunidades.filter(o => o.etapa?.es_etapa_ganada).length,
    totalSeguimientos: seguimientos.length,
    seguimientosPendientes: seguimientos.filter(s => !s.recordatorio_completado).length,
    totalAgendamientos: agendamientos.length,
    totalVentas: ventas.length,
    montoVentas: ventas.reduce((sum, v) => sum + v.monto_total, 0),
    valorPipeline: oportunidades.reduce((sum, o) => sum + (o.valor_estimado || 0), 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Cliente no encontrado</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header del Cliente */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {cliente.nombre.charAt(0).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {cliente.nombre} {cliente.apellido}
                </CardTitle>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  {cliente.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {cliente.telefono}
                    </span>
                  )}
                  {cliente.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {cliente.email}
                    </span>
                  )}
                  {cliente.ciudad && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {cliente.ciudad}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {cliente.ultima_actividad && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Ultima actividad: {formatDateGMT3(cliente.ultima_actividad)}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Oportunidades</p>
                <p className="text-2xl font-bold">{stats.totalOportunidades}</p>
                <p className="text-xs text-green-600">{stats.oportunidadesGanadas} ganadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Seguimientos</p>
                <p className="text-2xl font-bold">{stats.totalSeguimientos}</p>
                <p className="text-xs text-yellow-600">{stats.seguimientosPendientes} pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Citas</p>
                <p className="text-2xl font-bold">{stats.totalAgendamientos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Ventas</p>
                <p className="text-2xl font-bold">{stats.totalVentas}</p>
                <p className="text-xs text-green-600">{formatMoney(stats.montoVentas)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial Completo
          </CardTitle>
          <CardDescription>
            Toda la actividad relacionada con este cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="oportunidades">Oportunidades</TabsTrigger>
              <TabsTrigger value="seguimientos">Seguimientos</TabsTrigger>
              <TabsTrigger value="citas">Citas</TabsTrigger>
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
            </TabsList>

            {/* Timeline Unificado */}
            <TabsContent value="timeline" className="mt-4">
              {actividades.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay actividades registradas</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {actividades.map((actividad) => (
                      <div key={actividad.id} className="relative pl-10">
                        <div 
                          className="absolute left-2 w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: actividad.color }}
                        >
                          {getIconComponent(actividad.icono)}
                        </div>
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {actividad.tipo.replace("_", " ")}
                                  </Badge>
                                  {getEstadoBadge(actividad)}
                                </div>
                                <h4 className="font-medium">{actividad.titulo}</h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {actividad.descripcion}
                                </p>
                                {actividad.monto && (
                                  <p className="text-sm font-medium text-green-600 mt-1">
                                    {formatMoney(actividad.monto)}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDateTimeGMT3(actividad.fecha)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Oportunidades */}
            <TabsContent value="oportunidades" className="mt-4">
              {oportunidades.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay oportunidades registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {oportunidades.map((op) => (
                    <Card key={op.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{op.titulo}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge 
                                style={{ backgroundColor: op.etapa?.color }}
                                className="text-white text-xs"
                              >
                                {op.etapa?.nombre}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {op.probabilidad}% probabilidad
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            {op.valor_estimado && (
                              <p className="font-medium text-green-600">
                                {formatMoney(op.valor_estimado)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDateGMT3(op.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Seguimientos */}
            <TabsContent value="seguimientos" className="mt-4">
              {seguimientos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay seguimientos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {seguimientos.map((seg) => (
                    <Card key={seg.id} className={seg.recordatorio_completado ? "opacity-60" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {seg.recordatorio_completado ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={seg.recordatorio_completado ? "line-through" : ""}>
                              {seg.nota}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {seg.oportunidad && (
                                <Badge variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  {seg.oportunidad.titulo}
                                </Badge>
                              )}
                              {seg.recordatorio_fecha && (
                                <span>Recordatorio: {formatDateGMT3(seg.recordatorio_fecha)}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDateGMT3(seg.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Citas */}
            <TabsContent value="citas" className="mt-4">
              {agendamientos.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay citas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamientos.map((ag) => (
                    <Card key={ag.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{ag.titulo}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {ag.tipo}
                              </Badge>
                              <Badge 
                                className={`text-xs ${
                                  ag.estado === "realizado" ? "bg-green-100 text-green-700" :
                                  ag.estado === "cancelado" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {ag.estado}
                              </Badge>
                              {ag.oportunidad && (
                                <span className="text-xs text-muted-foreground">
                                  <ArrowRight className="h-3 w-3 inline mr-1" />
                                  {ag.oportunidad.titulo}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatDateTimeGMT3(ag.fecha_hora)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Ventas */}
            <TabsContent value="ventas" className="mt-4">
              {ventas.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay ventas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {ventas.map((v) => (
                    <Card key={v.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-green-600">
                                {formatMoney(v.monto_total)}
                              </p>
                              <Badge className={`text-xs ${
                                v.estado === "pagado" ? "bg-green-100 text-green-700" :
                                v.estado === "pendiente" ? "bg-yellow-100 text-yellow-700" :
                                "bg-gray-100 text-gray-700"
                              }`}>
                                {v.estado}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDateGMT3(v.created_at)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
