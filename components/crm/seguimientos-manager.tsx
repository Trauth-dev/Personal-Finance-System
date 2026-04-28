"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  ClipboardList, 
  Calendar, 
  CheckCircle2, 
  Clock,
  User,
  Bell,
  Trash2,
  Edit2,
  Package,
  ShoppingCart,
  Wrench,
  Phone,
  MessageSquare,
  AlertCircle,
  Settings
} from "lucide-react"
import { formatDateGMT3, formatDateLongGMT3, isToday, isPast } from "@/lib/utils/timezone"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
}

interface Producto {
  id: string
  nombre: string
  requiere_mantenimiento: boolean
  ciclo_mantenimiento_meses: number | null
}

interface Venta {
  id: string
  cliente_id: string
  producto_id: string | null
  total: number
  created_at: string
  clientes?: Cliente
  inventario?: Producto
}

interface Seguimiento {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  tipo_seguimiento: "posventa_inmediato" | "mantenimiento" | "general" | null
  venta_id: string | null
  producto_id: string | null
  ciclo_mantenimiento: number | null
  nota: string
  recordatorio_tipo: "semanal" | "quincenal" | "mensual" | "personalizado" | null
  recordatorio_fecha: string | null
  recordatorio_completado: boolean
  created_at: string
  clientes?: Cliente
  inventario?: Producto
  ventas?: Venta
}

interface ConfiguracionSeguimiento {
  horas_seguimiento_posventa: number
  crear_seguimiento_automatico: boolean
}

const RECORDATORIO_TIPOS = [
  { value: "semanal", label: "Cada semana", days: 7 },
  { value: "quincenal", label: "Cada 2 semanas", days: 14 },
  { value: "mensual", label: "Cada mes", days: 30 },
  { value: "personalizado", label: "Fecha personalizada", days: 0 },
]

const TIPO_SEGUIMIENTO_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  posventa_inmediato: { label: "Posventa", color: "bg-blue-500", icon: Phone },
  mantenimiento: { label: "Mantenimiento", color: "bg-orange-500", icon: Wrench },
  general: { label: "General", color: "bg-slate-500", icon: MessageSquare },
}

const HORAS_POSVENTA_OPTIONS = [
  { value: 24, label: "24 horas" },
  { value: 48, label: "48 horas" },
  { value: 72, label: "72 horas" },
]

