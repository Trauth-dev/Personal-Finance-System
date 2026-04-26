"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  MoreVertical, 
  User, 
  DollarSign, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit,
  Phone,
  Package,
  Briefcase,
  X,
  ClipboardList,
  CalendarPlus,
  Clock,
  MessageSquare
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Etapa {
  id: string
  nombre: string
  color: string
  orden: number
  es_etapa_final: boolean
  es_etapa_ganada: boolean
}

interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  ciudad: string | null
}

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  precio_venta_usd: number | null
  precio_costo: number
  stock_actual: number
  moneda: string | null
}

interface ProductoSeleccionado {
  producto_id: string
  nombre: string
  cantidad: number
  precio_unitario: number
  precio_unitario_usd: number | null
  subtotal: number
  subtotal_usd: number | null
}

interface Oportunidad {
  id: string
  cliente_id: string
  etapa_id: string
  titulo: string
  valor_estimado: number | null
  probabilidad: number
  fecha_cierre_estimada: string | null
  notas: string | null
  prioridad: string
  moneda: string | null
  producto_interes: string | null
  created_at: string
  updated_at: string
  cliente?: Cliente
}

interface PipelineKanbanProps {
  perfilId: string
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: "bg-slate-100 text-slate-700 border-slate-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
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

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("PYG", "Gs.")
}

