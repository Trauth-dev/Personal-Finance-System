"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  History, 
  UserPlus, 
  ClipboardList, 
  CalendarClock, 
  ShoppingCart, 
  MessageSquare,
  RotateCcw,
  XCircle,
  Search,
  Filter
} from "lucide-react"

interface HistorialItem {
  id: string
  tipo: 'cliente' | 'seguimiento' | 'agendamiento' | 'venta' | 'testimonio' | 'revisita' | 'no_compra'
  descripcion: string
  cliente_nombre?: string
  fecha: string
  metadata?: Record<string, unknown>
}

interface HistorialCRMManagerProps {
  perfilId: string
}

const tipoConfig = {
  cliente: { label: "Cliente", icon: UserPlus, color: "bg-blue-500" },
  seguimiento: { label: "Seguimiento", icon: ClipboardList, color: "bg-purple-500" },
  agendamiento: { label: "Agendamiento", icon: CalendarClock, color: "bg-amber-500" },
  venta: { label: "Venta", icon: ShoppingCart, color: "bg-green-500" },
  testimonio: { label: "Testimonio", icon: MessageSquare, color: "bg-cyan-500" },
  revisita: { label: "Re-visita", icon: RotateCcw, color: "bg-indigo-500" },
  no_compra: { label: "No Compra", icon: XCircle, color: "bg-red-500" },
}

export function HistorialCRMManager({ perfilId }: HistorialCRMManagerProps) {
  const [historial, setHistorial] = useState<HistorialItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [busqueda, setBusqueda] = useState("")
  const supabase = createClient()

  useEffect(() => {
    if (perfilId) {
      cargarHistorial()
    }
  }, [perfilId])

  const cargarHistorial = async () => {
    setIsLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const items: HistorialItem[] = []

    // Cargar clientes recientes
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nombre, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    clientes?.forEach(c => {
      items.push({
        id: `cliente-${c.id}`,
        tipo: 'cliente',
        descripcion: `Nuevo cliente registrado: ${c.nombre}`,
        cliente_nombre: c.nombre,
        fecha: c.created_at
      })
    })

    // Cargar seguimientos recientes
    const { data: seguimientos } = await supabase
      .from("crm_seguimientos")
      .select(`
        id, nota, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    seguimientos?.forEach(s => {
      const clienteNombre = (s.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `seguimiento-${s.id}`,
        tipo: 'seguimiento',
        descripcion: `Seguimiento: ${s.nota?.substring(0, 50)}...`,
        cliente_nombre: clienteNombre,
        fecha: s.created_at
      })
    })

    // Cargar agendamientos recientes
    const { data: agendamientos } = await supabase
      .from("crm_agendamientos")
      .select(`
        id, lugar, fecha_hora, tipo_reunion, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    agendamientos?.forEach(a => {
      const clienteNombre = (a.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `agendamiento-${a.id}`,
        tipo: 'agendamiento',
        descripcion: `Cita programada en ${a.lugar} - ${a.tipo_reunion}`,
        cliente_nombre: clienteNombre,
        fecha: a.created_at
      })
    })

    // Cargar ventas recientes
    const { data: ventas } = await supabase
      .from("crm_ventas")
      .select(`
        id, monto_total, tipo_pago, estado, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    ventas?.forEach(v => {
      const clienteNombre = (v.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `venta-${v.id}`,
        tipo: 'venta',
        descripcion: `Venta ${v.estado}: Gs ${v.monto_total?.toLocaleString()} (${v.tipo_pago})`,
        cliente_nombre: clienteNombre,
        fecha: v.created_at
      })
    })

    // Cargar testimonios recientes
    const { data: testimonios } = await supabase
      .from("crm_testimonios")
      .select(`
        id, tipo, texto, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    testimonios?.forEach(t => {
      const clienteNombre = (t.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `testimonio-${t.id}`,
        tipo: 'testimonio',
        descripcion: `Testimonio (${t.tipo}): ${t.texto?.substring(0, 50)}...`,
        cliente_nombre: clienteNombre,
        fecha: t.created_at
      })
    })

    // Cargar revisitas recientes
    const { data: revisitas } = await supabase
      .from("crm_revisitas")
      .select(`
        id, satisfaccion, notas, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    revisitas?.forEach(r => {
      const clienteNombre = (r.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `revisita-${r.id}`,
        tipo: 'revisita',
        descripcion: `Re-visita - Satisfaccion: ${r.satisfaccion}/5`,
        cliente_nombre: clienteNombre,
        fecha: r.created_at
      })
    })

    // Cargar no compras recientes
    const { data: noCompras } = await supabase
      .from("crm_no_compras")
      .select(`
        id, motivo, detalle, created_at,
        clientes:cliente_id (nombre)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })
      .limit(50)

    noCompras?.forEach(n => {
      const clienteNombre = (n.clientes as { nombre: string } | null)?.nombre || "Cliente"
      items.push({
        id: `no_compra-${n.id}`,
        tipo: 'no_compra',
        descripcion: `No compro: ${n.motivo} - ${n.detalle?.substring(0, 30)}...`,
        cliente_nombre: clienteNombre,
        fecha: n.created_at
      })
    })

    // Ordenar por fecha descendente
    items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    
    setHistorial(items)
    setIsLoading(false)
  }

  const historialFiltrado = historial.filter(item => {
    const cumpleFiltroTipo = filtroTipo === "todos" || item.tipo === filtroTipo
    const cumpleBusqueda = busqueda === "" || 
      item.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    return cumpleFiltroTipo && cumpleBusqueda
  })

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha)
    const ahora = new Date()
    const diffMs = ahora.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHoras = Math.floor(diffMs / 3600000)
    const diffDias = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHoras < 24) return `Hace ${diffHoras} horas`
    if (diffDias < 7) return `Hace ${diffDias} dias`
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en historial..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            <SelectItem value="cliente">Clientes</SelectItem>
            <SelectItem value="seguimiento">Seguimientos</SelectItem>
            <SelectItem value="agendamiento">Agendamientos</SelectItem>
            <SelectItem value="venta">Ventas</SelectItem>
            <SelectItem value="testimonio">Testimonios</SelectItem>
            <SelectItem value="revisita">Re-visitas</SelectItem>
            <SelectItem value="no_compra">No Compras</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estadisticas rapidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(tipoConfig).map(([tipo, config]) => {
          const count = historial.filter(h => h.tipo === tipo).length
          const Icon = config.icon
          return (
            <Card 
              key={tipo} 
              className={`cursor-pointer transition-all ${filtroTipo === tipo ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? "todos" : tipo)}
            >
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`p-1.5 rounded ${config.color}`}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <div>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] text-muted-foreground">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Lista de historial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historial de Actividades
          </CardTitle>
          <CardDescription>
            {historialFiltrado.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historialFiltrado.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay actividades registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {historialFiltrado.map((item) => {
                const config = tipoConfig[item.tipo]
                const Icon = config.icon
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${config.color} flex-shrink-0`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {config.label}
                        </Badge>
                        {item.cliente_nombre && (
                          <span className="text-sm font-medium text-primary">
                            {item.cliente_nombre}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">
                        {item.descripcion}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatFecha(item.fecha)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
