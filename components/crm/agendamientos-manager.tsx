"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast"
import { 
  formatDateGMT3, 
  formatDateTimeGMT3, 
  formatTimeGMT3,
  formatForCalendar,
  isToday, 
  isPast, 
  isTomorrow,
  toISOWithGMT3
} from "@/lib/utils/timezone"
import {
  Plus,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  RotateCcw,
  Edit2,
  Trash2,
  MoreVertical,
  UserPlus,
  Handshake,
  TrendingUp,
  AlertCircle,
  CalendarCheck,
  CalendarX,
  CalendarClock,
  ShoppingCart,
  Filter
} from "lucide-react"

interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
}

interface Prospecto {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
  origen: string
  estado: string
}

interface Agendamiento {
  id: string
  cliente_id: string | null
  prospecto_id: string | null
  titulo: string
  tipo: string
  fecha_hora: string
  duracion_minutos: number
  lugar: string | null
  notas: string | null
  estado: string
  resultado: string | null
  motivo_suspension: string | null
  fecha_reagendada: string | null
  es_amistad: boolean
  nivel_economico: string | null
  estrellas: number
  referido_por: string | null
  venta_id: string | null
  cliente?: Cliente
  prospecto?: Prospecto
}

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  precio_venta_usd: number | null
  stock_actual: number
  requiere_mantenimiento: boolean
  ciclo_mantenimiento_meses: number | null
}

interface AgendamientosManagerProps {
  perfilId: string
}

const TIPOS_CITA = [
  { value: "presentacion", label: "Presentacion de producto" },
  { value: "seguimiento_interes", label: "Seguimiento de interes" },
  { value: "cierre", label: "Cierre de venta" },
  { value: "demostracion", label: "Demostracion" },
  { value: "llamada", label: "Llamada telefonica" },
  { value: "videollamada", label: "Videollamada" },
  { value: "visita", label: "Visita presencial" },
]

const NIVELES_ECONOMICOS = [
  { value: "bajo", label: "Bajo", color: "bg-orange-500" },
  { value: "medio", label: "Medio", color: "bg-blue-500" },
  { value: "alto", label: "Alto", color: "bg-green-500" },
]

const ORIGENES_PROSPECTO = [
  { value: "referido", label: "Referido" },
  { value: "redes_sociales", label: "Redes sociales" },
  { value: "publicidad", label: "Publicidad" },
  { value: "evento", label: "Evento" },
  { value: "contacto_frio", label: "Contacto frio" },
  { value: "otro", label: "Otro" },
]