export function SeguimientosManager({ perfilId }: { perfilId: string }) {
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [ventas, setVentas] = useState<Venta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [editingSeguimiento, setEditingSeguimiento] = useState<Seguimiento | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("pendientes")
  const [filterTipo, setFilterTipo] = useState<string>("todos")
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const [configuracion, setConfiguracion] = useState<ConfiguracionSeguimiento>({
    horas_seguimiento_posventa: 48,
    crear_seguimiento_automatico: true,
  })

  const [formData, setFormData] = useState({
    cliente_id: "",
    tipo_seguimiento: "general" as "posventa_inmediato" | "mantenimiento" | "general",
    venta_id: "",
    producto_id: "",
    ciclo_mantenimiento: "",
    nota: "",
    recordatorio_tipo: "" as "semanal" | "quincenal" | "mensual" | "personalizado" | "",
    recordatorio_fecha: "",
  })

  useEffect(() => {
    fetchData()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Fetch clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, telefono")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    // Fetch productos con mantenimiento
    const { data: productosData } = await supabase
      .from("inventario")
      .select("id, nombre, requiere_mantenimiento, ciclo_mantenimiento_meses")
      .eq("user_id", user.id)
      .order("nombre")

    setProductos(productosData || [])

    // Fetch ventas recientes
    const { data: ventasData } = await supabase
      .from("ventas")
      .select(`
        id, cliente_id, producto_id, total, created_at,
        clientes:cliente_id (id, nombre, apellido),
        inventario:producto_id (id, nombre)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    setVentas(ventasData || [])

    // Fetch seguimientos con datos relacionados
    const { data: seguimientosData, error } = await supabase
      .from("crm_seguimientos")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido, telefono),
        inventario:producto_id (id, nombre, requiere_mantenimiento, ciclo_mantenimiento_meses)
      `)
      .eq("perfil_id", perfilId)
      .order("recordatorio_fecha", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los seguimientos",
        variant: "destructive",
      })
    } else {
      setSeguimientos(seguimientosData || [])
    }

    // Fetch configuracion
    const { data: configData } = await supabase
      .from("crm_configuracion_seguimiento")
      .select("*")
      .eq("user_id", user.id)
      .eq("perfil_id", perfilId)
      .single()

    if (configData) {
      setConfiguracion({
        horas_seguimiento_posventa: configData.horas_seguimiento_posventa || 48,
        crear_seguimiento_automatico: configData.crear_seguimiento_automatico ?? true,
      })
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      tipo_seguimiento: "general",
      venta_id: "",
      producto_id: "",
      ciclo_mantenimiento: "",
      nota: "",
      recordatorio_tipo: "",
      recordatorio_fecha: "",
    })
    setEditingSeguimiento(null)
  }

  const calcularFechaRecordatorio = (tipo: string) => {
    const hoy = new Date()
    switch (tipo) {
      case "semanal":
        return new Date(hoy.setDate(hoy.getDate() + 7)).toISOString().split("T")[0]
      case "quincenal":
        return new Date(hoy.setDate(hoy.getDate() + 14)).toISOString().split("T")[0]
      case "mensual":
        return new Date(hoy.setMonth(hoy.getMonth() + 1)).toISOString().split("T")[0]
      default:
        return ""
    }
  }

  const calcularFechaPosventa = (horas: number) => {
    const fecha = new Date()
    fecha.setHours(fecha.getHours() + horas)
    return fecha.toISOString().split("T")[0]
  }

  const calcularFechaMantenimiento = (meses: number) => {
    const fecha = new Date()
    fecha.setMonth(fecha.getMonth() + meses)
    return fecha.toISOString().split("T")[0]
  }

  const handleOpenDialog = (seguimiento?: Seguimiento) => {
    if (seguimiento) {
      setEditingSeguimiento(seguimiento)
      setFormData({
        cliente_id: seguimiento.cliente_id,
        tipo_seguimiento: seguimiento.tipo_seguimiento || "general",
        venta_id: seguimiento.venta_id || "",
        producto_id: seguimiento.producto_id || "",
        ciclo_mantenimiento: seguimiento.ciclo_mantenimiento?.toString() || "",
        nota: seguimiento.nota,
        recordatorio_tipo: seguimiento.recordatorio_tipo || "",
        recordatorio_fecha: seguimiento.recordatorio_fecha || "",
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleTipoSeguimientoChange = (tipo: "posventa_inmediato" | "mantenimiento" | "general") => {
    setFormData(prev => ({
      ...prev,
      tipo_seguimiento: tipo,
      venta_id: "",
      producto_id: "",
      ciclo_mantenimiento: "",
      recordatorio_fecha: tipo === "posventa_inmediato" 
        ? calcularFechaPosventa(configuracion.horas_seguimiento_posventa)
        : "",
    }))
  }

  const handleVentaChange = (ventaId: string) => {
    const venta = ventas.find(v => v.id === ventaId)
    if (venta) {
      setFormData(prev => ({
        ...prev,
        venta_id: ventaId,
        cliente_id: venta.cliente_id,
        producto_id: venta.producto_id || "",
        nota: prev.nota || `Seguimiento posventa - ${venta.inventario?.nombre || "Producto"}`,
      }))
    }
  }

  const handleProductoMantenimientoChange = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (producto) {
      const ciclo = producto.ciclo_mantenimiento_meses || 6
      setFormData(prev => ({
        ...prev,
        producto_id: productoId,
        ciclo_mantenimiento: ciclo.toString(),
        recordatorio_fecha: calcularFechaMantenimiento(ciclo),
        nota: prev.nota || `Mantenimiento programado - ${producto.nombre}`,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!userId) return

    let fechaRecordatorio = formData.recordatorio_fecha
    if (formData.recordatorio_tipo && formData.recordatorio_tipo !== "personalizado" && !fechaRecordatorio) {
      fechaRecordatorio = calcularFechaRecordatorio(formData.recordatorio_tipo)
    }

    const seguimientoData = {
      user_id: userId,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      tipo_seguimiento: formData.tipo_seguimiento,
      venta_id: formData.venta_id || null,
      producto_id: formData.producto_id || null,
      ciclo_mantenimiento: formData.ciclo_mantenimiento ? parseInt(formData.ciclo_mantenimiento) : null,
      nota: formData.nota,
      recordatorio_tipo: formData.recordatorio_tipo || null,
      recordatorio_fecha: fechaRecordatorio || null,
      recordatorio_completado: false,
    }

    if (editingSeguimiento) {
      const { error } = await supabase
        .from("crm_seguimientos")
        .update(seguimientoData)
        .eq("id", editingSeguimiento.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el seguimiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Seguimiento actualizado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_seguimientos")
        .insert([seguimientoData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el seguimiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Seguimiento creado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleSaveConfiguracion = async () => {
    if (!userId) return

    const { error } = await supabase
      .from("crm_configuracion_seguimiento")
      .upsert({
        user_id: userId,
        perfil_id: perfilId,
        horas_seguimiento_posventa: configuracion.horas_seguimiento_posventa,
        crear_seguimiento_automatico: configuracion.crear_seguimiento_automatico,
      }, {
        onConflict: "user_id,perfil_id"
      })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuracion",
        variant: "destructive",
      })
    } else {
      toast({ title: "Configuracion guardada" })
      setIsConfigDialogOpen(false)
    }
  }

  const handleToggleCompletado = async (id: string, completado: boolean) => {
    const { error } = await supabase
      .from("crm_seguimientos")
      .update({ recordatorio_completado: !completado })
      .eq("id", id)

    if (!error) {
      fetchData()
      toast({ 
        title: completado ? "Seguimiento reabierto" : "Seguimiento completado" 
      })
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_seguimientos")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el seguimiento",
        variant: "destructive",
      })
    } else {
      toast({ title: "Seguimiento eliminado" })
      fetchData()
    }
  }

  // Crear seguimiento de mantenimiento recurrente
  const handleCrearMantenimientoRecurrente = async (seguimiento: Seguimiento) => {
    if (!userId || !seguimiento.ciclo_mantenimiento || !seguimiento.producto_id) return

    const nuevaFecha = calcularFechaMantenimiento(seguimiento.ciclo_mantenimiento)

    const { error } = await supabase
      .from("crm_seguimientos")
      .insert({
        user_id: userId,
        perfil_id: perfilId,
        cliente_id: seguimiento.cliente_id,
        tipo_seguimiento: "mantenimiento",
        producto_id: seguimiento.producto_id,
        ciclo_mantenimiento: seguimiento.ciclo_mantenimiento,
        nota: `Mantenimiento programado - ${seguimiento.inventario?.nombre || "Producto"}`,
        recordatorio_fecha: nuevaFecha,
        recordatorio_completado: false,
      })

    if (!error) {
      toast({ 
        title: "Nuevo mantenimiento programado",
        description: `Para el ${formatDateLongGMT3(nuevaFecha)}`
      })
      fetchData()
    }
  }

  const filteredSeguimientos = seguimientos.filter((s) => {
    const statusMatch = filterStatus === "todos" 
      || (filterStatus === "pendientes" && !s.recordatorio_completado)
      || (filterStatus === "completados" && s.recordatorio_completado)
    
    const tipoMatch = filterTipo === "todos" || s.tipo_seguimiento === filterTipo

    return statusMatch && tipoMatch
  })

  const getRecordatorioStatus = (fecha: string | null, completado: boolean) => {
    if (completado) return { color: "bg-green-500", label: "Completado" }
    if (!fecha) return { color: "bg-gray-500", label: "Sin fecha" }
    if (isToday(new Date(fecha))) return { color: "bg-yellow-500", label: "Hoy" }
    if (isPast(new Date(fecha))) return { color: "bg-red-500", label: "Vencido" }
    return { color: "bg-blue-500", label: "Pendiente" }
  }

  // Estadisticas por tipo
  const estadisticas = {
    total: seguimientos.length,
    pendientes: seguimientos.filter(s => !s.recordatorio_completado).length,
    hoy: seguimientos.filter(s => s.recordatorio_fecha && isToday(new Date(s.recordatorio_fecha)) && !s.recordatorio_completado).length,
    vencidos: seguimientos.filter(s => s.recordatorio_fecha && isPast(new Date(s.recordatorio_fecha)) && !s.recordatorio_completado).length,
    posventa: seguimientos.filter(s => s.tipo_seguimiento === "posventa_inmediato" && !s.recordatorio_completado).length,
    mantenimiento: seguimientos.filter(s => s.tipo_seguimiento === "mantenimiento" && !s.recordatorio_completado).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{estadisticas.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{estadisticas.pendientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Para Hoy</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{estadisticas.hoy}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencidos</CardDescription>
            <CardTitle className="text-2xl text-red-600">{estadisticas.vencidos}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> Posventa
            </CardDescription>
            <CardTitle className="text-2xl text-blue-500">{estadisticas.posventa}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Wrench className="h-3 w-3" /> Mantenimiento
            </CardDescription>
            <CardTitle className="text-2xl text-orange-500">{estadisticas.mantenimiento}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de seguimientos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Seguimientos Posventa
              </CardTitle>
              <CardDescription>
                Gestiona el seguimiento de tus clientes despues de la venta
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[140px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="posventa_inmediato">Posventa</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendientes">Pendientes</SelectItem>
                  <SelectItem value="completados">Completados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setIsConfigDialogOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Seguimiento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[550px]">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSeguimiento ? "Editar Seguimiento" : "Nuevo Seguimiento"}
                    </DialogTitle>
                    <DialogDescription>
                      Crea un seguimiento posventa o de mantenimiento
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tipo de seguimiento */}
                    <div className="space-y-2">
                      <Label>Tipo de Seguimiento</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["posventa_inmediato", "mantenimiento", "general"] as const).map((tipo) => {
                          const config = TIPO_SEGUIMIENTO_LABELS[tipo]
                          const Icon = config.icon
                          return (
                            <Button
                              key={tipo}
                              type="button"
                              variant={formData.tipo_seguimiento === tipo ? "default" : "outline"}
                              className={`flex flex-col h-auto py-3 ${formData.tipo_seguimiento === tipo ? config.color : ""}`}
                              onClick={() => handleTipoSeguimientoChange(tipo)}
                            >
                              <Icon className="h-5 w-5 mb-1" />
                              <span className="text-xs">{config.label}</span>
                            </Button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Campos segun tipo */}
                    {formData.tipo_seguimiento === "posventa_inmediato" && (
                      <div className="space-y-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200">Venta relacionada</Label>
                          <Select value={formData.venta_id} onValueChange={handleVentaChange}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              <SelectValue placeholder="Seleccionar venta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ventas.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.clientes?.nombre} - {v.inventario?.nombre || "Producto"} ({formatDateGMT3(v.created_at)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Seguimiento programado para {configuracion.horas_seguimiento_posventa}hs despues de la venta
                        </div>
                      </div>
                    )}

                    {formData.tipo_seguimiento === "mantenimiento" && (
                      <div className="space-y-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200">Cliente *</Label>
                          <Select
                            value={formData.cliente_id}
                            onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                          >
                            <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clientes.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nombre} {c.apellido}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200">Producto</Label>
                          <Select value={formData.producto_id} onValueChange={handleProductoMantenimientoChange}>
                            <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                              <SelectValue placeholder="Seleccionar producto..." />
                            </SelectTrigger>
                            <SelectContent>
                              {productos.filter(p => p.requiere_mantenimiento).map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nombre} (cada {p.ciclo_mantenimiento_meses || 6} meses)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-700 dark:text-slate-200">Ciclo de mantenimiento (meses)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.ciclo_mantenimiento}
                            onChange={(e) => {
                              const meses = parseInt(e.target.value) || 6
                              setFormData({ 
                                ...formData, 
                                ciclo_mantenimiento: e.target.value,
                                recordatorio_fecha: calcularFechaMantenimiento(meses)
                              })
                            }}
                            placeholder="6"
                            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {formData.tipo_seguimiento === "general" && (
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200">Cliente *</Label>
                        <Select
                          value={formData.cliente_id}
                          onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {clientes.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nombre} {c.apellido}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Nota */}
                    <div className="space-y-2">
                      <Label className="text-slate-700 dark:text-slate-200">Nota *</Label>
                      <Textarea
                        value={formData.nota}
                        onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                        placeholder={
                          formData.tipo_seguimiento === "posventa_inmediato" 
                            ? "Ej: Llamar para saber como le fue con el producto, resolver dudas..."
                            : formData.tipo_seguimiento === "mantenimiento"
                            ? "Ej: Realizar cambio de filtros/minerales..."
                            : "Escribe la nota de seguimiento..."
                        }
                        rows={3}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        required
                      />
                    </div>

                    {/* Fecha recordatorio */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200">Tipo de recordatorio</Label>
                        <Select
                          value={formData.recordatorio_tipo}
                          onValueChange={(value) =>
                            setFormData({
                              ...formData,
                              recordatorio_tipo: value as typeof formData.recordatorio_tipo,
                              recordatorio_fecha: value !== "personalizado" 
                                ? calcularFechaRecordatorio(value) 
                                : formData.recordatorio_fecha,
                            })
                          }
                        >
                          <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {RECORDATORIO_TIPOS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-slate-700 dark:text-slate-200">Fecha</Label>
                        <Input
                          type="date"
                          value={formData.recordatorio_fecha}
                          onChange={(e) => setFormData({ ...formData, recordatorio_fecha: e.target.value })}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false)
                          resetForm()
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={!formData.cliente_id || !formData.nota}>
                        {editingSeguimiento ? "Guardar" : "Crear Seguimiento"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSeguimientos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay seguimientos</p>
              <p className="text-sm">Agrega tu primer seguimiento posventa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSeguimientos.map((seguimiento) => {
                const status = getRecordatorioStatus(
                  seguimiento.recordatorio_fecha,
                  seguimiento.recordatorio_completado
                )
                const tipoConfig = TIPO_SEGUIMIENTO_LABELS[seguimiento.tipo_seguimiento || "general"]
                const TipoIcon = tipoConfig?.icon || MessageSquare

                return (
                  <Card key={seguimiento.id} className={seguimiento.recordatorio_completado ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={seguimiento.recordatorio_completado}
                          onCheckedChange={() =>
                            handleToggleCompletado(seguimiento.id, seguimiento.recordatorio_completado)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={`${tipoConfig?.color || "bg-slate-500"} text-white text-xs flex items-center gap-1`}>
                              <TipoIcon className="h-3 w-3" />
                              {tipoConfig?.label || "General"}
                            </Badge>
                            <span className="font-medium flex items-center gap-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {seguimiento.clientes?.nombre} {seguimiento.clientes?.apellido}
                            </span>
                            <Badge className={`${status.color} text-white text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          
                          {seguimiento.inventario && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                              <Package className="h-3 w-3" />
                              {seguimiento.inventario.nombre}
                              {seguimiento.ciclo_mantenimiento && (
                                <span className="text-orange-600 dark:text-orange-400">
                                  (cada {seguimiento.ciclo_mantenimiento} meses)
                                </span>
                              )}
                            </div>
                          )}

                          <p className={`text-sm ${seguimiento.recordatorio_completado ? "line-through" : ""}`}>
                            {seguimiento.nota}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {seguimiento.recordatorio_fecha && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateLongGMT3(seguimiento.recordatorio_fecha)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          {/* Boton para crear siguiente mantenimiento */}
                          {seguimiento.tipo_seguimiento === "mantenimiento" && 
                           seguimiento.recordatorio_completado && 
                           seguimiento.ciclo_mantenimiento && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCrearMantenimientoRecurrente(seguimiento)}
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            >
                              <Wrench className="h-3 w-3 mr-1" />
                              Programar proximo
                            </Button>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(seguimiento)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(seguimiento.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de configuracion */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuracion de Seguimientos
            </DialogTitle>
            <DialogDescription>
              Personaliza como se crean los seguimientos posventa
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-slate-700 dark:text-slate-200">
                Tiempo para seguimiento posventa
              </Label>
              <p className="text-xs text-muted-foreground">
                Cuantas horas despues de la venta se debe contactar al cliente
              </p>
              <div className="grid grid-cols-3 gap-2">
                {HORAS_POSVENTA_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={configuracion.horas_seguimiento_posventa === option.value ? "default" : "outline"}
                    onClick={() => setConfiguracion({ 
                      ...configuracion, 
                      horas_seguimiento_posventa: option.value 
                    })}
                    className="flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <Label className="text-slate-700 dark:text-slate-200">
                  Crear seguimiento automatico
                </Label>
                <p className="text-xs text-muted-foreground">
                  Al registrar una venta, crear seguimiento automaticamente
                </p>
              </div>
              <Checkbox
                checked={configuracion.crear_seguimiento_automatico}
                onCheckedChange={(checked) => setConfiguracion({
                  ...configuracion,
                  crear_seguimiento_automatico: !!checked
                })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfiguracion}>
              Guardar Configuracion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
