"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Wallet, 
  Trash2,
  Edit2,
  DollarSign,
  Eye,
  TrendingUp,
  Package,
  AlertTriangle,
  CreditCard,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  Percent,
  Calculator,
  Filter,
  Search,
  CalendarDays,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bell,
  X,
  User
} from "lucide-react"
import { format, addDays, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, isBefore, isAfter, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface Producto {
  id: string
  nombre: string
  precio_costo: number
  precio_venta: number
  stock_actual: number
  unidad_medida: string
}

interface Cobranza {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  producto_id: string | null
  cantidad: number | null
  precio_costo: number | null
  descripcion: string
  tipo_pago: "contado" | "cuotas"
  monto_total: number
  monto_inicial: number | null
  num_cuotas: number | null
  monto_cuota: number | null
  interes_porcentaje: number | null
  monto_con_interes: number | null
  frecuencia_dias: number | null
  fecha_venta: string
  fecha_inicio_cuotas: string | null
  estado: "activa" | "completada" | "cancelada" | "en_mora"
  notas: string | null
  created_at: string
  clientes?: Cliente
}

interface PagoCuota {
  id: string
  venta_id: string
  numero_cuota: number
  monto_pagado: number | null
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: "pendiente" | "pagada" | "vencida"
}

interface CobranzaConCuotas extends Cobranza {
  proximaCuota?: PagoCuota | null
  cuotasPagadas?: number
  cuotasPendientes?: number
  montoAdeudado?: number
  diasParaProxima?: number
  diasVencido?: number
}

type FiltroEstado = "todos" | "activa" | "completada" | "atrasado" | "vence_pronto"

export function CobranzasManager({ 
  perfilId, 
  perfilEmpresarialId,
  userId 
}: { 
  perfilId: string
  perfilEmpresarialId: string | null
  userId: string
}) {
  const [cobranzas, setCobranzas] = useState<CobranzaConCuotas[]>([])
  const [allPagos, setAllPagos] = useState<PagoCuota[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCobranza, setEditingCobranza] = useState<Cobranza | null>(null)
  const [selectedCobranza, setSelectedCobranza] = useState<CobranzaConCuotas | null>(null)
  const [pagos, setPagos] = useState<PagoCuota[]>([])
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [vistaActual, setVistaActual] = useState<"tabla" | "calendario">("tabla")
  const [mesCalendario, setMesCalendario] = useState(new Date())

  const [formData, setFormData] = useState({
    cliente_id: "",
    producto_id: "",
    cantidad: "1",
    descripcion: "",
    tipo_pago: "contado" as "contado" | "cuotas",
    monto_total: "",
    monto_inicial: "",
    pago_inicial_es_cuota: true,
    num_cuotas: "",
    interes_porcentaje: "",
    frecuencia_dias: "30",
    fecha_venta: format(new Date(), "yyyy-MM-dd"),
    fecha_inicio_cuotas: format(new Date(), "yyyy-MM-dd"),
    notas: "",
  })

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)

    // Fetch clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido")
      .eq("user_id", userId)
      .order("nombre")

    setClientes(clientesData || [])

    // Fetch productos del inventario compartido
    const { data: productosData } = await supabase
      .from("inventario")
      .select("id, nombre, precio_costo, precio_venta, stock_actual, unidad_medida")
      .eq("user_id", userId)
      .eq("activo", true)
      .order("nombre")

    setProductos(productosData || [])

    // Fetch cobranzas con relaciones
    const { data: cobranzasData, error } = await supabase
      .from("crm_ventas")
      .select(`
        *,
        clientes (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha_venta", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las cobranzas",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    // Fetch todos los pagos de cuotas
    const { data: pagosData } = await supabase
      .from("crm_pagos_cuotas")
      .select("*")
      .eq("user_id", userId)
      .order("fecha_vencimiento", { ascending: true })

    setAllPagos(pagosData || [])

    // Enriquecer cobranzas con info de cuotas
    const cobranzasEnriquecidas: CobranzaConCuotas[] = (cobranzasData || []).map(cobranza => {
      if (cobranza.tipo_pago === "contado") {
        return { ...cobranza }
      }

      const cuotasDeEstaCobranza = (pagosData || []).filter(p => p.venta_id === cobranza.id)
      const cuotasPagadas = cuotasDeEstaCobranza.filter(p => p.estado === "pagada").length
      const cuotasPendientes = cuotasDeEstaCobranza.filter(p => p.estado !== "pagada").length
      const proximaCuota = cuotasDeEstaCobranza.find(p => p.estado === "pendiente" || p.estado === "vencida")
      
      let diasParaProxima = 0
      let diasVencido = 0
      
      if (proximaCuota) {
        const fechaVenc = parseISO(proximaCuota.fecha_vencimiento)
        const hoy = new Date()
        const diff = differenceInDays(fechaVenc, hoy)
        
        if (diff < 0) {
          diasVencido = Math.abs(diff)
        } else {
          diasParaProxima = diff
        }
      }

      const montoPagado = cuotasDeEstaCobranza
        .filter(p => p.estado === "pagada")
        .reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
      const montoTotal = cobranza.monto_con_interes || cobranza.monto_total
      const montoAdeudado = montoTotal - montoPagado

      return {
        ...cobranza,
        proximaCuota,
        cuotasPagadas,
        cuotasPendientes,
        montoAdeudado: montoAdeudado > 0 ? montoAdeudado : 0,
        diasParaProxima,
        diasVencido
      }
    })

    setCobranzas(cobranzasEnriquecidas)
    setIsLoading(false)
  }, [userId, perfilId, supabase, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filtrar y ordenar cobranzas
  const cobranzasFiltradas = useMemo(() => {
    let filtered = [...cobranzas]

    // Filtro por busqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(c => 
        c.clientes?.nombre?.toLowerCase().includes(term) ||
        c.clientes?.apellido?.toLowerCase().includes(term) ||
        c.descripcion?.toLowerCase().includes(term)
      )
    }

    // Filtro por estado
    if (filtroEstado !== "todos") {
      if (filtroEstado === "atrasado") {
        filtered = filtered.filter(c => c.diasVencido && c.diasVencido > 0)
      } else if (filtroEstado === "vence_pronto") {
        filtered = filtered.filter(c => c.diasParaProxima !== undefined && c.diasParaProxima <= 7 && c.diasParaProxima >= 0 && c.estado === "activa")
      } else {
        filtered = filtered.filter(c => c.estado === filtroEstado)
      }
    }

    // Filtro por fecha
    if (fechaDesde) {
      filtered = filtered.filter(c => c.fecha_venta >= fechaDesde)
    }
    if (fechaHasta) {
      filtered = filtered.filter(c => c.fecha_venta <= fechaHasta)
    }

    // Ordenar por proxima cuota (las mas urgentes primero)
    filtered.sort((a, b) => {
      // Primero las vencidas
      if (a.diasVencido && !b.diasVencido) return -1
      if (!a.diasVencido && b.diasVencido) return 1
      if (a.diasVencido && b.diasVencido) return b.diasVencido - a.diasVencido

      // Luego por dias para proxima cuota
      if (a.diasParaProxima !== undefined && b.diasParaProxima !== undefined) {
        return a.diasParaProxima - b.diasParaProxima
      }
      if (a.diasParaProxima !== undefined) return -1
      if (b.diasParaProxima !== undefined) return 1

      // Finalmente por fecha de venta
      return new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime()
    })

    return filtered
  }, [cobranzas, searchTerm, filtroEstado, fechaDesde, fechaHasta])

  // Metricas
  const totalCobranzas = cobranzas.length
  const totalRecaudado = cobranzas
    .filter(c => c.estado === "completada")
    .reduce((sum, c) => sum + (c.monto_con_interes || c.monto_total), 0) +
    allPagos.filter(p => p.estado === "pagada").reduce((sum, p) => sum + (p.monto_pagado || 0), 0)
  
  const pendienteCobrar = cobranzas
    .filter(c => c.estado === "activa")
    .reduce((sum, c) => sum + (c.montoAdeudado || 0), 0)
  
  const enCuotas = cobranzas.filter(c => c.tipo_pago === "cuotas" && c.estado === "activa").length
  
  const atrasadas = cobranzas.filter(c => c.diasVencido && c.diasVencido > 0).length
  
  const vencenEstaSemana = cobranzas.filter(c => 
    c.diasParaProxima !== undefined && 
    c.diasParaProxima <= 7 && 
    c.diasParaProxima >= 0 && 
    c.estado === "activa"
  ).length

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      producto_id: "",
      cantidad: "1",
      descripcion: "",
      tipo_pago: "contado",
      monto_total: "",
      monto_inicial: "",
      pago_inicial_es_cuota: true,
      num_cuotas: "",
      interes_porcentaje: "",
      frecuencia_dias: "30",
      fecha_venta: format(new Date(), "yyyy-MM-dd"),
      fecha_inicio_cuotas: format(new Date(), "yyyy-MM-dd"),
      notas: "",
    })
    setSelectedProducto(null)
    setEditingCobranza(null)
  }

  const handleProductoChange = (productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    setSelectedProducto(producto || null)
    
    if (producto) {
      const cantidad = parseInt(formData.cantidad) || 1
      const montoTotal = producto.precio_venta * cantidad
      setFormData({
        ...formData,
        producto_id: productoId,
        descripcion: producto.nombre,
        monto_total: montoTotal.toString(),
      })
    } else {
      setFormData({
        ...formData,
        producto_id: "",
      })
    }
  }

  const handleCantidadChange = (cantidadStr: string) => {
    const cantidad = parseInt(cantidadStr) || 1
    
    if (selectedProducto) {
      const montoTotal = selectedProducto.precio_venta * cantidad
      setFormData(prev => ({
        ...prev,
        cantidad: cantidadStr,
        monto_total: montoTotal.toString(),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        cantidad: cantidadStr,
      }))
    }
  }

  const calcularMontoConInteres = () => {
    const total = parseFloat(formData.monto_total) || 0
    const interes = parseFloat(formData.interes_porcentaje) || 0
    return total + (total * interes / 100)
  }

  const calcularMontoCuota = () => {
    const montoConInteres = calcularMontoConInteres()
    const inicial = parseFloat(formData.monto_inicial) || 0
    let numCuotas = parseInt(formData.num_cuotas) || 1
    
    if (formData.pago_inicial_es_cuota && inicial > 0) {
      numCuotas = Math.max(1, numCuotas - 1)
    }
    
    const restante = montoConInteres - inicial
    return restante > 0 ? Math.ceil(restante / numCuotas) : 0
  }

  const calcularCuotasRestantes = () => {
    const numCuotas = parseInt(formData.num_cuotas) || 1
    const inicial = parseFloat(formData.monto_inicial) || 0
    
    if (formData.pago_inicial_es_cuota && inicial > 0) {
      return Math.max(0, numCuotas - 1)
    }
    return numCuotas
  }

  const calcularGanancia = () => {
    if (!selectedProducto) return 0
    const cantidad = parseInt(formData.cantidad) || 1
    const ganancia = (selectedProducto.precio_venta - selectedProducto.precio_costo) * cantidad
    return ganancia
  }

  const handleOpenDialog = (cobranza?: Cobranza) => {
    if (cobranza) {
      setEditingCobranza(cobranza)
      const producto = productos.find(p => p.id === cobranza.producto_id)
      setSelectedProducto(producto || null)
      setFormData({
        cliente_id: cobranza.cliente_id,
        producto_id: cobranza.producto_id || "",
        cantidad: cobranza.cantidad?.toString() || "1",
        descripcion: cobranza.descripcion,
        tipo_pago: cobranza.tipo_pago,
        monto_total: cobranza.monto_total.toString(),
        monto_inicial: cobranza.monto_inicial?.toString() || "",
        pago_inicial_es_cuota: true,
        num_cuotas: cobranza.num_cuotas?.toString() || "",
        interes_porcentaje: cobranza.interes_porcentaje?.toString() || "",
        frecuencia_dias: cobranza.frecuencia_dias?.toString() || "30",
        fecha_venta: cobranza.fecha_venta,
        fecha_inicio_cuotas: cobranza.fecha_inicio_cuotas || format(new Date(), "yyyy-MM-dd"),
        notas: cobranza.notas || "",
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const registrarIngresoEmpresarial = async (
    monto: number, 
    descripcion: string, 
    fecha: string,
    cobranzaId: string,
    esCuota: boolean = false,
    numeroCuota?: number
  ) => {
    if (!perfilEmpresarialId) return

    const tipoIngreso = esCuota 
      ? `Cuota ${numeroCuota} - ${descripcion}` 
      : `Cobranza CRM: ${descripcion}`

    await supabase.from("ingresos").insert({
      user_id: userId,
      perfil_id: perfilEmpresarialId,
      monto: monto,
      tipo_ingreso: tipoIngreso,
      fecha: fecha,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.cliente_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    if (selectedProducto && !editingCobranza) {
      const cantidad = parseInt(formData.cantidad) || 1
      if (cantidad > selectedProducto.stock_actual) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${selectedProducto.stock_actual} ${selectedProducto.unidad_medida}(s) disponibles`,
          variant: "destructive",
        })
        return
      }
    }

    if (formData.tipo_pago === "cuotas") {
      if (!formData.num_cuotas || parseInt(formData.num_cuotas) < 1) {
        toast({
          title: "Error",
          description: "Debes especificar la cantidad de cuotas",
          variant: "destructive",
        })
        return
      }
      if (!formData.monto_total || parseFloat(formData.monto_total) <= 0) {
        toast({
          title: "Error",
          description: "Debes especificar el monto total",
          variant: "destructive",
        })
        return
      }
    }

    const montoConInteres = calcularMontoConInteres()
    const montoCuota = calcularMontoCuota()
    const cuotasRestantes = calcularCuotasRestantes()

    const cobranzaData = {
      user_id: userId,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      producto_id: formData.producto_id || null,
      cantidad: formData.producto_id ? parseInt(formData.cantidad) || 1 : null,
      precio_costo: selectedProducto?.precio_costo || null,
      descripcion: formData.descripcion,
      tipo_pago: formData.tipo_pago,
      monto_total: parseFloat(formData.monto_total),
      monto_inicial: formData.tipo_pago === "cuotas" ? parseFloat(formData.monto_inicial) || 0 : null,
      num_cuotas: formData.tipo_pago === "cuotas" ? parseInt(formData.num_cuotas) : null,
      monto_cuota: formData.tipo_pago === "cuotas" ? montoCuota : null,
      interes_porcentaje: formData.tipo_pago === "cuotas" ? parseFloat(formData.interes_porcentaje) || 0 : null,
      monto_con_interes: formData.tipo_pago === "cuotas" ? montoConInteres : null,
      frecuencia_dias: formData.tipo_pago === "cuotas" ? parseInt(formData.frecuencia_dias) || 30 : null,
      fecha_venta: formData.fecha_venta,
      fecha_inicio_cuotas: formData.tipo_pago === "cuotas" ? formData.fecha_inicio_cuotas : null,
      estado: formData.tipo_pago === "contado" ? "completada" : "activa",
      notas: formData.notas || null,
    }

    if (editingCobranza) {
      const { error } = await supabase
        .from("crm_ventas")
        .update({ ...cobranzaData, updated_at: new Date().toISOString() })
        .eq("id", editingCobranza.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la cobranza",
          variant: "destructive",
        })
      } else {
        toast({ title: "Cobranza actualizada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { data: nuevaCobranza, error } = await supabase
        .from("crm_ventas")
        .insert([cobranzaData])
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la cobranza: " + error.message,
          variant: "destructive",
        })
      } else {
        if (formData.producto_id && selectedProducto) {
          const cantidadVendida = parseInt(formData.cantidad) || 1
          await supabase
            .from("inventario")
            .update({ 
              stock_actual: selectedProducto.stock_actual - cantidadVendida 
            })
            .eq("id", formData.producto_id)
        }

        if (formData.tipo_pago === "contado") {
          await registrarIngresoEmpresarial(
            parseFloat(formData.monto_total),
            formData.descripcion,
            formData.fecha_venta,
            nuevaCobranza.id
          )
        } else {
          const pagoInicial = parseFloat(formData.monto_inicial) || 0
          if (pagoInicial > 0) {
            await registrarIngresoEmpresarial(
              pagoInicial,
              formData.descripcion,
              formData.fecha_venta,
              nuevaCobranza.id,
              true,
              1
            )
          }

          const fechaInicio = new Date(formData.fecha_inicio_cuotas)
          const frecuenciaDias = parseInt(formData.frecuencia_dias) || 30
          const cuotaInicio = formData.pago_inicial_es_cuota && pagoInicial > 0 ? 2 : 1
          
          const pagosData = Array.from({ length: cuotasRestantes }, (_, i) => {
            const fechaVenc = addDays(fechaInicio, frecuenciaDias * (i + (cuotaInicio === 2 ? 1 : 0)))
            return {
              user_id: userId,
              venta_id: nuevaCobranza.id,
              numero_cuota: cuotaInicio + i,
              monto_pagado: null,
              fecha_vencimiento: format(fechaVenc, "yyyy-MM-dd"),
              fecha_pago: null,
              estado: "pendiente",
            }
          })

          if (formData.pago_inicial_es_cuota && pagoInicial > 0) {
            pagosData.unshift({
              user_id: userId,
              venta_id: nuevaCobranza.id,
              numero_cuota: 1,
              monto_pagado: pagoInicial,
              fecha_vencimiento: formData.fecha_venta,
              fecha_pago: formData.fecha_venta,
              estado: "pagada",
            })
          }

          if (pagosData.length > 0) {
            await supabase.from("crm_pagos_cuotas").insert(pagosData)
          }
        }

        toast({ title: "Cobranza registrada correctamente" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleVerPagos = async (cobranza: CobranzaConCuotas) => {
    setSelectedCobranza(cobranza)
    const { data } = await supabase
      .from("crm_pagos_cuotas")
      .select("*")
      .eq("venta_id", cobranza.id)
      .order("numero_cuota")

    setPagos(data || [])
    setIsPagosDialogOpen(true)
  }

  const handleRegistrarPago = async (pagoId: string, numeroCuota: number) => {
    if (!selectedCobranza) return

    const montoPago = selectedCobranza.monto_cuota || 0

    const { error } = await supabase
      .from("crm_pagos_cuotas")
      .update({
        estado: "pagada",
        fecha_pago: format(new Date(), "yyyy-MM-dd"),
        monto_pagado: montoPago,
      })
      .eq("id", pagoId)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive",
      })
    } else {
      await registrarIngresoEmpresarial(
        montoPago,
        selectedCobranza.descripcion,
        format(new Date(), "yyyy-MM-dd"),
        selectedCobranza.id,
        true,
        numeroCuota
      )

      const { data: cuotasPendientes } = await supabase
        .from("crm_pagos_cuotas")
        .select("id")
        .eq("venta_id", selectedCobranza.id)
        .eq("estado", "pendiente")

      if (cuotasPendientes && cuotasPendientes.length <= 1) {
        await supabase
          .from("crm_ventas")
          .update({ estado: "completada" })
          .eq("id", selectedCobranza.id)
      }

      toast({ title: "Pago registrado correctamente" })
      handleVerPagos(selectedCobranza)
      fetchData()
    }
  }

  const handlePagarTodas = async () => {
    if (!selectedCobranza) return

    const cuotasPendientes = pagos.filter(p => p.estado === "pendiente" || p.estado === "vencida")
    
    for (const cuota of cuotasPendientes) {
      await supabase
        .from("crm_pagos_cuotas")
        .update({
          estado: "pagada",
          fecha_pago: format(new Date(), "yyyy-MM-dd"),
          monto_pagado: selectedCobranza.monto_cuota,
        })
        .eq("id", cuota.id)

      await registrarIngresoEmpresarial(
        selectedCobranza.monto_cuota || 0,
        selectedCobranza.descripcion,
        format(new Date(), "yyyy-MM-dd"),
        selectedCobranza.id,
        true,
        cuota.numero_cuota
      )
    }

    await supabase
      .from("crm_ventas")
      .update({ estado: "completada" })
      .eq("id", selectedCobranza.id)

    toast({ title: "Todas las cuotas fueron pagadas" })
    handleVerPagos(selectedCobranza)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Estas seguro de eliminar esta cobranza?")) return

    await supabase.from("crm_pagos_cuotas").delete().eq("venta_id", id)
    const { error } = await supabase.from("crm_ventas").delete().eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la cobranza",
        variant: "destructive",
      })
    } else {
      toast({ title: "Cobranza eliminada" })
      fetchData()
    }
  }

  // Obtener cuotas del mes para el calendario
  const cuotasDelMes = useMemo(() => {
    const inicio = startOfMonth(mesCalendario)
    const fin = endOfMonth(mesCalendario)
    
    return allPagos.filter(p => {
      const fecha = parseISO(p.fecha_vencimiento)
      return fecha >= inicio && fecha <= fin && p.estado !== "pagada"
    })
  }, [allPagos, mesCalendario])

  // Dias del mes para el calendario
  const diasDelMes = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesCalendario), { weekStartsOn: 1 })
    const fin = endOfWeek(endOfMonth(mesCalendario), { weekStartsOn: 1 })
    return eachDayOfInterval({ start: inicio, end: fin })
  }, [mesCalendario])

  // Renderizar estado badge con colores
  const renderEstadoBadge = (cobranza: CobranzaConCuotas) => {
    if (cobranza.estado === "completada") {
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Completada</Badge>
    }
    if (cobranza.diasVencido && cobranza.diasVencido > 0) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Vencida ({cobranza.diasVencido}d)</Badge>
    }
    if (cobranza.diasParaProxima !== undefined && cobranza.diasParaProxima <= 3) {
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Vence pronto</Badge>
    }
    if (cobranza.estado === "activa") {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">En curso</Badge>
    }
    if (cobranza.estado === "cancelada") {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Cancelada</Badge>
    }
    return <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Activa</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Wallet className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Cobranzas</p>
                <p className="text-2xl font-bold text-white">{totalCobranzas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Recaudado</p>
                <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalRecaudado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Pendiente</p>
                <p className="text-xl font-bold text-amber-400">{formatCurrency(pendienteCobrar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <CreditCard className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">En Cuotas</p>
                <p className="text-2xl font-bold text-white">{enCuotas}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Atrasadas</p>
                <p className="text-2xl font-bold text-red-400">{atrasadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de vencimientos */}
      {(atrasadas > 0 || vencenEstaSemana > 0) && (
        <Card className="bg-gradient-to-r from-amber-950/30 to-red-950/30 border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">Alertas de cobranza</p>
                <div className="flex gap-4 mt-1 text-sm">
                  {atrasadas > 0 && (
                    <span className="text-red-400">
                      {atrasadas} cuota(s) vencida(s)
                    </span>
                  )}
                  {vencenEstaSemana > 0 && (
                    <span className="text-amber-400">
                      {vencenEstaSemana} vence(n) esta semana
                    </span>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="border-amber-600 text-amber-400 hover:bg-amber-950"
                onClick={() => setFiltroEstado("atrasado")}
              >
                Ver atrasadas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs Vista */}
      <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as "tabla" | "calendario")}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="tabla" className="data-[state=active]:bg-cyan-600">
              <Wallet className="h-4 w-4 mr-2" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendario" className="data-[state=active]:bg-cyan-600">
              <CalendarDays className="h-4 w-4 mr-2" />
              Calendario
            </TabsTrigger>
          </TabsList>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Cobranza
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingCobranza ? "Editar Cobranza" : "Nueva Cobranza"}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Registra una venta con pago al contado o financiado
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Cliente */}
                <div className="space-y-2">
                  <Label htmlFor="cliente_id" className="text-slate-200">Cliente *</Label>
                  <Select
                    value={formData.cliente_id}
                    onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nombre} {c.apellido || ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Producto */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Producto (opcional)</Label>
                  <Select
                    value={formData.producto_id || "none"}
                    onValueChange={(value) => handleProductoChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Sin producto" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="none">Sin producto</SelectItem>
                      {productos.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} - {formatCurrency(p.precio_venta)} (Stock: {p.stock_actual})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedProducto && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-200">Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.cantidad}
                        onChange={(e) => handleCantidadChange(e.target.value)}
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                      <p className="text-xs text-emerald-400">Ganancia estimada</p>
                      <p className="text-lg font-bold text-emerald-300">{formatCurrency(calcularGanancia())}</p>
                    </div>
                  </div>
                )}

                {/* Descripcion */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Descripcion *</Label>
                  <Input
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    placeholder="Descripcion del producto/servicio"
                    required
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Monto Total */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Monto Total *</Label>
                  <Input
                    type="number"
                    value={formData.monto_total}
                    onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
                    placeholder="0"
                    required
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Tipo de Pago */}
                <div className="space-y-3">
                  <Label className="text-slate-200">Forma de Pago</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.tipo_pago === "contado"
                          ? "border-emerald-500 bg-emerald-950/30"
                          : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                      }`}
                      onClick={() => setFormData({ ...formData, tipo_pago: "contado" })}
                    >
                      <div className="flex items-center gap-3">
                        <Banknote className={`h-5 w-5 ${formData.tipo_pago === "contado" ? "text-emerald-400" : "text-slate-400"}`} />
                        <div>
                          <p className={`font-medium ${formData.tipo_pago === "contado" ? "text-emerald-300" : "text-slate-300"}`}>Contado</p>
                          <p className="text-xs text-slate-500">Pago completo</p>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.tipo_pago === "cuotas"
                          ? "border-cyan-500 bg-cyan-950/30"
                          : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
                      }`}
                      onClick={() => setFormData({ ...formData, tipo_pago: "cuotas" })}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className={`h-5 w-5 ${formData.tipo_pago === "cuotas" ? "text-cyan-400" : "text-slate-400"}`} />
                        <div>
                          <p className={`font-medium ${formData.tipo_pago === "cuotas" ? "text-cyan-300" : "text-slate-300"}`}>Financiado</p>
                          <p className="text-xs text-slate-500">Pago en cuotas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Configuracion Financiamiento */}
                {formData.tipo_pago === "cuotas" && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2 text-cyan-300">
                        <CreditCard className="h-4 w-4" />
                        Configuracion del Plan de Pago
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">Pago Inicial (opcional)</Label>
                          <Input
                            type="number"
                            value={formData.monto_inicial}
                            onChange={(e) => setFormData({ ...formData, monto_inicial: e.target.value })}
                            placeholder="0"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Cantidad de Cuotas *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.num_cuotas}
                            onChange={(e) => setFormData({ ...formData, num_cuotas: e.target.value })}
                            placeholder="Ej: 6"
                            required
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="pago_inicial_cuota"
                          checked={formData.pago_inicial_es_cuota}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, pago_inicial_es_cuota: checked as boolean })
                          }
                        />
                        <Label htmlFor="pago_inicial_cuota" className="text-sm text-slate-400">
                          El pago inicial cuenta como cuota #1
                        </Label>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-300">% Interes (opcional)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.interes_porcentaje}
                            onChange={(e) => setFormData({ ...formData, interes_porcentaje: e.target.value })}
                            placeholder="0"
                            className="bg-slate-700 border-slate-600"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-300">Frecuencia (dias)</Label>
                          <Select
                            value={formData.frecuencia_dias}
                            onValueChange={(v) => setFormData({ ...formData, frecuencia_dias: v })}
                          >
                            <SelectTrigger className="bg-slate-700 border-slate-600">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-600">
                              <SelectItem value="7">Cada 7 dias (semanal)</SelectItem>
                              <SelectItem value="14">Cada 14 dias (quincenal)</SelectItem>
                              <SelectItem value="30">Cada 30 dias (mensual)</SelectItem>
                              <SelectItem value="60">Cada 60 dias</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300">Fecha Primera Cuota</Label>
                        <Input
                          type="date"
                          value={formData.fecha_inicio_cuotas}
                          onChange={(e) => setFormData({ ...formData, fecha_inicio_cuotas: e.target.value })}
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>

                      {/* Resumen del Plan */}
                      {formData.monto_total && formData.num_cuotas && (
                        <div className="p-4 bg-gradient-to-br from-cyan-950/50 to-teal-950/50 rounded-lg border border-cyan-800/50 space-y-3">
                          <p className="font-semibold text-cyan-300 flex items-center gap-2">
                            <Calculator className="h-4 w-4" />
                            Resumen del Plan:
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Monto base:</span>
                              <span className="font-medium text-white">{formatCurrency(parseFloat(formData.monto_total))}</span>
                            </div>
                            {parseFloat(formData.interes_porcentaje) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-amber-400">+ Interes ({formData.interes_porcentaje}%):</span>
                                <span className="font-medium text-amber-300">{formatCurrency(calcularMontoConInteres() - parseFloat(formData.monto_total))}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total a pagar:</span>
                              <span className="font-bold text-emerald-400">{formatCurrency(calcularMontoConInteres())}</span>
                            </div>
                            {parseFloat(formData.monto_inicial) > 0 && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Pago inicial:</span>
                                <span className="font-medium text-blue-400">{formatCurrency(parseFloat(formData.monto_inicial))}</span>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-cyan-800/50 pt-3 mt-3">
                            <p className="font-bold text-lg text-cyan-200">
                              {calcularCuotasRestantes()} cuota(s) de {formatCurrency(calcularMontoCuota())}
                            </p>
                            <p className="text-xs text-cyan-400">
                              Cada {formData.frecuencia_dias} dias desde {format(new Date(formData.fecha_inicio_cuotas || new Date()), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Fecha de Venta */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Fecha de Venta</Label>
                  <Input
                    type="date"
                    value={formData.fecha_venta}
                    onChange={(e) => setFormData({ ...formData, fecha_venta: e.target.value })}
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Notas (opcional)</Label>
                  <Textarea
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                    placeholder="Notas adicionales..."
                    className="bg-slate-800 border-slate-600"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                    {editingCobranza ? "Actualizar" : "Registrar Cobranza"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vista Tabla */}
        <TabsContent value="tabla" className="space-y-4">
          {/* Filtros */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Busqueda */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por cliente o descripcion..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600"
                  />
                </div>

                {/* Filtros rapidos */}
                <div className="flex gap-2 flex-wrap">
                  <Badge
                    variant={filtroEstado === "todos" ? "default" : "outline"}
                    className={`cursor-pointer ${filtroEstado === "todos" ? "bg-cyan-600" : "hover:bg-slate-700"}`}
                    onClick={() => setFiltroEstado("todos")}
                  >
                    Todos ({totalCobranzas})
                  </Badge>
                  <Badge
                    variant={filtroEstado === "completada" ? "default" : "outline"}
                    className={`cursor-pointer ${filtroEstado === "completada" ? "bg-emerald-600" : "hover:bg-slate-700"}`}
                    onClick={() => setFiltroEstado("completada")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Completas
                  </Badge>
                  <Badge
                    variant={filtroEstado === "activa" ? "default" : "outline"}
                    className={`cursor-pointer ${filtroEstado === "activa" ? "bg-blue-600" : "hover:bg-slate-700"}`}
                    onClick={() => setFiltroEstado("activa")}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    En curso
                  </Badge>
                  <Badge
                    variant={filtroEstado === "atrasado" ? "default" : "outline"}
                    className={`cursor-pointer ${filtroEstado === "atrasado" ? "bg-red-600" : "hover:bg-slate-700"}`}
                    onClick={() => setFiltroEstado("atrasado")}
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Atrasadas ({atrasadas})
                  </Badge>
                  <Badge
                    variant={filtroEstado === "vence_pronto" ? "default" : "outline"}
                    className={`cursor-pointer ${filtroEstado === "vence_pronto" ? "bg-amber-600" : "hover:bg-slate-700"}`}
                    onClick={() => setFiltroEstado("vence_pronto")}
                  >
                    <Bell className="h-3 w-3 mr-1" />
                    Vence pronto ({vencenEstaSemana})
                  </Badge>
                </div>

                {/* Filtro por fechas */}
                <div className="flex gap-2 items-center">
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    className="w-36 bg-slate-700 border-slate-600 text-sm"
                    placeholder="Desde"
                  />
                  <span className="text-slate-500">-</span>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-36 bg-slate-700 border-slate-600 text-sm"
                    placeholder="Hasta"
                  />
                  {(fechaDesde || fechaHasta) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400">Fecha</TableHead>
                    <TableHead className="text-slate-400">Cliente</TableHead>
                    <TableHead className="text-slate-400">Descripcion</TableHead>
                    <TableHead className="text-slate-400 text-right">Monto</TableHead>
                    <TableHead className="text-slate-400">Tipo</TableHead>
                    <TableHead className="text-slate-400">Proxima Cuota</TableHead>
                    <TableHead className="text-slate-400 text-right">Adeuda</TableHead>
                    <TableHead className="text-slate-400">Estado</TableHead>
                    <TableHead className="text-slate-400 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobranzasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                        No se encontraron cobranzas
                      </TableCell>
                    </TableRow>
                  ) : (
                    cobranzasFiltradas.map((cobranza) => (
                      <TableRow key={cobranza.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-slate-300">
                          {format(new Date(cobranza.fecha_venta), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <span className="text-white font-medium">
                              {cobranza.clientes?.nombre} {cobranza.clientes?.apellido || ""}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300 max-w-[200px] truncate">
                          {cobranza.descripcion}
                        </TableCell>
                        <TableCell className="text-right text-white font-medium">
                          {formatCurrency(cobranza.monto_con_interes || cobranza.monto_total)}
                        </TableCell>
                        <TableCell>
                          {cobranza.tipo_pago === "contado" ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <Banknote className="h-3 w-3 mr-1" />
                              Contado
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {cobranza.cuotasPagadas}/{cobranza.num_cuotas} cuotas
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {cobranza.proximaCuota ? (
                            <div className={`text-sm ${cobranza.diasVencido ? "text-red-400" : cobranza.diasParaProxima! <= 3 ? "text-amber-400" : "text-slate-300"}`}>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(cobranza.proximaCuota.fecha_vencimiento), "dd/MM/yy")}
                              </div>
                              <span className="text-xs">
                                {cobranza.diasVencido 
                                  ? `Hace ${cobranza.diasVencido} dias` 
                                  : cobranza.diasParaProxima === 0 
                                    ? "Hoy" 
                                    : `En ${cobranza.diasParaProxima} dias`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {cobranza.tipo_pago === "cuotas" && cobranza.montoAdeudado ? (
                            <span className={`font-medium ${cobranza.montoAdeudado > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                              {formatCurrency(cobranza.montoAdeudado)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {renderEstadoBadge(cobranza)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {cobranza.tipo_pago === "cuotas" && cobranza.estado !== "completada" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerPagos(cobranza)}
                                className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(cobranza)}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(cobranza.id)}
                              className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vista Calendario */}
        <TabsContent value="calendario" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-cyan-400" />
                  Calendario de Cobros
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMesCalendario(subMonths(mesCalendario, 1))}
                    className="h-8 w-8"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-white font-medium min-w-[150px] text-center">
                    {format(mesCalendario, "MMMM yyyy", { locale: es })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMesCalendario(addMonths(mesCalendario, 1))}
                    className="h-8 w-8"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Cabecera dias de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map((dia) => (
                  <div key={dia} className="text-center text-sm font-medium text-slate-400 py-2">
                    {dia}
                  </div>
                ))}
              </div>
              
              {/* Dias del mes */}
              <div className="grid grid-cols-7 gap-1">
                {diasDelMes.map((dia) => {
                  const cuotasDelDia = cuotasDelMes.filter(c => 
                    isSameDay(parseISO(c.fecha_vencimiento), dia)
                  )
                  const esDelMes = dia.getMonth() === mesCalendario.getMonth()
                  const esHoy = isToday(dia)
                  
                  return (
                    <div
                      key={dia.toISOString()}
                      className={`min-h-[80px] p-1 rounded-lg border ${
                        esHoy 
                          ? "border-cyan-500 bg-cyan-950/30" 
                          : esDelMes 
                            ? "border-slate-700 bg-slate-800/30" 
                            : "border-slate-800 bg-slate-900/30"
                      }`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        esHoy ? "text-cyan-400" : esDelMes ? "text-slate-300" : "text-slate-600"
                      }`}>
                        {format(dia, "d")}
                      </div>
                      <div className="space-y-1">
                        {cuotasDelDia.slice(0, 2).map((cuota) => {
                          const cobranza = cobranzas.find(c => c.id === cuota.venta_id)
                          const esVencida = isBefore(parseISO(cuota.fecha_vencimiento), new Date())
                          
                          return (
                            <div
                              key={cuota.id}
                              className={`text-xs p-1 rounded truncate cursor-pointer ${
                                esVencida
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                              onClick={() => cobranza && handleVerPagos(cobranza)}
                              title={`${cobranza?.clientes?.nombre || ""} - Cuota ${cuota.numero_cuota}`}
                            >
                              {cobranza?.clientes?.nombre?.slice(0, 8)}
                            </div>
                          )
                        })}
                        {cuotasDelDia.length > 2 && (
                          <div className="text-xs text-slate-500 text-center">
                            +{cuotasDelDia.length - 2} mas
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Leyenda */}
              <div className="flex gap-4 mt-4 justify-center">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                  <span className="text-slate-400">Vencida</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
                  <span className="text-slate-400">Pendiente</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Pagos/Cuotas */}
      <Dialog open={isPagosDialogOpen} onOpenChange={setIsPagosDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-cyan-400" />
              Detalle de Cuotas
            </DialogTitle>
            {selectedCobranza && (
              <DialogDescription className="text-slate-400">
                {selectedCobranza.clientes?.nombre} {selectedCobranza.clientes?.apellido || ""} - {selectedCobranza.descripcion}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedCobranza && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <p className="text-xs text-slate-400">Total</p>
                  <p className="text-lg font-bold text-white">
                    {formatCurrency(selectedCobranza.monto_con_interes || selectedCobranza.monto_total)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/50">
                  <p className="text-xs text-emerald-400">Pagado</p>
                  <p className="text-lg font-bold text-emerald-300">
                    {formatCurrency(
                      (selectedCobranza.monto_con_interes || selectedCobranza.monto_total) - (selectedCobranza.montoAdeudado || 0)
                    )}
                  </p>
                </div>
                <div className="p-3 bg-amber-950/30 rounded-lg border border-amber-800/50">
                  <p className="text-xs text-amber-400">Pendiente</p>
                  <p className="text-lg font-bold text-amber-300">
                    {formatCurrency(selectedCobranza.montoAdeudado || 0)}
                  </p>
                </div>
              </div>

              {/* Lista de cuotas */}
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {pagos.map((pago) => {
                    const esVencida = pago.estado === "pendiente" && isBefore(parseISO(pago.fecha_vencimiento), new Date())
                    
                    return (
                      <div
                        key={pago.id}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          pago.estado === "pagada"
                            ? "bg-emerald-950/20 border-emerald-800/50"
                            : esVencida
                              ? "bg-red-950/20 border-red-800/50"
                              : "bg-slate-800/50 border-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            pago.estado === "pagada"
                              ? "bg-emerald-500/20"
                              : esVencida
                                ? "bg-red-500/20"
                                : "bg-slate-700"
                          }`}>
                            {pago.estado === "pagada" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            ) : esVencida ? (
                              <AlertCircle className="h-5 w-5 text-red-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className={`font-medium ${
                              pago.estado === "pagada" ? "text-emerald-300" : esVencida ? "text-red-300" : "text-white"
                            }`}>
                              Cuota {pago.numero_cuota}
                            </p>
                            <p className="text-sm text-slate-400">
                              Vence: {format(parseISO(pago.fecha_vencimiento), "dd/MM/yyyy")}
                              {pago.fecha_pago && ` - Pagado: ${format(parseISO(pago.fecha_pago), "dd/MM/yyyy")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${
                            pago.estado === "pagada" ? "text-emerald-400" : "text-white"
                          }`}>
                            {formatCurrency(pago.monto_pagado || selectedCobranza.monto_cuota || 0)}
                          </span>
                          {pago.estado !== "pagada" && (
                            <Button
                              size="sm"
                              onClick={() => handleRegistrarPago(pago.id, pago.numero_cuota)}
                              className="bg-cyan-600 hover:bg-cyan-700"
                            >
                              Registrar Pago
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Acciones */}
              {pagos.some(p => p.estado !== "pagada") && (
                <div className="flex justify-between items-center pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-400">
                    {pagos.filter(p => p.estado !== "pagada").length} cuota(s) pendiente(s)
                  </p>
                  <Button
                    onClick={handlePagarTodas}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Pagar Todas las Pendientes
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