export function AgendamientosManager({ perfilId }: AgendamientosManagerProps) {
  const [agendamientos, setAgendamientos] = useState<Agendamiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [prospectos, setProspectos] = useState<Prospecto[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [prospectoDialogOpen, setProspectoDialogOpen] = useState(false)
  const [resultadoDialogOpen, setResultadoDialogOpen] = useState(false)
  const [ventaDialogOpen, setVentaDialogOpen] = useState(false)
  const [editingAgendamiento, setEditingAgendamiento] = useState<Agendamiento | null>(null)
  const [selectedAgendamiento, setSelectedAgendamiento] = useState<Agendamiento | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("pendientes")
  const [filtroEstrellas, setFiltroEstrellas] = useState<number | null>(null)
  const [filtroNivel, setFiltroNivel] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  // Form state para agendamiento
  const [formData, setFormData] = useState({
    tipo_contacto: "prospecto" as "cliente" | "prospecto",
    cliente_id: "",
    prospecto_id: "",
    titulo: "",
    tipo: "presentacion",
    fecha: "",
    hora: "10:00",
    duracion_minutos: 60,
    lugar: "",
    notas: "",
    es_amistad: false,
    nivel_economico: "medio",
    estrellas: 3,
    referido_por: "",
  })

  // Form state para nuevo prospecto
  const [prospectoData, setProspectoData] = useState({
    nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    notas: "",
    origen: "contacto_frio",
  })

  // Form state para resultado
  const [resultadoData, setResultadoData] = useState({
    resultado: "pendiente" as string,
    motivo_suspension: "",
    fecha_reagendada: "",
    hora_reagendada: "10:00",
  })

  // Form state para venta
  const [ventaData, setVentaData] = useState({
    producto_id: "",
    cantidad: 1,
    precio_total: 0,
    metodo_pago: "contado",
    cuotas: 1,
    notas: "",
  })

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Cargar agendamientos con relaciones
      const { data: agendamientosData } = await supabase
        .from("crm_agendamientos")
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email),
          prospecto:crm_prospectos(id, nombre, telefono, email, direccion, notas, origen, estado)
        `)
        .eq("perfil_id", perfilId)
        .order("fecha_hora", { ascending: true })

      if (agendamientosData) {
        setAgendamientos(agendamientosData)
      }

      // Cargar clientes
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nombre, telefono, email")
        .eq("perfil_id", perfilId)
        .order("nombre")

      if (clientesData) {
        setClientes(clientesData)
      }

      // Cargar prospectos activos
      const { data: prospectosData } = await supabase
        .from("crm_prospectos")
        .select("*")
        .eq("perfil_id", perfilId)
        .eq("estado", "activo")
        .order("nombre")

      if (prospectosData) {
        setProspectos(prospectosData)
      }

      // Cargar productos
      const { data: productosData } = await supabase
        .from("inventario")
        .select("id, nombre, precio_venta, precio_venta_usd, stock_actual, requiere_mantenimiento, ciclo_mantenimiento_meses")
        .eq("perfil_id", perfilId)
        .eq("activo", true)
        .gt("stock_actual", 0)
        .order("nombre")

      if (productosData) {
        setProductos(productosData)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [perfilId, supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Crear prospecto
  const handleCrearProspecto = async () => {
    if (!prospectoData.nombre || !userId) return

    try {
      const { data, error } = await supabase
        .from("crm_prospectos")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          nombre: prospectoData.nombre,
          telefono: prospectoData.telefono || null,
          email: prospectoData.email || null,
          direccion: prospectoData.direccion || null,
          notas: prospectoData.notas || null,
          origen: prospectoData.origen,
          estado: "activo",
        })
        .select()
        .single()

      if (error) throw error

      setProspectos(prev => [...prev, data])
      setFormData(prev => ({ ...prev, prospecto_id: data.id }))
      setProspectoDialogOpen(false)
      setProspectoData({
        nombre: "",
        telefono: "",
        email: "",
        direccion: "",
        notas: "",
        origen: "contacto_frio",
      })
      toast({ title: "Prospecto creado" })
    } catch (error) {
      console.error("Error creating prospecto:", error)
      toast({ title: "Error", description: "No se pudo crear el prospecto", variant: "destructive" })
    }
  }

  // Guardar agendamiento
  const handleSubmit = async () => {
    if (!formData.titulo || !formData.fecha || !userId) return

    const contactoId = formData.tipo_contacto === "cliente" 
      ? formData.cliente_id 
      : formData.prospecto_id

    if (!contactoId) {
      toast({ title: "Error", description: "Selecciona un cliente o prospecto", variant: "destructive" })
      return
    }

    try {
      const fechaHora = toISOWithGMT3(formData.fecha, formData.hora)

      const agendamientoData = {
        user_id: userId,
        perfil_id: perfilId,
        cliente_id: formData.tipo_contacto === "cliente" ? formData.cliente_id : null,
        prospecto_id: formData.tipo_contacto === "prospecto" ? formData.prospecto_id : null,
        titulo: formData.titulo,
        tipo: formData.tipo,
        fecha_hora: fechaHora,
        duracion_minutos: formData.duracion_minutos,
        lugar: formData.lugar || null,
        notas: formData.notas || null,
        estado: "pendiente",
        es_amistad: formData.es_amistad,
        nivel_economico: formData.nivel_economico,
        estrellas: formData.estrellas,
        referido_por: formData.referido_por || null,
      }

      if (editingAgendamiento) {
        const { error } = await supabase
          .from("crm_agendamientos")
          .update(agendamientoData)
          .eq("id", editingAgendamiento.id)

        if (error) throw error
        toast({ title: "Agendamiento actualizado" })
      } else {
        const { error } = await supabase
          .from("crm_agendamientos")
          .insert(agendamientoData)

        if (error) throw error
        toast({ title: "Cita agendada" })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving agendamiento:", error)
      toast({ title: "Error", description: "No se pudo guardar", variant: "destructive" })
    }
  }

  // Abrir dialog de resultado
  const handleOpenResultado = (agendamiento: Agendamiento) => {
    setSelectedAgendamiento(agendamiento)
    setResultadoData({
      resultado: "pendiente",
      motivo_suspension: "",
      fecha_reagendada: "",
      hora_reagendada: "10:00",
    })
    setResultadoDialogOpen(true)
  }

  // Guardar resultado
  const handleGuardarResultado = async () => {
    if (!selectedAgendamiento) return

    try {
      let nuevoEstado = "pendiente"
      let fechaReagendada = null

      switch (resultadoData.resultado) {
        case "venta_cerrada":
          nuevoEstado = "realizada"
          // Abrir dialog de venta
          setResultadoDialogOpen(false)
          setVentaDialogOpen(true)
          return
        case "no_interesa":
          nuevoEstado = "suspendido"
          break
        case "reagendar":
          nuevoEstado = "reagendado"
          if (resultadoData.fecha_reagendada) {
            fechaReagendada = toISOWithGMT3(resultadoData.fecha_reagendada, resultadoData.hora_reagendada)
          }
          break
        case "realizada":
          nuevoEstado = "realizada"
          break
      }

      const { error } = await supabase
        .from("crm_agendamientos")
        .update({
          estado: nuevoEstado,
          resultado: resultadoData.resultado,
          motivo_suspension: resultadoData.motivo_suspension || null,
          fecha_reagendada: fechaReagendada,
        })
        .eq("id", selectedAgendamiento.id)

      if (error) throw error

      // Si es reagendar, crear nuevo agendamiento
      if (resultadoData.resultado === "reagendar" && fechaReagendada) {
        await supabase
          .from("crm_agendamientos")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            cliente_id: selectedAgendamiento.cliente_id,
            prospecto_id: selectedAgendamiento.prospecto_id,
            titulo: selectedAgendamiento.titulo + " (Reagendado)",
            tipo: selectedAgendamiento.tipo,
            fecha_hora: fechaReagendada,
            duracion_minutos: selectedAgendamiento.duracion_minutos,
            lugar: selectedAgendamiento.lugar,
            notas: `Reagendado desde cita del ${formatDateGMT3(selectedAgendamiento.fecha_hora)}. ${resultadoData.motivo_suspension || ""}`,
            estado: "pendiente",
            es_amistad: selectedAgendamiento.es_amistad,
            nivel_economico: selectedAgendamiento.nivel_economico,
            estrellas: selectedAgendamiento.estrellas,
            referido_por: selectedAgendamiento.referido_por,
          })
      }

      // Si no le interesa, actualizar prospecto
      if (resultadoData.resultado === "no_interesa" && selectedAgendamiento.prospecto_id) {
        await supabase
          .from("crm_prospectos")
          .update({ estado: "no_interesado" })
          .eq("id", selectedAgendamiento.prospecto_id)
      }

      toast({ title: "Resultado guardado" })
      setResultadoDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error saving resultado:", error)
      toast({ title: "Error", description: "No se pudo guardar el resultado", variant: "destructive" })
    }
  }

  // Cerrar venta completa
  const handleCerrarVenta = async () => {
    if (!selectedAgendamiento || !ventaData.producto_id || !userId) return

    try {
      const productoSeleccionado = productos.find(p => p.id === ventaData.producto_id)
      if (!productoSeleccionado) return

      let clienteId = selectedAgendamiento.cliente_id

      // Si es un prospecto, convertirlo a cliente
      if (selectedAgendamiento.prospecto_id && !selectedAgendamiento.cliente_id) {
        const prospecto = selectedAgendamiento.prospecto
        
        // Crear cliente desde prospecto
        const { data: nuevoCliente, error: clienteError } = await supabase
          .from("clientes")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            nombre: prospecto?.nombre || "Cliente",
            telefono: prospecto?.telefono,
            email: prospecto?.email,
            direccion: prospecto?.direccion,
            notas: prospecto?.notas,
            estado: "activo",
            clasificacion: selectedAgendamiento.nivel_economico === "alto" ? "premium" : "estandar",
          })
          .select()
          .single()

        if (clienteError) throw clienteError
        clienteId = nuevoCliente.id

        // Actualizar prospecto como convertido
        await supabase
          .from("crm_prospectos")
          .update({ 
            estado: "convertido",
            cliente_id: nuevoCliente.id
          })
          .eq("id", selectedAgendamiento.prospecto_id)

        toast({ title: "Prospecto convertido a cliente" })
      }

      // Registrar la venta
      const { data: venta, error: ventaError } = await supabase
        .from("crm_ventas")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          cliente_id: clienteId,
          oportunidad_id: null,
          monto_total: ventaData.precio_total,
          moneda: "PYG",
          metodo_pago: ventaData.metodo_pago,
          estado: ventaData.metodo_pago === "contado" ? "pagado" : "pendiente",
          notas: ventaData.notas || null,
          fecha_venta: new Date().toISOString(),
        })
        .select()
        .single()

      if (ventaError) throw ventaError

      // Registrar items de la venta
      await supabase
        .from("crm_venta_items")
        .insert({
          venta_id: venta.id,
          producto_id: ventaData.producto_id,
          cantidad: ventaData.cantidad,
          precio_unitario: productoSeleccionado.precio_venta,
          subtotal: ventaData.precio_total,
        })

      // Actualizar stock del producto
      await supabase
        .from("inventario")
        .update({ 
          stock_actual: productoSeleccionado.stock_actual - ventaData.cantidad 
        })
        .eq("id", ventaData.producto_id)

      // Obtener configuracion de seguimiento del usuario
      const { data: configSeguimiento } = await supabase
        .from("crm_configuracion_seguimiento")
        .select("*")
        .eq("user_id", userId)
        .single()

      const horasPosventa = configSeguimiento?.seguimiento_posventa_horas || 48

      // Crear seguimiento posventa inmediato (24-72hs segun config)
      const fechaSeguimientoPosventa = new Date()
      fechaSeguimientoPosventa.setHours(fechaSeguimientoPosventa.getHours() + horasPosventa)

      await supabase
        .from("crm_seguimientos")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          cliente_id: clienteId,
          venta_id: venta.id,
          producto_id: ventaData.producto_id,
          tipo_seguimiento: "posventa_inmediato",
          nota: `Seguimiento posventa (${horasPosventa}hs) - Producto: ${productoSeleccionado.nombre}. Verificar satisfaccion y resolver dudas.`,
          recordatorio_tipo: "personalizado",
          recordatorio_fecha: fechaSeguimientoPosventa.toISOString().split("T")[0],
          recordatorio_completado: false,
        })

      // Si el producto requiere mantenimiento, crear seguimiento de mantenimiento
      if (productoSeleccionado.requiere_mantenimiento && productoSeleccionado.ciclo_mantenimiento_meses) {
        const fechaMantenimiento = new Date()
        fechaMantenimiento.setMonth(fechaMantenimiento.getMonth() + productoSeleccionado.ciclo_mantenimiento_meses)

        await supabase
          .from("crm_seguimientos")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            cliente_id: clienteId,
            venta_id: venta.id,
            producto_id: ventaData.producto_id,
            tipo_seguimiento: "mantenimiento",
            ciclo_mantenimiento: productoSeleccionado.ciclo_mantenimiento_meses,
            nota: `Mantenimiento programado - Producto: ${productoSeleccionado.nombre}. Ciclo: cada ${productoSeleccionado.ciclo_mantenimiento_meses} meses.`,
            recordatorio_tipo: "personalizado",
            recordatorio_fecha: fechaMantenimiento.toISOString().split("T")[0],
            recordatorio_completado: false,
          })
      }

      // Si es en cuotas, crear cobranzas
      if (ventaData.metodo_pago === "cuotas" && ventaData.cuotas > 1) {
        const montoCuota = ventaData.precio_total / ventaData.cuotas
        const cobranzas = []

        for (let i = 0; i < ventaData.cuotas; i++) {
          const fechaVencimiento = new Date()
          fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i + 1)

          cobranzas.push({
            user_id: userId,
            perfil_id: perfilId,
            cliente_id: clienteId,
            venta_id: venta.id,
            monto: montoCuota,
            fecha_vencimiento: fechaVencimiento.toISOString().split("T")[0],
            estado: "pendiente",
            numero_cuota: i + 1,
            total_cuotas: ventaData.cuotas,
          })
        }

        await supabase
          .from("crm_cobranzas")
          .insert(cobranzas)
      }

      // Actualizar agendamiento como realizado con venta
      await supabase
        .from("crm_agendamientos")
        .update({
          estado: "realizada",
          resultado: "venta_cerrada",
          venta_id: venta.id,
          cliente_id: clienteId,
        })
        .eq("id", selectedAgendamiento.id)

      toast({ 
        title: "Venta cerrada exitosamente",
        description: "Cliente, venta y seguimientos creados automaticamente"
      })

      setVentaDialogOpen(false)
      setVentaData({
        producto_id: "",
        cantidad: 1,
        precio_total: 0,
        metodo_pago: "contado",
        cuotas: 1,
        notas: "",
      })
      loadData()
    } catch (error) {
      console.error("Error cerrando venta:", error)
      toast({ title: "Error", description: "No se pudo cerrar la venta", variant: "destructive" })
    }
  }

  // Eliminar agendamiento
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("crm_agendamientos")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast({ title: "Agendamiento eliminado" })
      loadData()
    } catch (error) {
      console.error("Error deleting:", error)
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  // Abrir dialog para editar
  const handleOpenDialog = (agendamiento?: Agendamiento) => {
    if (agendamiento) {
      setEditingAgendamiento(agendamiento)
      const fechaHora = new Date(agendamiento.fecha_hora)
      setFormData({
        tipo_contacto: agendamiento.cliente_id ? "cliente" : "prospecto",
        cliente_id: agendamiento.cliente_id || "",
        prospecto_id: agendamiento.prospecto_id || "",
        titulo: agendamiento.titulo,
        tipo: agendamiento.tipo,
        fecha: fechaHora.toISOString().split("T")[0],
        hora: fechaHora.toTimeString().slice(0, 5),
        duracion_minutos: agendamiento.duracion_minutos,
        lugar: agendamiento.lugar || "",
        notas: agendamiento.notas || "",
        es_amistad: agendamiento.es_amistad || false,
        nivel_economico: agendamiento.nivel_economico || "medio",
        estrellas: agendamiento.estrellas || 3,
        referido_por: agendamiento.referido_por || "",
      })
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingAgendamiento(null)
    setFormData({
      tipo_contacto: "prospecto",
      cliente_id: "",
      prospecto_id: "",
      titulo: "",
      tipo: "presentacion",
      fecha: "",
      hora: "10:00",
      duracion_minutos: 60,
      lugar: "",
      notas: "",
      es_amistad: false,
      nivel_economico: "medio",
      estrellas: 3,
      referido_por: "",
    })
  }

  // Actualizar precio cuando cambia producto o cantidad
  useEffect(() => {
    const producto = productos.find(p => p.id === ventaData.producto_id)
    if (producto) {
      setVentaData(prev => ({
        ...prev,
        precio_total: producto.precio_venta * prev.cantidad
      }))
    }
  }, [ventaData.producto_id, ventaData.cantidad, productos])

  // Filtrar agendamientos
  const getAgendamientosFiltrados = () => {
    let filtered = agendamientos

    // Filtro por tab
    switch (activeTab) {
      case "pendientes":
        filtered = filtered.filter(a => a.estado === "pendiente" || a.estado === "reagendado")
        break
      case "hoy":
        filtered = filtered.filter(a => isToday(new Date(a.fecha_hora)) && a.estado === "pendiente")
        break
      case "realizadas":
        filtered = filtered.filter(a => a.estado === "realizada")
        break
      case "suspendidas":
        filtered = filtered.filter(a => a.estado === "suspendido")
        break
    }

    // Filtro por estrellas
    if (filtroEstrellas !== null) {
      filtered = filtered.filter(a => a.estrellas >= filtroEstrellas)
    }

    // Filtro por nivel economico
    if (filtroNivel) {
      filtered = filtered.filter(a => a.nivel_economico === filtroNivel)
    }

    return filtered
  }

  // Estadisticas
  const stats = {
    total: agendamientos.length,
    pendientes: agendamientos.filter(a => a.estado === "pendiente" || a.estado === "reagendado").length,
    hoy: agendamientos.filter(a => isToday(new Date(a.fecha_hora)) && a.estado === "pendiente").length,
    realizadas: agendamientos.filter(a => a.estado === "realizada").length,
    suspendidas: agendamientos.filter(a => a.estado === "suspendido").length,
    ventasCerradas: agendamientos.filter(a => a.resultado === "venta_cerrada").length,
  }

  const formatMoney = (amount: number) => {
    return `Gs. ${amount.toLocaleString("es-PY")}`
  }

  // Render estrellas
  const renderEstrellas = (cantidad: number, size = "h-4 w-4") => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${size} ${i <= cantidad ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  // Obtener label de estado
  const getEstadoBadge = (agendamiento: Agendamiento) => {
    const fecha = new Date(agendamiento.fecha_hora)
    
    if (agendamiento.estado === "realizada") {
      if (agendamiento.resultado === "venta_cerrada") {
        return <Badge className="bg-green-600">Venta Cerrada</Badge>
      }
      return <Badge className="bg-green-600">Realizada</Badge>
    }
    if (agendamiento.estado === "suspendido") {
      return <Badge variant="destructive">No Interesa</Badge>
    }
    if (agendamiento.estado === "reagendado") {
      return <Badge className="bg-orange-500">Reagendado</Badge>
    }
    if (isToday(fecha)) {
      return <Badge className="bg-blue-600">Hoy</Badge>
    }
    if (isPast(fecha)) {
      return <Badge variant="destructive">Vencida</Badge>
    }
    if (isTomorrow(fecha)) {
      return <Badge className="bg-cyan-600">Manana</Badge>
    }
    return <Badge variant="outline">Pendiente</Badge>
  }

  const agendamientosFiltrados = getAgendamientosFiltrados()

  return (
    <div className="space-y-6">
      {/* Header con estadisticas */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <span className="text-slate-400 text-sm">Total</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-300" />
              <span className="text-blue-300 text-sm">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.pendientes}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900 to-cyan-800 border-cyan-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-cyan-300" />
              <span className="text-cyan-300 text-sm">Hoy</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.hoy}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-900 to-green-800 border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-green-300" />
              <span className="text-green-300 text-sm">Realizadas</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.realizadas}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-900 to-red-800 border-red-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CalendarX className="h-5 w-5 text-red-300" />
              <span className="text-red-300 text-sm">Suspendidas</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.suspendidas}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900 to-emerald-800 border-emerald-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-emerald-300" />
              <span className="text-emerald-300 text-sm">Ventas</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1">{stats.ventasCerradas}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de agendamientos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-purple-600" />
                Agendamientos (Preventa)
              </CardTitle>
              <CardDescription>
                Gestiona tus citas con prospectos y clientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setProspectoDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo Prospecto
              </Button>
              <Button onClick={() => handleOpenDialog()} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Agendar Cita
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Tabs y filtros */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="pendientes">Pendientes ({stats.pendientes})</TabsTrigger>
                <TabsTrigger value="hoy">Hoy ({stats.hoy})</TabsTrigger>
                <TabsTrigger value="realizadas">Realizadas ({stats.realizadas})</TabsTrigger>
                <TabsTrigger value="suspendidas">Suspendidas ({stats.suspendidas})</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select 
                value={filtroEstrellas?.toString() || "todas"} 
                onValueChange={(v) => setFiltroEstrellas(v === "todas" ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Estrellas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="5">5 estrellas</SelectItem>
                  <SelectItem value="4">4+ estrellas</SelectItem>
                  <SelectItem value="3">3+ estrellas</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filtroNivel || "todos"} 
                onValueChange={(v) => setFiltroNivel(v === "todos" ? null : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="bajo">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : agendamientosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay agendamientos en esta categoria
            </div>
          ) : (
            <div className="space-y-3">
              {agendamientosFiltrados.map((agendamiento) => {
                const contacto = agendamiento.cliente || agendamiento.prospecto
                const esProspecto = !!agendamiento.prospecto_id
                const fecha = new Date(agendamiento.fecha_hora)

                return (
                  <Card key={agendamiento.id} className="border-l-4 border-l-purple-600">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {getEstadoBadge(agendamiento)}
                            {esProspecto ? (
                              <Badge variant="outline" className="border-orange-500 text-orange-600">
                                <UserPlus className="h-3 w-3 mr-1" />
                                Prospecto
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-green-600">
                                <User className="h-3 w-3 mr-1" />
                                Cliente
                              </Badge>
                            )}
                            {agendamiento.es_amistad && (
                              <Badge variant="outline" className="border-pink-500 text-pink-600">
                                <Users className="h-3 w-3 mr-1" />
                                Amistad
                              </Badge>
                            )}
                            {agendamiento.nivel_economico && (
                              <Badge className={
                                agendamiento.nivel_economico === "alto" ? "bg-green-600" :
                                agendamiento.nivel_economico === "medio" ? "bg-blue-600" : "bg-orange-600"
                              }>
                                <DollarSign className="h-3 w-3 mr-1" />
                                {agendamiento.nivel_economico.charAt(0).toUpperCase() + agendamiento.nivel_economico.slice(1)}
                              </Badge>
                            )}
                            {renderEstrellas(agendamiento.estrellas, "h-3 w-3")}
                          </div>

                          {/* Titulo y contacto */}
                          <h4 className="font-semibold text-lg">{agendamiento.titulo}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              {contacto?.nombre || "Sin nombre"}
                            </span>
                            {contacto?.telefono && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {contacto.telefono}
                              </span>
                            )}
                          </div>

                          {/* Fecha y tipo */}
                          <div className="flex items-center gap-4 text-sm mt-2">
                            <span className="flex items-center gap-1 text-purple-600 font-medium">
                              <Calendar className="h-4 w-4" />
                              {formatDateGMT3(agendamiento.fecha_hora)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTimeGMT3(agendamiento.fecha_hora)} ({agendamiento.duracion_minutos} min)
                            </span>
                            <span className="capitalize">
                              {TIPOS_CITA.find(t => t.value === agendamiento.tipo)?.label}
                            </span>
                          </div>

                          {/* Referido */}
                          {agendamiento.referido_por && (
                            <div className="text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Referido por: {agendamiento.referido_por}
                              </span>
                            </div>
                          )}

                          {/* Notas */}
                          {agendamiento.notas && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {agendamiento.notas}
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1">
                          {agendamiento.estado === "pendiente" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleOpenResultado(agendamiento)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resultado
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenDialog(agendamiento)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(agendamiento.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Dialog: Nuevo/Editar Agendamiento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAgendamiento ? "Editar Agendamiento" : "Nueva Cita"}
            </DialogTitle>
            <DialogDescription>
              Agenda una cita con un prospecto o cliente
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Tipo de contacto */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant={formData.tipo_contacto === "prospecto" ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, tipo_contacto: "prospecto", cliente_id: "" })}
                className="flex-1"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Prospecto
              </Button>
              <Button
                type="button"
                variant={formData.tipo_contacto === "cliente" ? "default" : "outline"}
                onClick={() => setFormData({ ...formData, tipo_contacto: "cliente", prospecto_id: "" })}
                className="flex-1"
              >
                <User className="h-4 w-4 mr-2" />
                Cliente
              </Button>
            </div>

            {/* Selector de contacto */}
            {formData.tipo_contacto === "prospecto" ? (
              <div className="space-y-2">
                <Label>Prospecto *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.prospecto_id} 
                    onValueChange={(v) => setFormData({ ...formData, prospecto_id: v })}
                  >
                    <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Seleccionar prospecto" />
                    </SelectTrigger>
                    <SelectContent>
                      {prospectos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setProspectoDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select 
                  value={formData.cliente_id} 
                  onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Titulo */}
            <div className="space-y-2">
              <Label>Titulo de la cita *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Presentacion de producto"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Tipo de cita */}
            <div className="space-y-2">
              <Label>Tipo de cita</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CITA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={formData.hora}
                  onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Duracion y lugar */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duracion (min)</Label>
                <Select 
                  value={formData.duracion_minutos.toString()} 
                  onValueChange={(v) => setFormData({ ...formData, duracion_minutos: parseInt(v) })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input
                  value={formData.lugar}
                  onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                  placeholder="Direccion o enlace"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Clasificacion */}
            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-3">Clasificacion del contacto</h4>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Es amistad */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="es_amistad"
                    checked={formData.es_amistad}
                    onChange={(e) => setFormData({ ...formData, es_amistad: e.target.checked })}
                    className="rounded border-purple-300"
                  />
                  <Label htmlFor="es_amistad" className="flex items-center gap-1 cursor-pointer">
                    <Users className="h-4 w-4 text-pink-600" />
                    Es amistad/conocido
                  </Label>
                </div>

                {/* Nivel economico */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Nivel economico
                  </Label>
                  <Select 
                    value={formData.nivel_economico} 
                    onValueChange={(v) => setFormData({ ...formData, nivel_economico: v })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVELES_ECONOMICOS.map((n) => (
                        <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estrellas */}
              <div className="mt-4 space-y-2">
                <Label className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Probabilidad de compra (estrellas)
                </Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, estrellas: i })}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${i <= formData.estrellas ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Referido */}
              <div className="mt-4 space-y-2">
                <Label className="flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Referido por (opcional)
                </Label>
                <Input
                  value={formData.referido_por}
                  onChange={(e) => setFormData({ ...formData, referido_por: e.target.value })}
                  placeholder="Nombre de quien lo refirio"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={3}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-purple-600 hover:bg-purple-700">
              {editingAgendamiento ? "Guardar Cambios" : "Agendar Cita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo Prospecto */}
      <Dialog open={prospectoDialogOpen} onOpenChange={setProspectoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              Nuevo Prospecto
            </DialogTitle>
            <DialogDescription>
              Registra un nuevo contacto potencial
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                value={prospectoData.nombre}
                onChange={(e) => setProspectoData({ ...prospectoData, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input
                  value={prospectoData.telefono}
                  onChange={(e) => setProspectoData({ ...prospectoData, telefono: e.target.value })}
                  placeholder="0981..."
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={prospectoData.email}
                  onChange={(e) => setProspectoData({ ...prospectoData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Direccion</Label>
              <Input
                value={prospectoData.direccion}
                onChange={(e) => setProspectoData({ ...prospectoData, direccion: e.target.value })}
                placeholder="Direccion"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Origen del contacto</Label>
              <Select 
                value={prospectoData.origen} 
                onValueChange={(v) => setProspectoData({ ...prospectoData, origen: v })}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIGENES_PROSPECTO.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                value={prospectoData.notas}
                onChange={(e) => setProspectoData({ ...prospectoData, notas: e.target.value })}
                placeholder="Informacion adicional..."
                rows={2}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProspectoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearProspecto} className="bg-orange-600 hover:bg-orange-700">
              Crear Prospecto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resultado de la cita */}
      <Dialog open={resultadoDialogOpen} onOpenChange={setResultadoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resultado de la Cita</DialogTitle>
            <DialogDescription>
              {selectedAgendamiento && (
                <span>
                  {selectedAgendamiento.titulo} - {selectedAgendamiento.cliente?.nombre || selectedAgendamiento.prospecto?.nombre}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={resultadoData.resultado === "venta_cerrada" ? "default" : "outline"}
                onClick={() => setResultadoData({ ...resultadoData, resultado: "venta_cerrada" })}
                className={resultadoData.resultado === "venta_cerrada" ? "bg-green-600" : ""}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Venta Cerrada
              </Button>
              <Button
                type="button"
                variant={resultadoData.resultado === "realizada" ? "default" : "outline"}
                onClick={() => setResultadoData({ ...resultadoData, resultado: "realizada" })}
                className={resultadoData.resultado === "realizada" ? "bg-blue-600" : ""}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Realizada (sin venta)
              </Button>
              <Button
                type="button"
                variant={resultadoData.resultado === "reagendar" ? "default" : "outline"}
                onClick={() => setResultadoData({ ...resultadoData, resultado: "reagendar" })}
                className={resultadoData.resultado === "reagendar" ? "bg-orange-600" : ""}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reagendar
              </Button>
              <Button
                type="button"
                variant={resultadoData.resultado === "no_interesa" ? "default" : "outline"}
                onClick={() => setResultadoData({ ...resultadoData, resultado: "no_interesa" })}
                className={resultadoData.resultado === "no_interesa" ? "bg-red-600" : ""}
              >
                <XCircle className="h-4 w-4 mr-2" />
                No Interesa
              </Button>
            </div>

            {/* Si es reagendar, mostrar fecha */}
            {resultadoData.resultado === "reagendar" && (
              <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <Label className="text-orange-700 dark:text-orange-300">Nueva fecha y hora</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Input
                    type="date"
                    value={resultadoData.fecha_reagendada}
                    onChange={(e) => setResultadoData({ ...resultadoData, fecha_reagendada: e.target.value })}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                  <Input
                    type="time"
                    value={resultadoData.hora_reagendada}
                    onChange={(e) => setResultadoData({ ...resultadoData, hora_reagendada: e.target.value })}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Si no interesa o reagenda, motivo */}
            {(resultadoData.resultado === "no_interesa" || resultadoData.resultado === "reagendar") && (
              <div className="space-y-2">
                <Label>Motivo / Notas</Label>
                <Textarea
                  value={resultadoData.motivo_suspension}
                  onChange={(e) => setResultadoData({ ...resultadoData, motivo_suspension: e.target.value })}
                  placeholder={resultadoData.resultado === "no_interesa" ? "Por que no le intereso?" : "Motivo del reagendamiento"}
                  rows={3}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResultadoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarResultado}
              disabled={resultadoData.resultado === "pendiente"}
              className="bg-green-600 hover:bg-green-700"
            >
              Guardar Resultado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Cerrar Venta */}
      <Dialog open={ventaDialogOpen} onOpenChange={setVentaDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              Cerrar Venta
            </DialogTitle>
            <DialogDescription>
              {selectedAgendamiento && (
                <span>
                  Cliente: {selectedAgendamiento.cliente?.nombre || selectedAgendamiento.prospecto?.nombre}
                  {selectedAgendamiento.prospecto_id && !selectedAgendamiento.cliente_id && (
                    <Badge className="ml-2 bg-orange-500">Se creara como cliente</Badge>
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Producto */}
            <div className="space-y-2">
              <Label>Producto *</Label>
              <Select 
                value={ventaData.producto_id} 
                onValueChange={(v) => setVentaData({ ...ventaData, producto_id: v })}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Seleccionar producto" />
                </SelectTrigger>
                <SelectContent>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} - {formatMoney(p.precio_venta)} (Stock: {p.stock_actual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cantidad */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min="1"
                  value={ventaData.cantidad}
                  onChange={(e) => setVentaData({ ...ventaData, cantidad: parseInt(e.target.value) || 1 })}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-lg font-bold text-green-700 dark:text-green-300">
                  {formatMoney(ventaData.precio_total)}
                </div>
              </div>
            </div>

            {/* Metodo de pago */}
            <div className="space-y-2">
              <Label>Metodo de pago</Label>
              <Select 
                value={ventaData.metodo_pago} 
                onValueChange={(v) => setVentaData({ ...ventaData, metodo_pago: v })}
              >
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contado">Contado</SelectItem>
                  <SelectItem value="cuotas">Cuotas</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cuotas */}
            {ventaData.metodo_pago === "cuotas" && (
              <div className="space-y-2">
                <Label>Cantidad de cuotas</Label>
                <Select 
                  value={ventaData.cuotas.toString()} 
                  onValueChange={(v) => setVentaData({ ...ventaData, cuotas: parseInt(v) })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 9, 12].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} cuotas de {formatMoney(Math.ceil(ventaData.precio_total / n))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas de la venta</Label>
              <Textarea
                value={ventaData.notas}
                onChange={(e) => setVentaData({ ...ventaData, notas: e.target.value })}
                placeholder="Notas adicionales..."
                rows={2}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            {/* Resumen */}
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">Al cerrar esta venta:</h4>
              <ul className="text-sm text-green-600 dark:text-green-400 space-y-1">
                {selectedAgendamiento?.prospecto_id && !selectedAgendamiento?.cliente_id && (
                  <li>- Se creara el prospecto como cliente</li>
                )}
                <li>- Se registrara la venta</li>
                <li>- Se creara seguimiento posventa automatico</li>
                {productos.find(p => p.id === ventaData.producto_id)?.requiere_mantenimiento && (
                  <li>- Se creara seguimiento de mantenimiento programado</li>
                )}
                {ventaData.metodo_pago === "cuotas" && (
                  <li>- Se crearan {ventaData.cuotas} cobranzas pendientes</li>
                )}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVentaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCerrarVenta}
              disabled={!ventaData.producto_id}
              className="bg-green-600 hover:bg-green-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cerrar Venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