const formatUSD = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function PipelineKanban({ perfilId }: PipelineKanbanProps) {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOportunidad, setEditingOportunidad] = useState<Oportunidad | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tasaCambio, setTasaCambio] = useState<number>(7500)
  
  // Estados para dialogs de acciones rapidas
  const [seguimientoDialogOpen, setSeguimientoDialogOpen] = useState(false)
  const [agendamientoDialogOpen, setAgendamientoDialogOpen] = useState(false)
  const [selectedOportunidad, setSelectedOportunidad] = useState<Oportunidad | null>(null)
  
  // Form state para seguimiento rapido
  const [seguimientoNota, setSeguimientoNota] = useState("")
  const [seguimientoTipo, setSeguimientoTipo] = useState<string>("semanal")
  const [seguimientoFecha, setSeguimientoFecha] = useState("")
  
  // Form state para agendamiento rapido
  const [agendamientoTitulo, setAgendamientoTitulo] = useState("")
  const [agendamientoFecha, setAgendamientoFecha] = useState("")
  const [agendamientoHora, setAgendamientoHora] = useState("")
  const [agendamientoTipo, setAgendamientoTipo] = useState("reunion")
  const [agendamientoNotas, setAgendamientoNotas] = useState("")
  
  // Form state
  const [clienteId, setClienteId] = useState("")
  const [titulo, setTitulo] = useState("")
  const [tipoOportunidad, setTipoOportunidad] = useState<"producto" | "servicio">("producto")
  const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoSeleccionado[]>([])
  const [montoEstimado, setMontoEstimado] = useState("")
  const [descuento, setDescuento] = useState("0")
  const [probabilidad, setProbabilidad] = useState("50")
  const [fechaCierreEstimada, setFechaCierreEstimada] = useState("")
  const [notas, setNotas] = useState("")
  const [prioridad, setPrioridad] = useState("media")
  const [etapaId, setEtapaId] = useState("")

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [perfilId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Cargar tasa de cambio
      const { data: tasaData } = await supabase
        .from("tasas_cambio")
        .select("tasa")
        .eq("user_id", user.id)
        .eq("moneda_origen", "USD")
        .eq("moneda_destino", "PYG")
        .order("fecha", { ascending: false })
        .limit(1)
        .single()

      if (tasaData) {
        setTasaCambio(tasaData.tasa)
      }

      // Cargar etapas
      const { data: etapasData, error: etapasError } = await supabase
        .from("crm_pipeline_etapas")
        .select("*")
        .eq("user_id", user.id)
        .order("orden", { ascending: true })

      if (etapasError) throw etapasError
      setEtapas(etapasData || [])

      if (etapasData && etapasData.length > 0) {
        setEtapaId(etapasData[0].id)
      }

      // Cargar oportunidades con cliente
      const { data: oportunidadesData, error: oportunidadesError } = await supabase
        .from("crm_oportunidades")
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, ciudad)
        `)
        .eq("perfil_id", perfilId)

      if (oportunidadesError) throw oportunidadesError
      setOportunidades(oportunidadesData || [])

      // Cargar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nombre, telefono, email, ciudad")
        .eq("user_id", user.id)
        .order("nombre", { ascending: true })

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

      // Cargar productos del inventario
      const { data: productosData, error: productosError } = await supabase
        .from("inventario")
        .select("id, nombre, precio_venta, precio_venta_usd, precio_costo, stock_actual, moneda")
        .eq("user_id", user.id)
        .eq("activo", true)
        .gt("stock_actual", 0)
        .order("nombre", { ascending: true })

      if (productosError) throw productosError
      setProductos(productosData || [])

    } catch (error) {
      console.error("Error loading pipeline data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del pipeline",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClienteId("")
    setTitulo("")
    setTipoOportunidad("producto")
    setProductosSeleccionados([])
    setMontoEstimado("")
    setDescuento("0")
    setProbabilidad("50")
    setFechaCierreEstimada("")
    setNotas("")
    setPrioridad("media")
    if (etapas.length > 0) {
      setEtapaId(etapas[0].id)
    }
    setEditingOportunidad(null)
  }

  const handleOpenDialog = (oportunidad?: Oportunidad) => {
    if (oportunidad) {
      setEditingOportunidad(oportunidad)
      setClienteId(oportunidad.cliente_id)
      setTitulo(oportunidad.titulo)
      
      // Detectar si tiene productos
      if (oportunidad.producto_interes) {
        try {
          const productos = JSON.parse(oportunidad.producto_interes)
          if (Array.isArray(productos) && productos.length > 0) {
            setTipoOportunidad("producto")
            setProductosSeleccionados(productos)
          } else {
            setTipoOportunidad("servicio")
          }
        } catch {
          setTipoOportunidad("servicio")
        }
      } else {
        setTipoOportunidad("servicio")
      }
      
      setMontoEstimado(oportunidad.valor_estimado?.toString() || "")
      setProbabilidad(oportunidad.probabilidad.toString())
      setFechaCierreEstimada(oportunidad.fecha_cierre_estimada || "")
      setNotas(oportunidad.notas || "")
      setPrioridad(oportunidad.prioridad || "media")
      setEtapaId(oportunidad.etapa_id)
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const agregarProducto = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (!producto) return

    // Verificar si ya existe
    if (productosSeleccionados.find(p => p.producto_id === productoId)) {
      toast({ title: "Producto ya agregado", variant: "destructive" })
      return
    }

    const nuevoProducto: ProductoSeleccionado = {
      producto_id: producto.id,
      nombre: producto.nombre,
      cantidad: 1,
      precio_unitario: producto.precio_venta,
      precio_unitario_usd: producto.precio_venta_usd,
      subtotal: producto.precio_venta,
      subtotal_usd: producto.precio_venta_usd
    }

    setProductosSeleccionados([...productosSeleccionados, nuevoProducto])
  }

  const actualizarCantidad = (productoId: string, cantidad: number) => {
    if (cantidad < 1) return
    
    setProductosSeleccionados(prev => 
      prev.map(p => {
        if (p.producto_id === productoId) {
          return {
            ...p,
            cantidad,
            subtotal: p.precio_unitario * cantidad,
            subtotal_usd: p.precio_unitario_usd ? p.precio_unitario_usd * cantidad : null
          }
        }
        return p
      })
    )
  }

  const eliminarProducto = (productoId: string) => {
    setProductosSeleccionados(prev => prev.filter(p => p.producto_id !== productoId))
  }

  const calcularTotales = () => {
    const subtotalPYG = productosSeleccionados.reduce((sum, p) => sum + p.subtotal, 0)
    const subtotalUSD = productosSeleccionados.reduce((sum, p) => sum + (p.subtotal_usd || 0), 0)
    const descuentoPct = parseFloat(descuento) || 0
    const descuentoMonto = subtotalPYG * (descuentoPct / 100)
    const descuentoMontoUSD = subtotalUSD * (descuentoPct / 100)
    
    return {
      subtotalPYG,
      subtotalUSD,
      descuentoPct,
      descuentoMonto,
      descuentoMontoUSD,
      totalPYG: subtotalPYG - descuentoMonto,
      totalUSD: subtotalUSD - descuentoMontoUSD
    }
  }

  const handleSave = async () => {
    if (!clienteId || !titulo) {
      toast({
        title: "Error",
        description: "Cliente y titulo son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      let valorEstimado: number | null = null
      let productoInteres: string | null = null
      let moneda = "PYG"

      if (tipoOportunidad === "producto") {
        if (productosSeleccionados.length === 0) {
          toast({
            title: "Error",
            description: "Selecciona al menos un producto",
            variant: "destructive",
          })
          return
        }
        const totales = calcularTotales()
        valorEstimado = totales.totalPYG
        productoInteres = JSON.stringify(productosSeleccionados)
        
        // Crear titulo automatico si esta vacio
        if (!titulo) {
          setTitulo(productosSeleccionados.map(p => p.nombre).join(", "))
        }
      } else {
        valorEstimado = montoEstimado ? parseFloat(montoEstimado) : null
      }

      const oportunidadData = {
        perfil_id: perfilId,
        user_id: userId,
        cliente_id: clienteId,
        etapa_id: etapaId,
        titulo,
        valor_estimado: valorEstimado,
        probabilidad: parseInt(probabilidad),
        fecha_cierre_estimada: fechaCierreEstimada || null,
        notas: notas || null,
        prioridad,
        moneda,
        producto_interes: productoInteres,
      }

      if (editingOportunidad) {
        const { error } = await supabase
          .from("crm_oportunidades")
          .update(oportunidadData)
          .eq("id", editingOportunidad.id)

        if (error) throw error
        toast({ title: "Oportunidad actualizada" })
      } else {
        const { error } = await supabase
          .from("crm_oportunidades")
          .insert(oportunidadData)

        if (error) throw error
        toast({ title: "Oportunidad creada" })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la oportunidad",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta oportunidad?")) return

    try {
      const { error } = await supabase
        .from("crm_oportunidades")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast({ title: "Oportunidad eliminada" })
      loadData()
    } catch (error) {
      console.error("Error deleting oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la oportunidad",
        variant: "destructive",
      })
    }
  }

  const moveOportunidad = async (oportunidadId: string, newEtapaId: string) => {
    try {
      const oldOportunidad = oportunidades.find(o => o.id === oportunidadId)
      if (!oldOportunidad || oldOportunidad.etapa_id === newEtapaId) return

      const newEtapa = etapas.find(e => e.id === newEtapaId)
      if (!newEtapa) return

      const { error: updateError } = await supabase
        .from("crm_oportunidades")
        .update({ etapa_id: newEtapaId })
        .eq("id", oportunidadId)

      if (updateError) throw updateError

      // Log en historial
      await supabase
        .from("crm_pipeline_historial")
        .insert({
          oportunidad_id: oportunidadId,
          etapa_anterior_id: oldOportunidad.etapa_id,
          etapa_nueva_id: newEtapaId,
          usuario_id: userId,
        })

      // AUTOMATIZACION: Crear seguimiento automatico al cambiar etapa
      await crearSeguimientoAutomatico(oldOportunidad, newEtapa)

      // Actualizar ultima_actividad del cliente
      await supabase
        .from("clientes")
        .update({ ultima_actividad: new Date().toISOString() })
        .eq("id", oldOportunidad.cliente_id)

      setOportunidades(prev => 
        prev.map(o => o.id === oportunidadId ? { ...o, etapa_id: newEtapaId } : o)
      )

      toast({ 
        title: "Oportunidad movida",
        description: `Movida a "${newEtapa.nombre}" - Seguimiento creado automaticamente` 
      })
    } catch (error) {
      console.error("Error moving oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo mover la oportunidad",
        variant: "destructive",
      })
    }
  }

  const getOportunidadesByEtapa = (etapaId: string) => {
    return oportunidades.filter(o => o.etapa_id === etapaId)
  }

  const getTotalByEtapa = (etapaId: string) => {
    return getOportunidadesByEtapa(etapaId)
      .reduce((sum, o) => sum + (o.valor_estimado || 0), 0)
  }

  const getAdjacentEtapas = (currentEtapaId: string) => {
    const currentIndex = etapas.findIndex(e => e.id === currentEtapaId)
    return {
      prev: currentIndex > 0 ? etapas[currentIndex - 1] : null,
      next: currentIndex < etapas.length - 1 ? etapas[currentIndex + 1] : null,
    }
  }

  // Convertir PYG a USD
  const convertirAUsd = (pyg: number) => {
    return pyg / tasaCambio
  }

  // Funciones para acciones rapidas
  const handleOpenSeguimiento = (oportunidad: Oportunidad) => {
    setSelectedOportunidad(oportunidad)
    setSeguimientoNota("")
    setSeguimientoTipo("semanal")
    setSeguimientoFecha("")
    setSeguimientoDialogOpen(true)
  }

  const handleOpenAgendamiento = (oportunidad: Oportunidad) => {
    setSelectedOportunidad(oportunidad)
    setAgendamientoTitulo(`Reunion: ${oportunidad.titulo}`)
    setAgendamientoFecha("")
    setAgendamientoHora("")
    setAgendamientoTipo("reunion")
    setAgendamientoNotas("")
    setAgendamientoDialogOpen(true)
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

  const handleCrearSeguimiento = async () => {
    if (!selectedOportunidad || !seguimientoNota || !userId) return

    try {
      let fechaRecordatorio = seguimientoFecha
      if (seguimientoTipo && seguimientoTipo !== "personalizado") {
        fechaRecordatorio = calcularFechaRecordatorio(seguimientoTipo)
      }

      const { error } = await supabase
        .from("crm_seguimientos")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          cliente_id: selectedOportunidad.cliente_id,
          oportunidad_id: selectedOportunidad.id,
          nota: seguimientoNota,
          recordatorio_tipo: seguimientoTipo || null,
          recordatorio_fecha: fechaRecordatorio || null,
          recordatorio_completado: false
        })

      if (error) throw error

      toast({ 
        title: "Seguimiento creado",
        description: `Vinculado a: ${selectedOportunidad.titulo}`
      })
      setSeguimientoDialogOpen(false)
    } catch (error) {
      console.error("Error creando seguimiento:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el seguimiento",
        variant: "destructive"
      })
    }
  }

  const handleCrearAgendamiento = async () => {
    if (!selectedOportunidad || !agendamientoTitulo || !agendamientoFecha || !userId) return

    try {
      // Crear fecha con hora en GMT-3
      const fechaHora = agendamientoHora 
        ? `${agendamientoFecha}T${agendamientoHora}:00-03:00`
        : `${agendamientoFecha}T09:00:00-03:00`

      const { error } = await supabase
        .from("crm_agendamientos")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          cliente_id: selectedOportunidad.cliente_id,
          oportunidad_id: selectedOportunidad.id,
          titulo: agendamientoTitulo,
          tipo: agendamientoTipo,
          fecha_hora: fechaHora,
          notas: agendamientoNotas || null,
          estado: "pendiente"
        })

      if (error) throw error

      toast({ 
        title: "Cita agendada",
        description: `${formatDateGMT3(agendamientoFecha)} - ${selectedOportunidad.cliente?.nombre}`
      })
      setAgendamientoDialogOpen(false)
    } catch (error) {
      console.error("Error creando agendamiento:", error)
      toast({
        title: "Error",
        description: "No se pudo agendar la cita",
        variant: "destructive"
      })
    }
  }

  // Automatizacion: crear seguimiento automatico al cambiar etapa
  const crearSeguimientoAutomatico = async (oportunidad: Oportunidad, etapaNueva: Etapa) => {
    if (!userId) return

    const mensajesAutomaticos: Record<string, string> = {
      "contactado": `Cliente contactado para oportunidad: ${oportunidad.titulo}`,
      "propuesta": `Propuesta enviada para: ${oportunidad.titulo}`,
      "negociacion": `En negociacion: ${oportunidad.titulo}`,
      "ganado": `VENTA CERRADA: ${oportunidad.titulo} - ${formatMoney(oportunidad.valor_estimado || 0)}`,
      "perdido": `Oportunidad perdida: ${oportunidad.titulo}`
    }

    const nombreEtapaNormalizado = etapaNueva.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const mensaje = Object.entries(mensajesAutomaticos).find(([key]) => 
      nombreEtapaNormalizado.includes(key)
    )?.[1]

    if (mensaje) {
      try {
        await supabase
          .from("crm_seguimientos")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            cliente_id: oportunidad.cliente_id,
            oportunidad_id: oportunidad.id,
            nota: mensaje,
            recordatorio_tipo: etapaNueva.es_etapa_final ? null : "semanal",
            recordatorio_fecha: etapaNueva.es_etapa_final ? null : calcularFechaRecordatorio("semanal"),
            recordatorio_completado: etapaNueva.es_etapa_final
          })
      } catch (error) {
        console.error("Error creando seguimiento automatico:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  const totales = calcularTotales()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pipeline de Ventas</h2>
          <p className="text-sm text-muted-foreground">
            {oportunidades.length} oportunidades | Total: {formatMoney(oportunidades.reduce((sum, o) => sum + (o.valor_estimado || 0), 0))}
            <span className="text-blue-500 ml-2">
              ({formatUSD(convertirAUsd(oportunidades.reduce((sum, o) => sum + (o.valor_estimado || 0), 0)))})
            </span>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Oportunidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOportunidad ? "Editar Oportunidad" : "Nueva Oportunidad"}
              </DialogTitle>
              <DialogDescription>
                {editingOportunidad 
                  ? "Modifica los datos de la oportunidad" 
                  : "Agrega una nueva oportunidad al pipeline"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Cliente */}
              <div className="grid gap-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Titulo */}
              <div className="grid gap-2">
                <Label htmlFor="titulo">Titulo *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Venta de productos X"
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {/* Tipo de Oportunidad */}
              <div className="grid gap-2">
                <Label>Tipo de Oportunidad</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={tipoOportunidad === "producto" ? "default" : "outline"}
                    className={tipoOportunidad === "producto" ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                    onClick={() => setTipoOportunidad("producto")}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Producto del Inventario
                  </Button>
                  <Button
                    type="button"
                    variant={tipoOportunidad === "servicio" ? "default" : "outline"}
                    className={tipoOportunidad === "servicio" ? "bg-purple-600 hover:bg-purple-700" : ""}
                    onClick={() => setTipoOportunidad("servicio")}
                  >
                    <Briefcase className="h-4 w-4 mr-2" />
                    Servicio / Otro
                  </Button>
                </div>
              </div>

              {/* Seccion de Productos */}
              {tipoOportunidad === "producto" && (
                <div className="p-4 bg-cyan-50 dark:bg-slate-800 rounded-lg border border-cyan-200 dark:border-slate-600 space-y-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-cyan-600" />
                    <Label className="text-cyan-700 dark:text-cyan-300 font-medium">Productos del Inventario</Label>
                  </div>
                  
                  {/* Selector de producto */}
                  <div className="flex gap-2">
                    <Select onValueChange={agregarProducto}>
                      <SelectTrigger className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        <SelectValue placeholder="Agregar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {productos.map(producto => (
                          <SelectItem key={producto.id} value={producto.id}>
                            {producto.nombre} - {formatMoney(producto.precio_venta)} (Stock: {producto.stock_actual})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lista de productos seleccionados */}
                  {productosSeleccionados.length > 0 && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 px-2">
                        <div className="col-span-4">Producto</div>
                        <div className="col-span-2 text-center">Cant.</div>
                        <div className="col-span-2 text-right">Precio</div>
                        <div className="col-span-3 text-right">Subtotal</div>
                        <div className="col-span-1"></div>
                      </div>
                      {productosSeleccionados.map((prod) => (
                        <div key={prod.producto_id} className="grid grid-cols-12 gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded border">
                          <div className="col-span-4 text-sm font-medium text-slate-900 dark:text-white truncate">
                            {prod.nombre}
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              min="1"
                              value={prod.cantidad}
                              onChange={(e) => actualizarCantidad(prod.producto_id, parseInt(e.target.value) || 1)}
                              className="h-8 text-center text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="col-span-2 text-right text-sm text-slate-700 dark:text-slate-300">
                            {formatMoney(prod.precio_unitario)}
                          </div>
                          <div className="col-span-3 text-right">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatMoney(prod.subtotal)}</p>
                            {prod.subtotal_usd && (
                              <p className="text-xs text-blue-600">{formatUSD(prod.subtotal_usd)}</p>
                            )}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => eliminarProducto(prod.producto_id)}
                            >
                              <X className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Descuento y Total */}
                  {productosSeleccionados.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-cyan-200 dark:border-slate-600">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-slate-600 dark:text-slate-400">Descuento (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={descuento}
                          onChange={(e) => setDescuento(e.target.value)}
                          className="w-20 h-8 text-center bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 dark:text-slate-400">Subtotal:</span>
                          <span className="text-slate-900 dark:text-white">{formatMoney(totales.subtotalPYG)}</span>
                        </div>
                        {totales.descuentoPct > 0 && (
                          <div className="flex justify-between text-sm text-red-600">
                            <span>Descuento ({totales.descuentoPct}%):</span>
                            <span>-{formatMoney(totales.descuentoMonto)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                          <span className="text-green-700 dark:text-green-300">Total:</span>
                          <div className="text-right">
                            <p className="text-green-700 dark:text-green-300">{formatMoney(totales.totalPYG)}</p>
                            <p className="text-sm text-blue-600 font-normal">{formatUSD(totales.totalUSD || convertirAUsd(totales.totalPYG))}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Seccion de Servicio */}
              {tipoOportunidad === "servicio" && (
                <div className="p-4 bg-purple-50 dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-slate-600 space-y-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-purple-600" />
                    <Label className="text-purple-700 dark:text-purple-300 font-medium">Monto del Servicio</Label>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-slate-700 dark:text-slate-300">Monto Estimado (Gs.)</Label>
                    <Input
                      type="number"
                      value={montoEstimado}
                      onChange={(e) => setMontoEstimado(e.target.value)}
                      placeholder="0"
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    {montoEstimado && (
                      <p className="text-sm text-blue-600">
                        Equivalente: {formatUSD(convertirAUsd(parseFloat(montoEstimado)))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Etapa y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Etapa</Label>
                  <Select value={etapaId} onValueChange={setEtapaId}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {etapas.map(etapa => (
                        <SelectItem key={etapa.id} value={etapa.id}>
                          {etapa.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prioridad</Label>
                  <Select value={prioridad} onValueChange={setPrioridad}>
                    <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Probabilidad y Fecha */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Probabilidad (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={probabilidad}
                    onChange={(e) => setProbabilidad(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fecha Cierre Estimada</Label>
                  <Input
                    type="date"
                    value={fechaCierreEstimada}
                    onChange={(e) => setFechaCierreEstimada(e.target.value)}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Notas */}
              <div className="grid gap-2">
                <Label>Notas</Label>
                <Textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
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
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                {editingOportunidad ? "Guardar Cambios" : "Crear Oportunidad"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map(etapa => {
          const etapaOportunidades = getOportunidadesByEtapa(etapa.id)
          const total = getTotalByEtapa(etapa.id)

          return (
            <div
              key={etapa.id}
              className="flex-shrink-0 w-80 bg-muted/30 rounded-lg"
            >
              {/* Column Header */}
              <div 
                className="p-3 rounded-t-lg border-b-2"
                style={{ borderColor: etapa.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: etapa.color }}
                    />
                    <h3 className="font-medium">{etapa.nombre}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {etapaOportunidades.length}
                    </Badge>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-1">
                    <p className="text-sm text-muted-foreground">
                      {formatMoney(total)}
                    </p>
                    <p className="text-xs text-blue-500">
                      {formatUSD(convertirAUsd(total))}
                    </p>
                  </div>
                )}
              </div>

              {/* Cards Container */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {etapaOportunidades.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Sin oportunidades
                  </div>
                ) : (
                  etapaOportunidades.map(oportunidad => {
                    const { prev, next } = getAdjacentEtapas(oportunidad.etapa_id)
                    
                    return (
                      <Card 
                        key={oportunidad.id} 
                        className="bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <CardContent className="p-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {oportunidad.titulo}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {oportunidad.cliente?.nombre || "Sin cliente"}
                                </span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(oportunidad)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenSeguimiento(oportunidad)}>
                                  <ClipboardList className="h-4 w-4 mr-2" />
                                  Crear Seguimiento
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenAgendamiento(oportunidad)}>
                                  <CalendarPlus className="h-4 w-4 mr-2" />
                                  Agendar Cita
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(oportunidad.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Indicador de tipo */}
                          {oportunidad.producto_interes && (
                            <Badge variant="outline" className="text-xs mb-2 bg-cyan-50 text-cyan-700 border-cyan-200">
                              <Package className="h-3 w-3 mr-1" />
                              Productos
                            </Badge>
                          )}

                          {/* Monto y Probabilidad */}
                          {oportunidad.valor_estimado && (
                            <div className="mb-2">
                              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                <DollarSign className="h-3 w-3" />
                                {formatMoney(oportunidad.valor_estimado)}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-blue-500">
                                  {formatUSD(convertirAUsd(oportunidad.valor_estimado))}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  ({oportunidad.probabilidad}%)
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Cliente Info */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {oportunidad.cliente?.telefono && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {oportunidad.cliente.telefono}
                              </Badge>
                            )}
                            {oportunidad.cliente?.ciudad && (
                              <Badge variant="outline" className="text-xs">
                                {oportunidad.cliente.ciudad}
                              </Badge>
                            )}
                          </div>

                          {/* Prioridad y Fecha */}
                          <div className="flex items-center justify-between">
                            <Badge className={`text-xs ${PRIORIDAD_COLORS[oportunidad.prioridad || "media"]}`}>
                              {oportunidad.prioridad || "media"}
                            </Badge>
                            {oportunidad.fecha_cierre_estimada && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDateGMT3(oportunidad.fecha_cierre_estimada)}
                              </span>
                            )}
                          </div>

                          {/* Move Buttons */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!prev}
                              onClick={() => prev && moveOportunidad(oportunidad.id, prev.id)}
                            >
                              <ChevronLeft className="h-3 w-3 mr-1" />
                              {prev?.nombre || ""}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!next}
                              onClick={() => next && moveOportunidad(oportunidad.id, next.id)}
                            >
                              {next?.nombre || ""}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {etapas.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No se encontraron etapas del pipeline.
          </p>
          <Button variant="outline" onClick={loadData}>
            Recargar
          </Button>
        </Card>
      )}

      {/* Dialog: Crear Seguimiento */}
      <Dialog open={seguimientoDialogOpen} onOpenChange={setSeguimientoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-cyan-600" />
              Crear Seguimiento
            </DialogTitle>
            <DialogDescription>
              {selectedOportunidad && (
                <span>
                  Vinculado a: <strong>{selectedOportunidad.titulo}</strong> - {selectedOportunidad.cliente?.nombre}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-200">Nota del seguimiento *</Label>
              <Textarea
                value={seguimientoNota}
                onChange={(e) => setSeguimientoNota(e.target.value)}
                placeholder="Ej: Llamar al cliente para dar seguimiento a la propuesta..."
                rows={4}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-200">Tipo de recordatorio</Label>
              <Select value={seguimientoTipo} onValueChange={setSeguimientoTipo}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Cada semana</SelectItem>
                  <SelectItem value="quincenal">Cada 2 semanas</SelectItem>
                  <SelectItem value="mensual">Cada mes</SelectItem>
                  <SelectItem value="personalizado">Fecha personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {seguimientoTipo === "personalizado" && (
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-200">Fecha del recordatorio</Label>
                <Input
                  type="date"
                  value={seguimientoFecha}
                  onChange={(e) => setSeguimientoFecha(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSeguimientoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearSeguimiento}
              disabled={!seguimientoNota}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Crear Seguimiento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Agendar Cita */}
      <Dialog open={agendamientoDialogOpen} onOpenChange={setAgendamientoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-purple-600" />
              Agendar Cita
            </DialogTitle>
            <DialogDescription>
              {selectedOportunidad && (
                <span>
                  Para: <strong>{selectedOportunidad.cliente?.nombre}</strong> - {selectedOportunidad.titulo}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-200">Titulo de la cita *</Label>
              <Input
                value={agendamientoTitulo}
                onChange={(e) => setAgendamientoTitulo(e.target.value)}
                placeholder="Ej: Reunion de presentacion"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-200">Tipo de cita</Label>
              <Select value={agendamientoTipo} onValueChange={setAgendamientoTipo}>
                <SelectTrigger className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reunion">Reunion presencial</SelectItem>
                  <SelectItem value="llamada">Llamada telefonica</SelectItem>
                  <SelectItem value="videollamada">Videollamada</SelectItem>
                  <SelectItem value="visita">Visita al cliente</SelectItem>
                  <SelectItem value="presentacion">Presentacion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-200">Fecha *</Label>
                <Input
                  type="date"
                  value={agendamientoFecha}
                  onChange={(e) => setAgendamientoFecha(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-200">Hora</Label>
                <Input
                  type="time"
                  value={agendamientoHora}
                  onChange={(e) => setAgendamientoHora(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-200">Notas adicionales</Label>
              <Textarea
                value={agendamientoNotas}
                onChange={(e) => setAgendamientoNotas(e.target.value)}
                placeholder="Detalles de la reunion, temas a tratar..."
                rows={3}
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <p className="text-xs text-purple-700 dark:text-purple-300 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Zona horaria: GMT-3 (Paraguay/Asuncion)
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAgendamientoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCrearAgendamiento}
              disabled={!agendamientoTitulo || !agendamientoFecha}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Agendar Cita
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
