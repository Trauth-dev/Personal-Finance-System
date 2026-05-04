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
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  RotateCcw,
  User,
  Trash2,
  Edit2,
  Calendar,
  MapPin,
  Video,
  Phone,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MoreVertical,
  Wrench,
  Package,
  ShoppingCart,
  Bell,
  Check,
  X,
  CalendarClock,
  TrendingUp,
  Filter
} from "lucide-react"
import { formatDateGMT3, formatDateTimeGMT3, toISOWithGMT3, isToday, isPast } from "@/lib/utils/timezone"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
  email: string | null
}

interface Producto {
  id: string
  nombre: string
  requiere_mantenimiento: boolean
  ciclo_mantenimiento_meses: number | null
}

interface Revisita {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  producto_id: string | null
  venta_id: string | null
  seguimiento_id: string | null
  tipo: "presencial" | "virtual" | "telefonica"
  motivo: "mantenimiento" | "seguimiento" | "venta_cruzada" | "soporte" | "otro"
  estado: "sugerida" | "confirmada" | "programada" | "realizada" | "cancelada"
  es_automatica: boolean
  confirmada_por_usuario: boolean
  fecha_programada: string | null
  hora_programada: string | null
  lugar: string | null
  duracion_minutos: number
  notas: string | null
  resultado: string | null
  nueva_venta_realizada: boolean
  satisfaccion: number | null
  created_at: string
  clientes?: Cliente
  inventario?: Producto
}

interface RevisitaSugerida {
  id: string
  cliente_id: string
  producto_id: string
  motivo: string
  fecha_sugerida: string
  estado: string
  clientes?: Cliente
  inventario?: Producto
}

const MOTIVOS = {
  mantenimiento: { label: "Mantenimiento", icon: Wrench, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
  seguimiento: { label: "Seguimiento", icon: RotateCcw, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
  venta_cruzada: { label: "Venta Cruzada", icon: ShoppingCart, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
  soporte: { label: "Soporte", icon: Phone, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
  otro: { label: "Otro", icon: Calendar, color: "text-slate-600 bg-slate-100 dark:bg-slate-900/30" }
}

const TIPOS = {
  presencial: { label: "Presencial", icon: MapPin },
  virtual: { label: "Virtual", icon: Video },
  telefonica: { label: "Telefonica", icon: Phone }
}

const ESTADOS = {
  sugerida: { label: "Sugerida", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  confirmada: { label: "Confirmada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  programada: { label: "Programada", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  realizada: { label: "Realizada", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  cancelada: { label: "Cancelada", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" }
}

export function RevisitasManager({ perfilId }: { perfilId: string }) {
  const [revisitas, setRevisitas] = useState<Revisita[]>([])
  const [sugeridas, setSugeridas] = useState<RevisitaSugerida[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRevisita, setEditingRevisita] = useState<Revisita | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pendientes")
  const [filtroMotivo, setFiltroMotivo] = useState<string>("todos")
  
  // Dialog para confirmar sugerencia
  const [confirmSugerenciaDialog, setConfirmSugerenciaDialog] = useState(false)
  const [selectedSugerencia, setSelectedSugerencia] = useState<RevisitaSugerida | null>(null)
  
  // Dialog para completar revisita
  const [completarDialog, setCompletarDialog] = useState(false)
  const [revisitaCompletar, setRevisitaCompletar] = useState<Revisita | null>(null)
  const [resultadoCompletar, setResultadoCompletar] = useState("")
  const [satisfaccionCompletar, setSatisfaccionCompletar] = useState(5)
  const [nuevaVentaCompletar, setNuevaVentaCompletar] = useState(false)
  
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    producto_id: "",
    tipo: "presencial" as "presencial" | "virtual" | "telefonica",
    motivo: "mantenimiento" as "mantenimiento" | "seguimiento" | "venta_cruzada" | "soporte" | "otro",
    fecha_programada: "",
    hora_programada: "09:00",
    lugar: "",
    duracion_minutos: 60,
    notas: ""
  })

  useEffect(() => {
    fetchData()
    verificarMantenimientosPendientes()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    // Cargar clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, telefono, email")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    // Cargar productos
    const { data: productosData } = await supabase
      .from("inventario")
      .select("id, nombre, requiere_mantenimiento, ciclo_mantenimiento_meses")
      .eq("perfil_id", perfilId)
      .eq("activo", true)

    setProductos(productosData || [])

    // Cargar revisitas
    const { data: revisitasData } = await supabase
      .from("crm_revisitas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido, telefono, email),
        inventario:producto_id (id, nombre, requiere_mantenimiento, ciclo_mantenimiento_meses)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha_programada", { ascending: true })

    setRevisitas(revisitasData || [])

    // Cargar sugerencias pendientes
    const { data: sugeridasData } = await supabase
      .from("crm_revisitas_sugeridas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido),
        inventario:producto_id (id, nombre)
      `)
      .eq("perfil_id", perfilId)
      .eq("estado", "pendiente")
      .order("fecha_sugerida", { ascending: true })

    setSugeridas(sugeridasData || [])

    setIsLoading(false)
  }

  // Verificar productos que necesitan mantenimiento
  const verificarMantenimientosPendientes = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Buscar ventas de productos con mantenimiento
    const { data: ventasConMantenimiento } = await supabase
      .from("crm_ventas")
      .select(`
        id,
        cliente_id,
        fecha_venta,
        crm_ventas_detalle!inner (
          producto_id,
          inventario:producto_id (
            id,
            nombre,
            requiere_mantenimiento,
            ciclo_mantenimiento_meses
          )
        )
      `)
      .eq("perfil_id", perfilId)

    if (!ventasConMantenimiento) return

    const hoy = new Date()

    for (const venta of ventasConMantenimiento) {
      for (const detalle of venta.crm_ventas_detalle || []) {
        const producto = detalle.inventario
        if (!producto?.requiere_mantenimiento || !producto.ciclo_mantenimiento_meses) continue

        const fechaVenta = new Date(venta.fecha_venta)
        const mesesTranscurridos = (hoy.getFullYear() - fechaVenta.getFullYear()) * 12 + 
          (hoy.getMonth() - fechaVenta.getMonth())

        if (mesesTranscurridos >= producto.ciclo_mantenimiento_meses) {
          // Verificar si ya existe sugerencia para este cliente/producto
          const { data: sugerenciaExistente } = await supabase
            .from("crm_revisitas_sugeridas")
            .select("id")
            .eq("cliente_id", venta.cliente_id)
            .eq("producto_id", producto.id)
            .eq("estado", "pendiente")
            .limit(1)
            .single()

          if (!sugerenciaExistente) {
            // Crear sugerencia automatica
            await supabase
              .from("crm_revisitas_sugeridas")
              .insert({
                user_id: user.id,
                perfil_id: perfilId,
                cliente_id: venta.cliente_id,
                producto_id: producto.id,
                venta_id: venta.id,
                motivo: `Mantenimiento de ${producto.nombre} (${producto.ciclo_mantenimiento_meses} meses)`,
                fecha_sugerida: new Date().toISOString().split("T")[0],
                estado: "pendiente"
              })
          }
        }
      }
    }

    // Recargar sugerencias
    const { data: sugeridasActualizadas } = await supabase
      .from("crm_revisitas_sugeridas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido),
        inventario:producto_id (id, nombre)
      `)
      .eq("perfil_id", perfilId)
      .eq("estado", "pendiente")
      .order("fecha_sugerida", { ascending: true })

    setSugeridas(sugeridasActualizadas || [])
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      producto_id: "",
      tipo: "presencial",
      motivo: "mantenimiento",
      fecha_programada: "",
      hora_programada: "09:00",
      lugar: "",
      duracion_minutos: 60,
      notas: ""
    })
    setEditingRevisita(null)
  }

  const handleOpenDialog = (revisita?: Revisita) => {
    if (revisita) {
      setEditingRevisita(revisita)
      setFormData({
        cliente_id: revisita.cliente_id,
        producto_id: revisita.producto_id || "",
        tipo: revisita.tipo,
        motivo: revisita.motivo,
        fecha_programada: revisita.fecha_programada || "",
        hora_programada: revisita.hora_programada || "09:00",
        lugar: revisita.lugar || "",
        duracion_minutos: revisita.duracion_minutos,
        notas: revisita.notas || ""
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !formData.cliente_id) return

    const revisitaData = {
      user_id: userId,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      producto_id: formData.producto_id || null,
      tipo: formData.tipo,
      motivo: formData.motivo,
      estado: formData.fecha_programada ? "programada" : "confirmada",
      fecha_programada: formData.fecha_programada || null,
      hora_programada: formData.hora_programada || null,
      lugar: formData.lugar || null,
      duracion_minutos: formData.duracion_minutos,
      notas: formData.notas || null,
      es_automatica: false,
      confirmada_por_usuario: true
    }

    if (editingRevisita) {
      const { error } = await supabase
        .from("crm_revisitas")
        .update(revisitaData)
        .eq("id", editingRevisita.id)

      if (error) {
        toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
      } else {
        toast({ title: "Re-visita actualizada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_revisitas")
        .insert([revisitaData])

      if (error) {
        toast({ title: "Error", description: "No se pudo crear", variant: "destructive" })
      } else {
        toast({ title: "Re-visita programada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  // Confirmar sugerencia automatica
  const handleConfirmarSugerencia = async () => {
    if (!selectedSugerencia || !userId) return

    // Crear la revisita
    const { error: errorRevisita } = await supabase
      .from("crm_revisitas")
      .insert({
        user_id: userId,
        perfil_id: perfilId,
        cliente_id: selectedSugerencia.cliente_id,
        producto_id: selectedSugerencia.producto_id,
        tipo: formData.tipo,
        motivo: "mantenimiento",
        estado: formData.fecha_programada ? "programada" : "confirmada",
        fecha_programada: formData.fecha_programada || null,
        hora_programada: formData.hora_programada || null,
        lugar: formData.lugar || null,
        duracion_minutos: formData.duracion_minutos,
        notas: formData.notas || `Mantenimiento programado: ${selectedSugerencia.motivo}`,
        es_automatica: true,
        confirmada_por_usuario: true
      })

    if (errorRevisita) {
      toast({ title: "Error", description: "No se pudo crear la revisita", variant: "destructive" })
      return
    }

    // Actualizar estado de la sugerencia
    await supabase
      .from("crm_revisitas_sugeridas")
      .update({ estado: "aceptada" })
      .eq("id", selectedSugerencia.id)

    toast({ title: "Re-visita confirmada", description: "La re-visita ha sido programada" })
    setConfirmSugerenciaDialog(false)
    setSelectedSugerencia(null)
    resetForm()
    fetchData()
  }

  // Rechazar sugerencia
  const handleRechazarSugerencia = async (sugerencia: RevisitaSugerida) => {
    await supabase
      .from("crm_revisitas_sugeridas")
      .update({ estado: "rechazada" })
      .eq("id", sugerencia.id)

    toast({ title: "Sugerencia rechazada" })
    fetchData()
  }

  // Completar revisita
  const handleCompletarRevisita = async () => {
    if (!revisitaCompletar) return

    const { error } = await supabase
      .from("crm_revisitas")
      .update({
        estado: "realizada",
        resultado: resultadoCompletar,
        satisfaccion: satisfaccionCompletar,
        nueva_venta_realizada: nuevaVentaCompletar
      })
      .eq("id", revisitaCompletar.id)

    if (error) {
      toast({ title: "Error", description: "No se pudo completar", variant: "destructive" })
    } else {
      // Si el producto requiere mantenimiento, programar proximo
      if (revisitaCompletar.inventario?.requiere_mantenimiento && 
          revisitaCompletar.inventario?.ciclo_mantenimiento_meses) {
        const proximaFecha = new Date()
        proximaFecha.setMonth(proximaFecha.getMonth() + revisitaCompletar.inventario.ciclo_mantenimiento_meses)

        await supabase
          .from("crm_revisitas_sugeridas")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            cliente_id: revisitaCompletar.cliente_id,
            producto_id: revisitaCompletar.producto_id,
            motivo: `Proximo mantenimiento de ${revisitaCompletar.inventario.nombre}`,
            fecha_sugerida: proximaFecha.toISOString().split("T")[0],
            estado: "pendiente"
          })
      }

      toast({ title: "Re-visita completada" })
      setCompletarDialog(false)
      setRevisitaCompletar(null)
      setResultadoCompletar("")
      setSatisfaccionCompletar(5)
      setNuevaVentaCompletar(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_revisitas")
      .delete()
      .eq("id", id)

    if (error) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    } else {
      toast({ title: "Re-visita eliminada" })
      fetchData()
    }
  }

  const handleCancelar = async (revisita: Revisita) => {
    const { error } = await supabase
      .from("crm_revisitas")
      .update({ estado: "cancelada" })
      .eq("id", revisita.id)

    if (error) {
      toast({ title: "Error", variant: "destructive" })
    } else {
      toast({ title: "Re-visita cancelada" })
      fetchData()
    }
  }

  // Filtrar revisitas
  const revisitasPendientes = revisitas.filter(r => 
    ["sugerida", "confirmada", "programada"].includes(r.estado)
  )
  const revisitasRealizadas = revisitas.filter(r => r.estado === "realizada")
  const revisitasCanceladas = revisitas.filter(r => r.estado === "cancelada")

  const revisitasFiltradas = (lista: Revisita[]) => {
    if (filtroMotivo === "todos") return lista
    return lista.filter(r => r.motivo === filtroMotivo)
  }

  // Estadisticas
  const stats = {
    total: revisitas.length,
    pendientes: revisitasPendientes.length,
    sugerencias: sugeridas.length,
    hoy: revisitas.filter(r => r.fecha_programada && isToday(new Date(r.fecha_programada))).length,
    realizadas: revisitasRealizadas.length,
    conVenta: revisitas.filter(r => r.nueva_venta_realizada).length
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
      {/* Alerta de sugerencias pendientes */}
      {sugeridas.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {sugeridas.length} Re-visita{sugeridas.length > 1 ? "s" : ""} Sugerida{sugeridas.length > 1 ? "s" : ""}
            </CardTitle>
            <CardDescription className="text-yellow-600 dark:text-yellow-500">
              El sistema detecto clientes que necesitan mantenimiento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sugeridas.map((sug) => (
                <div key={sug.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                      <Wrench className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {sug.clientes?.nombre} {sug.clientes?.apellido}
                      </p>
                      <p className="text-sm text-slate-500">
                        {sug.motivo} - {sug.inventario?.nombre}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRechazarSugerencia(sug)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSugerencia(sug)
                        setFormData({
                          ...formData,
                          cliente_id: sug.cliente_id,
                          producto_id: sug.producto_id,
                          motivo: "mantenimiento"
                        })
                        setConfirmSugerenciaDialog(true)
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirmar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.pendientes}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sugerencias</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.sugerencias}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Hoy</CardDescription>
            <CardTitle className="text-2xl text-cyan-600">{stats.hoy}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Realizadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.realizadas}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Con Nueva Venta</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{stats.conVenta}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista principal */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Re-visitas
              </CardTitle>
              <CardDescription>
                Visitas presenciales o virtuales para mantenimiento y venta cruzada
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filtroMotivo} onValueChange={setFiltroMotivo}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los motivos</SelectItem>
                  {Object.entries(MOTIVOS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Re-visita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pendientes" className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Pendientes ({revisitasPendientes.length})
              </TabsTrigger>
              <TabsTrigger value="realizadas" className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Realizadas ({revisitasRealizadas.length})
              </TabsTrigger>
              <TabsTrigger value="canceladas" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Canceladas ({revisitasCanceladas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes" className="mt-4">
              {revisitasFiltradas(revisitasPendientes).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No hay re-visitas pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisitasFiltradas(revisitasPendientes).map((revisita) => (
                    <RevisitaCard 
                      key={revisita.id} 
                      revisita={revisita}
                      onEdit={() => handleOpenDialog(revisita)}
                      onDelete={() => handleDelete(revisita.id)}
                      onCompletar={() => {
                        setRevisitaCompletar(revisita)
                        setCompletarDialog(true)
                      }}
                      onCancelar={() => handleCancelar(revisita)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="realizadas" className="mt-4">
              {revisitasFiltradas(revisitasRealizadas).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay re-visitas realizadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisitasFiltradas(revisitasRealizadas).map((revisita) => (
                    <RevisitaCard 
                      key={revisita.id} 
                      revisita={revisita}
                      onEdit={() => handleOpenDialog(revisita)}
                      onDelete={() => handleDelete(revisita.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="canceladas" className="mt-4">
              {revisitasFiltradas(revisitasCanceladas).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay re-visitas canceladas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {revisitasFiltradas(revisitasCanceladas).map((revisita) => (
                    <RevisitaCard 
                      key={revisita.id} 
                      revisita={revisita}
                      onDelete={() => handleDelete(revisita.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog: Nueva/Editar Re-visita */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>
              {editingRevisita ? "Editar Re-visita" : "Nueva Re-visita"}
            </DialogTitle>
            <DialogDescription>
              Programa una visita presencial o virtual con el cliente
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar..." />
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
                <Label>Producto (opcional)</Label>
                <Select
                  value={formData.producto_id}
                  onValueChange={(value) => setFormData({ ...formData, producto_id: value })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} {p.requiere_mantenimiento && "(Mant.)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de visita</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: "presencial" | "virtual" | "telefonica") => 
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Select
                  value={formData.motivo}
                  onValueChange={(value: "mantenimiento" | "seguimiento" | "venta_cruzada" | "soporte" | "otro") => 
                    setFormData({ ...formData, motivo: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MOTIVOS).map(([key, { label, icon: Icon }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha programada</Label>
                <Input
                  type="date"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.hora_programada}
                  onChange={(e) => setFormData({ ...formData, hora_programada: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {formData.tipo === "presencial" && (
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                  placeholder="Direccion o punto de encuentro"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Duracion estimada (minutos)</Label>
              <Select
                value={formData.duracion_minutos.toString()}
                onValueChange={(value) => setFormData({ ...formData, duracion_minutos: parseInt(value) })}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1.5 horas</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Detalles adicionales..."
                rows={3}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!formData.cliente_id}>
                {editingRevisita ? "Guardar" : "Programar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Sugerencia */}
      <Dialog open={confirmSugerenciaDialog} onOpenChange={setConfirmSugerenciaDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-yellow-600" />
              Confirmar Re-visita Sugerida
            </DialogTitle>
            <DialogDescription>
              {selectedSugerencia && (
                <>
                  Cliente: <strong>{selectedSugerencia.clientes?.nombre}</strong> - 
                  {selectedSugerencia.motivo}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de visita</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: "presencial" | "virtual" | "telefonica") => 
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TIPOS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duracion</Label>
                <Select
                  value={formData.duracion_minutos.toString()}
                  onValueChange={(value) => setFormData({ ...formData, duracion_minutos: parseInt(value) })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formData.fecha_programada}
                  onChange={(e) => setFormData({ ...formData, fecha_programada: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={formData.hora_programada}
                  onChange={(e) => setFormData({ ...formData, hora_programada: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            {formData.tipo === "presencial" && (
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                  placeholder="Direccion"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSugerenciaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarSugerencia} className="bg-green-600 hover:bg-green-700">
              Confirmar Re-visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Completar Re-visita */}
      <Dialog open={completarDialog} onOpenChange={setCompletarDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Completar Re-visita
            </DialogTitle>
            <DialogDescription>
              {revisitaCompletar && (
                <>
                  {revisitaCompletar.clientes?.nombre} - {MOTIVOS[revisitaCompletar.motivo]?.label}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Resultado de la visita</Label>
              <Textarea
                value={resultadoCompletar}
                onChange={(e) => setResultadoCompletar(e.target.value)}
                placeholder="Describe como fue la visita, que se hizo, etc."
                rows={4}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Satisfaccion del cliente (1-5)</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button
                    key={n}
                    type="button"
                    variant={satisfaccionCompletar === n ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSatisfaccionCompletar(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <input
                type="checkbox"
                id="nuevaVenta"
                checked={nuevaVentaCompletar}
                onChange={(e) => setNuevaVentaCompletar(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="nuevaVenta" className="text-green-700 dark:text-green-400 cursor-pointer">
                Se realizo una nueva venta en esta visita
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletarDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCompletarRevisita} className="bg-green-600 hover:bg-green-700">
              Marcar como Completada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente de tarjeta de revisita
function RevisitaCard({ 
  revisita, 
  onEdit, 
  onDelete,
  onCompletar,
  onCancelar
}: { 
  revisita: Revisita
  onEdit?: () => void
  onDelete?: () => void
  onCompletar?: () => void
  onCancelar?: () => void
}) {
  const motivo = MOTIVOS[revisita.motivo] || MOTIVOS.otro
  const tipo = TIPOS[revisita.tipo] || TIPOS.presencial
  const estado = ESTADOS[revisita.estado] || ESTADOS.confirmada
  const TipoIcon = tipo.icon
  const MotivoIcon = motivo.icon

  const esHoy = revisita.fecha_programada && isToday(new Date(revisita.fecha_programada))
  const esPasada = revisita.fecha_programada && isPast(new Date(revisita.fecha_programada)) && !esHoy

  return (
    <Card className={`${esHoy ? "border-cyan-500 bg-cyan-50/50 dark:bg-cyan-900/10" : ""} ${esPasada && revisita.estado !== "realizada" ? "border-red-300" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-full ${motivo.color}`}>
              <MotivoIcon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-slate-900 dark:text-white">
                  {revisita.clientes?.nombre} {revisita.clientes?.apellido}
                </span>
                <Badge className={estado.color}>{estado.label}</Badge>
                {revisita.es_automatica && (
                  <Badge variant="outline" className="text-xs">Automatica</Badge>
                )}
                {esHoy && (
                  <Badge className="bg-cyan-600">Hoy</Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 mb-2">
                <span className="flex items-center gap-1">
                  <TipoIcon className="h-3 w-3" />
                  {tipo.label}
                </span>
                <span className="flex items-center gap-1">
                  <MotivoIcon className="h-3 w-3" />
                  {motivo.label}
                </span>
                {revisita.fecha_programada && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDateGMT3(revisita.fecha_programada)}
                    {revisita.hora_programada && ` ${revisita.hora_programada}`}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {revisita.duracion_minutos} min
                </span>
              </div>
              {revisita.inventario && (
                <div className="flex items-center gap-1 text-sm text-slate-500 mb-1">
                  <Package className="h-3 w-3" />
                  {revisita.inventario.nombre}
                </div>
              )}
              {revisita.lugar && (
                <div className="flex items-center gap-1 text-sm text-slate-500 mb-1">
                  <MapPin className="h-3 w-3" />
                  {revisita.lugar}
                </div>
              )}
              {revisita.notas && (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  {revisita.notas}
                </p>
              )}
              {revisita.resultado && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm">
                  <strong>Resultado:</strong> {revisita.resultado}
                </div>
              )}
              {revisita.nueva_venta_realizada && (
                <Badge className="mt-2 bg-purple-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Nueva venta realizada
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onCompletar && revisita.estado !== "realizada" && revisita.estado !== "cancelada" && (
                <DropdownMenuItem onClick={onCompletar}>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  Completar
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onCancelar && revisita.estado !== "realizada" && revisita.estado !== "cancelada" && (
                <DropdownMenuItem onClick={onCancelar}>
                  <XCircle className="h-4 w-4 mr-2 text-orange-600" />
                  Cancelar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}
