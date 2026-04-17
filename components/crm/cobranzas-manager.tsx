"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { 
  Plus, 
  Trash2,
  DollarSign,
  Package,
  AlertTriangle,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  ArrowLeft,
  User,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  MapPin,
  FileText,
  Receipt,
  TrendingUp
} from "lucide-react"
import { format, differenceInDays, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
  email: string | null
  empresa: string | null
  ciudad: string | null
  direccion: string | null
}

interface Producto {
  id: string
  nombre: string
  precio_costo: number
  precio_venta: number
  stock_actual: number
  unidad_medida: string
}

interface Cuota {
  id: string
  user_id: string
  venta_id: string
  numero_cuota: number
  monto_pagado: number | null
  fecha_pago: string | null
  fecha_vencimiento: string
  estado: string
  notas: string | null
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

interface ClienteConDeuda {
  cliente: Cliente
  cobranzas: Cobranza[]
  cuotas: Cuota[]
  totalFacturado: number
  totalCobrado: number
  totalPendiente: number
  porcentajeRecuperado: number
  diasVencido: number
  proximaCuota: Cuota | null
}

interface CobranzasManagerProps {
  userId: string
  perfilId: string
  perfilEmpresarialId?: string | null
}

export default function CobranzasManager({ userId, perfilId, perfilEmpresarialId }: CobranzasManagerProps) {
  const supabase = createClient()
  const { toast } = useToast()

  // Estados principales
  const [cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [cuotas, setCuotas] = useState<Cuota[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  // Vista actual
  const [vistaActual, setVistaActual] = useState<"cartera" | "detalle">("cartera")
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteConDeuda | null>(null)

  // Filtros cartera
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "vencido" | "al_dia" | "completado">("todos")
  const [ordenarPor, setOrdenarPor] = useState<"nombre" | "monto" | "dias_vencido">("dias_vencido")

  // Dialogs
  const [dialogNuevaCobranza, setDialogNuevaCobranza] = useState(false)
  const [dialogRegistrarPago, setDialogRegistrarPago] = useState(false)
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<Cuota | null>(null)
  
  // Cobranza expandida para ver detalle de cuotas
  const [cobranzaExpandida, setCobranzaExpandida] = useState<string | null>(null)

  // Form nueva cobranza
  const [formCobranza, setFormCobranza] = useState({
    cliente_id: "",
    producto_id: "",
    cantidad: "1",
    descripcion: "",
    tipo_pago: "contado" as "contado" | "cuotas",
    monto_total: "",
    monto_inicial: "",
    num_cuotas: "1",
    interes_porcentaje: "0",
    frecuencia_dias: "30",
    fecha_venta: format(new Date(), "yyyy-MM-dd"),
    fecha_inicio_cuotas: format(new Date(), "yyyy-MM-dd"),
    notas: ""
  })

  // Form pago
  const [formPago, setFormPago] = useState({
    monto: "",
    descripcion: "",
    metodo_pago: "efectivo"
  })

  const [submitting, setSubmitting] = useState(false)

  // Obtener cuotas de una cobranza (existentes o generadas)
  const getCuotasDeCobranza = (cobranza: Cobranza): Array<{
    numero: number
    monto: number
    fechaVencimiento: Date
    estado: "pagada" | "pendiente" | "vencida"
    fechaPago: Date | null
    cuotaId: string | null
  }> => {
    if (cobranza.tipo_pago === "contado") {
      return [{
        numero: 1,
        monto: cobranza.monto_total,
        fechaVencimiento: parseISO(cobranza.fecha_venta),
        estado: cobranza.estado === "completada" ? "pagada" : "pendiente",
        fechaPago: cobranza.estado === "completada" ? parseISO(cobranza.fecha_venta) : null,
        cuotaId: null
      }]
    }

    const numCuotas = cobranza.num_cuotas || 1
    const montoCuota = cobranza.monto_cuota || (cobranza.monto_con_interes || cobranza.monto_total) / numCuotas
    const fechaInicio = cobranza.fecha_inicio_cuotas ? parseISO(cobranza.fecha_inicio_cuotas) : parseISO(cobranza.fecha_venta)
    const frecuenciaDias = cobranza.frecuencia_dias || 30
    
    // Obtener cuotas existentes de la DB
    const cuotasDB = cuotas.filter(c => c.venta_id === cobranza.id)
    
    const resultado = []
    for (let i = 1; i <= numCuotas; i++) {
      const fechaVencimiento = new Date(fechaInicio)
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (frecuenciaDias * (i - 1)))
      
      const cuotaDB = cuotasDB.find(c => c.numero_cuota === i)
      const hoy = new Date()
      
      let estado: "pagada" | "pendiente" | "vencida" = "pendiente"
      if (cuotaDB?.estado === "pagada") {
        estado = "pagada"
      } else if (fechaVencimiento < hoy) {
        estado = "vencida"
      }
      
      resultado.push({
        numero: i,
        monto: montoCuota,
        fechaVencimiento,
        estado,
        fechaPago: cuotaDB?.fecha_pago ? parseISO(cuotaDB.fecha_pago) : null,
        cuotaId: cuotaDB?.id || null
      })
    }
    
    return resultado
  }

  // Formatear moneda en guaranies
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Obtener iniciales del cliente
  const getInitials = (nombre: string, apellido: string | null) => {
    const first = nombre?.charAt(0) || ""
    const last = apellido?.charAt(0) || nombre?.charAt(1) || ""
    return (first + last).toUpperCase()
  }

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cobranzasRes, cuotasRes, clientesRes, productosRes] = await Promise.all([
        supabase
          .from("crm_ventas")
          .select("*, clientes(*)")
          .eq("perfil_id", perfilId)
          .order("fecha_venta", { ascending: false }),
        supabase
          .from("crm_pagos_cuotas")
          .select("*")
          .eq("user_id", userId),
        supabase
          .from("clientes")
          .select("*")
          .eq("user_id", userId)
          .order("nombre"),
        supabase
          .from("inventario")
          .select("*")
          .eq("perfil_id", perfilId)
          .eq("activo", true)
      ])

      if (cobranzasRes.data) setCobranzas(cobranzasRes.data)
      if (cuotasRes.data) setCuotas(cuotasRes.data)
      if (clientesRes.data) setClientes(clientesRes.data)
      if (productosRes.data) setProductos(productosRes.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }, [supabase, perfilId, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Agrupar cobranzas por cliente
  const clientesConDeuda = useMemo(() => {
    const clienteMap = new Map<string, ClienteConDeuda>()

    cobranzas.forEach(cobranza => {
      const clienteId = cobranza.cliente_id
      const cliente = cobranza.clientes || clientes.find(c => c.id === clienteId)
      
      if (!cliente) return

      const cuotasCobranza = cuotas.filter(c => c.venta_id === cobranza.id)
      const montoTotal = cobranza.monto_con_interes || cobranza.monto_total
      
      // Calcular cobrado
      let cobrado = 0
      if (cobranza.tipo_pago === "contado" && cobranza.estado === "completada") {
        cobrado = montoTotal
      } else {
        cobrado = cuotasCobranza
          .filter(c => c.estado === "pagada")
          .reduce((sum, c) => sum + (c.monto_pagado || 0), 0)
        if (cobranza.monto_inicial) {
          cobrado += cobranza.monto_inicial
        }
      }

      const pendiente = montoTotal - cobrado
      
      // Calcular dias vencido
      let diasVencido = 0
      const cuotasPendientes = cuotasCobranza.filter(c => c.estado !== "pagada")
      if (cuotasPendientes.length > 0) {
        const cuotaMasAntigua = cuotasPendientes.sort((a, b) => 
          new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
        )[0]
        const diff = differenceInDays(new Date(), parseISO(cuotaMasAntigua.fecha_vencimiento))
        if (diff > 0) diasVencido = diff
      }

      if (clienteMap.has(clienteId)) {
        const existing = clienteMap.get(clienteId)!
        existing.cobranzas.push(cobranza)
        existing.cuotas.push(...cuotasCobranza)
        existing.totalFacturado += montoTotal
        existing.totalCobrado += cobrado
        existing.totalPendiente += pendiente
        existing.diasVencido = Math.max(existing.diasVencido, diasVencido)
      } else {
        clienteMap.set(clienteId, {
          cliente: cliente as Cliente,
          cobranzas: [cobranza],
          cuotas: cuotasCobranza,
          totalFacturado: montoTotal,
          totalCobrado: cobrado,
          totalPendiente: pendiente,
          porcentajeRecuperado: 0,
          diasVencido,
          proximaCuota: null
        })
      }
    })

    // Calcular porcentaje y proxima cuota
    clienteMap.forEach(cliente => {
      cliente.porcentajeRecuperado = cliente.totalFacturado > 0 
        ? Math.round((cliente.totalCobrado / cliente.totalFacturado) * 100) 
        : 0
      
      const cuotasPendientes = cliente.cuotas
        .filter(c => c.estado !== "pagada")
        .sort((a, b) => new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime())
      
      cliente.proximaCuota = cuotasPendientes[0] || null
    })

    return Array.from(clienteMap.values())
  }, [cobranzas, cuotas, clientes])

  // Filtrar y ordenar clientes
  const clientesFiltrados = useMemo(() => {
    let filtered = clientesConDeuda.filter(c => {
      const matchSearch = 
        c.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cliente.apellido?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.cliente.empresa?.toLowerCase().includes(searchTerm.toLowerCase()))
      
      let matchEstado = true
      if (filtroEstado === "vencido") matchEstado = c.diasVencido > 0
      else if (filtroEstado === "al_dia") matchEstado = c.diasVencido === 0 && c.totalPendiente > 0
      else if (filtroEstado === "completado") matchEstado = c.totalPendiente === 0

      return matchSearch && matchEstado
    })

    // Ordenar
    filtered.sort((a, b) => {
      if (ordenarPor === "nombre") {
        return a.cliente.nombre.localeCompare(b.cliente.nombre)
      } else if (ordenarPor === "monto") {
        return b.totalPendiente - a.totalPendiente
      } else {
        return b.diasVencido - a.diasVencido
      }
    })

    return filtered
  }, [clientesConDeuda, searchTerm, filtroEstado, ordenarPor])

  // Metricas generales
  const metricas = useMemo(() => {
    const totalClientes = clientesConDeuda.length
    const totalFacturado = clientesConDeuda.reduce((sum, c) => sum + c.totalFacturado, 0)
    const totalCobrado = clientesConDeuda.reduce((sum, c) => sum + c.totalCobrado, 0)
    const totalPendiente = clientesConDeuda.reduce((sum, c) => sum + c.totalPendiente, 0)
    const clientesVencidos = clientesConDeuda.filter(c => c.diasVencido > 0).length

    return { totalClientes, totalFacturado, totalCobrado, totalPendiente, clientesVencidos }
  }, [clientesConDeuda])

  // Handlers
  const handleVerCliente = (cliente: ClienteConDeuda) => {
    setClienteSeleccionado(cliente)
    setVistaActual("detalle")
  }

  const handleVolverCartera = () => {
    setVistaActual("cartera")
    setClienteSeleccionado(null)
  }

  const handleAbrirRegistrarPago = (cuota: Cuota) => {
    setCuotaSeleccionada(cuota)
    setFormPago({
      monto: cuota.monto_pagado?.toString() || "",
      descripcion: `Cuota ${cuota.numero_cuota}`,
      metodo_pago: "efectivo"
    })
    setDialogRegistrarPago(true)
  }

  const handleRegistrarPago = async () => {
    if (!cuotaSeleccionada || !formPago.monto) return
    setSubmitting(true)

    try {
      const monto = parseFloat(formPago.monto)
      const esCuotaTemporal = cuotaSeleccionada.id.startsWith("temp-")
      
      if (esCuotaTemporal) {
        // Crear nueva cuota en la DB
        const { error: cuotaError } = await supabase
          .from("crm_pagos_cuotas")
          .insert({
            user_id: userId,
            venta_id: cuotaSeleccionada.venta_id,
            numero_cuota: cuotaSeleccionada.numero_cuota,
            monto_pagado: monto,
            fecha_pago: format(new Date(), "yyyy-MM-dd"),
            fecha_vencimiento: cuotaSeleccionada.fecha_vencimiento,
            estado: "pagada",
            notas: formPago.descripcion
          })
        
        if (cuotaError) throw cuotaError
      } else {
        // Actualizar cuota existente
        const { error: cuotaError } = await supabase
          .from("crm_pagos_cuotas")
          .update({
            monto_pagado: monto,
            fecha_pago: format(new Date(), "yyyy-MM-dd"),
            estado: "pagada",
            notas: formPago.descripcion
          })
          .eq("id", cuotaSeleccionada.id)

        if (cuotaError) throw cuotaError
      }

      // Registrar ingreso en empresarial
      if (perfilEmpresarialId) {
        await supabase.from("ingresos").insert({
          user_id: userId,
          perfil_id: perfilEmpresarialId,
          monto: monto,
          tipo_ingreso: `Cobranza CRM: ${formPago.descripcion}`,
          fecha: format(new Date(), "yyyy-MM-dd")
        })
      }

      // Verificar si todas las cuotas estan pagadas
      const cobranza = clienteSeleccionado?.cobranzas.find(c => 
        clienteSeleccionado.cuotas.some(q => q.venta_id === c.id && q.id === cuotaSeleccionada.id)
      )
      
      if (cobranza) {
        const cuotasCobranza = cuotas.filter(c => c.venta_id === cobranza.id)
        const todasPagadas = cuotasCobranza.every(c => 
          c.id === cuotaSeleccionada.id || c.estado === "pagada"
        )
        
        if (todasPagadas) {
          await supabase
            .from("crm_ventas")
            .update({ estado: "completada" })
            .eq("id", cobranza.id)
        }
      }

      toast({
        title: "Pago registrado",
        description: `Se registró el pago de ${formatCurrency(monto)}`,
      })

      setDialogRegistrarPago(false)
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCrearCobranza = async () => {
    if (!formCobranza.cliente_id || !formCobranza.monto_total) return
    setSubmitting(true)

    try {
      const montoTotal = parseFloat(formCobranza.monto_total)
      const interes = parseFloat(formCobranza.interes_porcentaje) || 0
      const montoConInteres = montoTotal + (montoTotal * interes / 100)
      const montoInicial = parseFloat(formCobranza.monto_inicial) || 0
      const numCuotas = parseInt(formCobranza.num_cuotas) || 1
      
      let montoCuota = 0
      let cuotasReales = numCuotas
      
      if (formCobranza.tipo_pago === "cuotas") {
        const montoRestante = montoConInteres - montoInicial
        montoCuota = montoRestante / numCuotas
      }

      const selectedProducto = productos.find(p => p.id === formCobranza.producto_id)

      const cobranzaData = {
        user_id: userId,
        perfil_id: perfilId,
        cliente_id: formCobranza.cliente_id,
        producto_id: formCobranza.producto_id || null,
        cantidad: formCobranza.producto_id ? parseInt(formCobranza.cantidad) || 1 : null,
        precio_costo: selectedProducto?.precio_costo || null,
        descripcion: formCobranza.descripcion || "Cobranza",
        tipo_pago: formCobranza.tipo_pago,
        monto_total: montoTotal,
        monto_inicial: formCobranza.tipo_pago === "cuotas" ? montoInicial : null,
        num_cuotas: formCobranza.tipo_pago === "cuotas" ? numCuotas : null,
        monto_cuota: formCobranza.tipo_pago === "cuotas" ? montoCuota : null,
        interes_porcentaje: formCobranza.tipo_pago === "cuotas" ? interes : null,
        monto_con_interes: formCobranza.tipo_pago === "cuotas" ? montoConInteres : null,
        frecuencia_dias: formCobranza.tipo_pago === "cuotas" ? parseInt(formCobranza.frecuencia_dias) : null,
        fecha_venta: formCobranza.fecha_venta,
        fecha_inicio_cuotas: formCobranza.tipo_pago === "cuotas" ? formCobranza.fecha_inicio_cuotas : null,
        estado: formCobranza.tipo_pago === "contado" ? "completada" : "activa",
        notas: formCobranza.notas || null
      }

      const { data: nuevaCobranza, error } = await supabase
        .from("crm_ventas")
        .insert([cobranzaData])
        .select()
        .single()

      if (error) throw error

      // Crear cuotas si es financiado
      if (formCobranza.tipo_pago === "cuotas" && nuevaCobranza) {
        const cuotasData = []
        let fechaBase = parseISO(formCobranza.fecha_inicio_cuotas)
        const frecuencia = parseInt(formCobranza.frecuencia_dias) || 30

        for (let i = 1; i <= numCuotas; i++) {
          cuotasData.push({
            user_id: userId,
            venta_id: nuevaCobranza.id,
            numero_cuota: i,
            monto_pagado: null,
            fecha_pago: null,
            fecha_vencimiento: format(fechaBase, "yyyy-MM-dd"),
            estado: "pendiente",
            notas: null
          })
          fechaBase = new Date(fechaBase.getTime() + frecuencia * 24 * 60 * 60 * 1000)
        }

        await supabase.from("crm_pagos_cuotas").insert(cuotasData)
      }

      // Registrar ingreso si es contado
      if (formCobranza.tipo_pago === "contado" && perfilEmpresarialId) {
        await supabase.from("ingresos").insert({
          user_id: userId,
          perfil_id: perfilEmpresarialId,
          monto: montoTotal,
          tipo_ingreso: `Venta CRM: ${formCobranza.descripcion || "Contado"}`,
          fecha: formCobranza.fecha_venta
        })
      }

      // Descontar inventario
      if (formCobranza.producto_id && selectedProducto) {
        const cantidad = parseInt(formCobranza.cantidad) || 1
        await supabase
          .from("inventario")
          .update({ stock_actual: selectedProducto.stock_actual - cantidad })
          .eq("id", formCobranza.producto_id)
      }

      toast({
        title: "Cobranza creada",
        description: "La cobranza se registró correctamente"
      })

      setDialogNuevaCobranza(false)
      setFormCobranza({
        cliente_id: "",
        producto_id: "",
        cantidad: "1",
        descripcion: "",
        tipo_pago: "contado",
        monto_total: "",
        monto_inicial: "",
        num_cuotas: "1",
        interes_porcentaje: "0",
        frecuencia_dias: "30",
        fecha_venta: format(new Date(), "yyyy-MM-dd"),
        fecha_inicio_cuotas: format(new Date(), "yyyy-MM-dd"),
        notas: ""
      })
      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // ==================== VISTA DETALLE DEL CLIENTE ====================
  if (vistaActual === "detalle" && clienteSeleccionado) {
    const cliente = clienteSeleccionado.cliente
    const cuotasCliente = clienteSeleccionado.cuotas.sort((a, b) => a.numero_cuota - b.numero_cuota)

    return (
      <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen p-6 -m-6">
        {/* Header con navegacion */}
        <button 
          onClick={handleVolverCartera}
          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </button>

        {/* Info del cliente */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold text-xl">
              {getInitials(cliente.nombre, cliente.apellido)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {cliente.nombre} {cliente.apellido || ""}
                </h1>
                {clienteSeleccionado.diasVencido > 0 ? (
                  <>
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0">
                      Vencido
                    </Badge>
                    <Badge variant="outline" className="text-slate-500">
                      {clienteSeleccionado.diasVencido} dias vencido
                    </Badge>
                  </>
                ) : clienteSeleccionado.totalPendiente > 0 ? (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0">
                    Al dia
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                    Completado
                  </Badge>
                )}
              </div>
              {cliente.empresa && (
                <p className="text-slate-500 dark:text-slate-400">{cliente.empresa}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cliente.telefono && (
              <Button variant="outline" size="icon" className="rounded-full">
                <Phone className="h-4 w-4" />
              </Button>
            )}
            {cliente.email && (
              <Button variant="outline" size="icon" className="rounded-full">
                <Mail className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="icon" className="rounded-full">
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => setDialogNuevaCobranza(true)}
            >
              <Plus className="h-4 w-4" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Metricas del cliente */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(clienteSeleccionado.totalFacturado)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Total Facturado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(clienteSeleccionado.totalCobrado)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Cobrado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                  <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(clienteSeleccionado.totalPendiente)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Pendiente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {clienteSeleccionado.porcentajeRecuperado}%
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">% Recuperado</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de progreso */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progreso de Cobro</span>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {clienteSeleccionado.porcentajeRecuperado}%
              </span>
            </div>
            <Progress 
              value={clienteSeleccionado.porcentajeRecuperado} 
              className="h-2 bg-slate-200 dark:bg-slate-700"
            />
          </CardContent>
        </Card>

        {/* Tabs de informacion */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <Tabs defaultValue="informacion" className="w-full">
            <TabsList className="w-full justify-start border-b border-slate-200 dark:border-slate-700 rounded-none bg-transparent p-0">
              <TabsTrigger 
                value="informacion"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                Informacion
              </TabsTrigger>
              <TabsTrigger 
                value="pagos"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                Pagos ({cuotasCliente.length})
              </TabsTrigger>
              <TabsTrigger 
                value="cobranzas"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3"
              >
                Cobranzas ({clienteSeleccionado.cobranzas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="informacion" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Nombre Completo</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {cliente.nombre} {cliente.apellido || ""}
                    </p>
                  </div>
                </div>

                {cliente.empresa && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Empresa</p>
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.empresa}</p>
                    </div>
                  </div>
                )}

                {cliente.telefono && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Telefono</p>
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.telefono}</p>
                    </div>
                  </div>
                )}

                {cliente.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.email}</p>
                    </div>
                  </div>
                )}

                {cliente.ciudad && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Ciudad</p>
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.ciudad}</p>
                    </div>
                  </div>
                )}

                {cliente.direccion && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Direccion</p>
                      <p className="font-medium text-slate-900 dark:text-white">{cliente.direccion}</p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="pagos" className="p-6">
              {(() => {
                // Obtener todos los pagos realizados del cliente
                const pagosRealizados = cuotasCliente
                  .filter(c => c.estado === "pagada" && c.fecha_pago)
                  .map(cuota => {
                    const cobranza = clienteSeleccionado.cobranzas.find(c => c.id === cuota.venta_id)
                    const fechaVencimiento = parseISO(cuota.fecha_vencimiento)
                    const fechaPago = parseISO(cuota.fecha_pago!)
                    const diasDiferencia = differenceInDays(fechaPago, fechaVencimiento)
                    
                    return {
                      ...cuota,
                      cobranza,
                      fechaPago,
                      fechaVencimiento,
                      diasDiferencia,
                      puntual: diasDiferencia <= 0
                    }
                  })
                  .sort((a, b) => b.fechaPago.getTime() - a.fechaPago.getTime())
                
                // Calcular métricas de puntualidad
                const totalPagos = pagosRealizados.length
                const pagosPuntuales = pagosRealizados.filter(p => p.puntual).length
                const porcentajePuntualidad = totalPagos > 0 ? Math.round((pagosPuntuales / totalPagos) * 100) : 0
                const promedioDiasRetraso = totalPagos > 0 
                  ? Math.round(pagosRealizados.reduce((acc, p) => acc + Math.max(0, p.diasDiferencia), 0) / totalPagos)
                  : 0
                const totalPagado = pagosRealizados.reduce((acc, p) => acc + (p.monto_pagado || 0), 0)
                
                // Obtener método de pago más usado (si existe en notas)
                const getMetodoPago = (notas: string | null) => {
                  if (!notas) return "No especificado"
                  const metodos = ["efectivo", "transferencia", "tarjeta", "cheque"]
                  for (const m of metodos) {
                    if (notas.toLowerCase().includes(m)) {
                      return m.charAt(0).toUpperCase() + m.slice(1)
                    }
                  }
                  return "Efectivo"
                }

                return (
                  <div className="space-y-6">
                    {/* Métricas de puntualidad */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Total Pagos</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalPagos}</p>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Total Pagado</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPagado)}</p>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${porcentajePuntualidad >= 70 ? "bg-green-100 dark:bg-green-900/30" : porcentajePuntualidad >= 40 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                            <TrendingUp className={`h-4 w-4 ${porcentajePuntualidad >= 70 ? "text-green-600 dark:text-green-400" : porcentajePuntualidad >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`} />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Puntualidad</span>
                        </div>
                        <p className={`text-2xl font-bold ${porcentajePuntualidad >= 70 ? "text-green-600 dark:text-green-400" : porcentajePuntualidad >= 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                          {porcentajePuntualidad}%
                        </p>
                      </div>
                      
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`p-1.5 rounded-lg ${promedioDiasRetraso === 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                            <Clock className={`h-4 w-4 ${promedioDiasRetraso === 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`} />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">Prom. Retraso</span>
                        </div>
                        <p className={`text-2xl font-bold ${promedioDiasRetraso === 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {promedioDiasRetraso} dias
                        </p>
                      </div>
                    </div>
                    
                    {/* Historial de pagos */}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-slate-400" />
                        Historial de Pagos
                      </h4>
                      
                      {pagosRealizados.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-700 w-fit mx-auto mb-4">
                            <Receipt className="h-8 w-8 text-slate-400" />
                          </div>
                          <p className="text-slate-500 dark:text-slate-400">No hay pagos registrados</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Los pagos apareceran aqui cuando se registren</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pagosRealizados.map((pago, index) => (
                            <div 
                              key={pago.id}
                              className="flex items-center justify-between p-4 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                {/* Indicador de puntualidad */}
                                <div className={`p-2.5 rounded-xl ${
                                  pago.puntual 
                                    ? "bg-green-100 dark:bg-green-900/30" 
                                    : "bg-amber-100 dark:bg-amber-900/30"
                                }`}>
                                  {pago.puntual ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                  )}
                                </div>
                                
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-900 dark:text-white">
                                      {formatCurrency(pago.monto_pagado || 0)}
                                    </p>
                                    <Badge className={`text-xs ${
                                      pago.puntual 
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" 
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                                    }`}>
                                      {pago.puntual ? "Puntual" : `${pago.diasDiferencia}d tarde`}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Cuota {pago.numero_cuota} - {pago.cobranza?.descripcion || "Sin descripcion"}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 dark:text-slate-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {format(pago.fechaPago, "dd MMM yyyy", { locale: es })}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <CreditCard className="h-3 w-3" />
                                      {getMetodoPago(pago.notas)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  Vencia: {format(pago.fechaVencimiento, "dd/MM/yyyy")}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </TabsContent>

            <TabsContent value="cobranzas" className="p-6">
              <div className="space-y-4">
                {clienteSeleccionado.cobranzas.map((cobranza) => {
                  const cuotasCobranza = getCuotasDeCobranza(cobranza)
                  const cuotasPagadas = cuotasCobranza.filter(c => c.estado === "pagada").length
                  const cuotasVencidas = cuotasCobranza.filter(c => c.estado === "vencida").length
                  const totalCuotas = cuotasCobranza.length
                  const progreso = (cuotasPagadas / totalCuotas) * 100
                  const isExpandida = cobranzaExpandida === cobranza.id
                  
                  return (
                    <div 
                      key={cobranza.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
                    >
                      {/* Header de la cobranza - clickeable */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        onClick={() => setCobranzaExpandida(isExpandida ? null : cobranza.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${
                              cobranza.estado === "completada" 
                                ? "bg-green-100 dark:bg-green-900/30" 
                                : cuotasVencidas > 0
                                ? "bg-red-100 dark:bg-red-900/30"
                                : "bg-blue-100 dark:bg-blue-900/30"
                            }`}>
                              <Receipt className={`h-5 w-5 ${
                                cobranza.estado === "completada"
                                  ? "text-green-600 dark:text-green-400"
                                  : cuotasVencidas > 0
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-blue-600 dark:text-blue-400"
                              }`} />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {cobranza.descripcion}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {format(parseISO(cobranza.fecha_venta), "dd MMM yyyy", { locale: es })} 
                                {cobranza.tipo_pago === "cuotas" && ` - ${cobranza.num_cuotas} cuotas`}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {formatCurrency(cobranza.monto_con_interes || cobranza.monto_total)}
                              </p>
                              <div className="flex items-center gap-2 justify-end">
                                {cuotasVencidas > 0 && cobranza.estado !== "completada" && (
                                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-xs">
                                    {cuotasVencidas} vencida{cuotasVencidas > 1 ? "s" : ""}
                                  </Badge>
                                )}
                                <Badge className={
                                  cobranza.estado === "completada"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                                }>
                                  {cobranza.estado === "completada" ? "Completada" : `${cuotasPagadas}/${totalCuotas}`}
                                </Badge>
                              </div>
                            </div>
                            <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${isExpandida ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                        
                        {/* Barra de progreso */}
                        {cobranza.tipo_pago === "cuotas" && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                              <span>Progreso de cobro</span>
                              <span className={progreso === 100 ? "text-green-600 dark:text-green-400 font-medium" : ""}>
                                {Math.round(progreso)}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  progreso === 100 
                                    ? "bg-green-500" 
                                    : cuotasVencidas > 0 
                                    ? "bg-gradient-to-r from-green-500 via-amber-500 to-red-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Timeline de cuotas expandido */}
                      {isExpandida && (
                        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-4">
                          <div className="mb-4">
                            <h4 className="font-semibold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                              Plan de Pagos
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {cobranza.tipo_pago === "contado" 
                                ? "Pago unico" 
                                : `${totalCuotas} cuotas de ${formatCurrency(cobranza.monto_cuota || 0)} cada ${cobranza.frecuencia_dias || 30} dias`
                              }
                            </p>
                          </div>
                          
                          {/* Timeline visual */}
                          <div className="space-y-3">
                            {cuotasCobranza.map((cuota, index) => {
                              const diasDiferencia = differenceInDays(cuota.fechaVencimiento, new Date())
                              
                              return (
                                <div 
                                  key={index}
                                  className={`relative flex items-center gap-4 p-3 rounded-lg border transition-all ${
                                    cuota.estado === "pagada"
                                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                                      : cuota.estado === "vencida"
                                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                      : diasDiferencia <= 7 && diasDiferencia >= 0
                                      ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                                  }`}
                                >
                                  {/* Indicador de linea del timeline */}
                                  {index < cuotasCobranza.length - 1 && (
                                    <div className="absolute left-[26px] top-[48px] w-0.5 h-[calc(100%-24px)] bg-slate-200 dark:bg-slate-700" />
                                  )}
                                  
                                  {/* Icono de estado */}
                                  <div className={`relative z-10 p-2 rounded-full ${
                                    cuota.estado === "pagada"
                                      ? "bg-green-500"
                                      : cuota.estado === "vencida"
                                      ? "bg-red-500"
                                      : diasDiferencia <= 7 && diasDiferencia >= 0
                                      ? "bg-amber-500"
                                      : "bg-slate-300 dark:bg-slate-600"
                                  }`}>
                                    {cuota.estado === "pagada" ? (
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-white" />
                                    )}
                                  </div>
                                  
                                  {/* Info de la cuota */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        Cuota {cuota.numero}
                                      </span>
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(cuota.monto)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                      {cuota.estado === "pagada" && cuota.fechaPago
                                        ? `Pagado el ${format(cuota.fechaPago, "dd/MM/yyyy")}`
                                        : `Vence: ${format(cuota.fechaVencimiento, "dd/MM/yyyy")}`
                                      }
                                      {cuota.estado === "vencida" && (
                                        <span className="text-red-600 dark:text-red-400 font-medium ml-2">
                                          ({Math.abs(diasDiferencia)} dias vencido)
                                        </span>
                                      )}
                                      {cuota.estado === "pendiente" && diasDiferencia <= 7 && diasDiferencia >= 0 && (
                                        <span className="text-amber-600 dark:text-amber-400 font-medium ml-2">
                                          (Vence en {diasDiferencia} dias)
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  
                                  {/* Boton de accion */}
                                  {cuota.estado !== "pagada" && (
                                    <Button 
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Crear objeto cuota para el dialog
                                        const cuotaObj: Cuota = {
                                          id: cuota.cuotaId || `temp-${cobranza.id}-${cuota.numero}`,
                                          user_id: userId,
                                          venta_id: cobranza.id,
                                          numero_cuota: cuota.numero,
                                          monto_pagado: null,
                                          fecha_pago: null,
                                          fecha_vencimiento: format(cuota.fechaVencimiento, "yyyy-MM-dd"),
                                          estado: cuota.estado,
                                          notas: null
                                        }
                                        handleAbrirRegistrarPago(cuotaObj)
                                      }}
                                    >
                                      Registrar Pago
                                    </Button>
                                  )}
                                  
                                  {cuota.estado === "pagada" && (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                      Pagada
                                    </Badge>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          
                          {/* Resumen */}
                          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Total</p>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {formatCurrency(cobranza.monto_con_interes || cobranza.monto_total)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Cobrado</p>
                                <p className="font-bold text-green-600 dark:text-green-400">
                                  {formatCurrency(cuotasPagadas * (cobranza.monto_cuota || cobranza.monto_total))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">Pendiente</p>
                                <p className="font-bold text-red-600 dark:text-red-400">
                                  {formatCurrency((totalCuotas - cuotasPagadas) * (cobranza.monto_cuota || cobranza.monto_total))}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    )
  }

  // ==================== VISTA CARTERA DE CLIENTES ====================
  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen p-6 -m-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cartera de Clientes</h1>
        <p className="text-slate-500 dark:text-slate-400">{metricas.totalClientes} clientes</p>
      </div>

      {/* Metricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metricas.totalClientes}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Clientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(metricas.totalCobrado)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Recaudado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30">
                <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(metricas.totalPendiente)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pendiente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {metricas.clientesVencidos}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clientes Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
              />
            </div>

            <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
              <SelectTrigger className="w-full md:w-[180px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="al_dia">Al dia</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={ordenarPor} onValueChange={(v: any) => setOrdenarPor(v)}>
              <SelectTrigger className="w-full md:w-[180px] bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dias_vencido">Dias Vencido</SelectItem>
                <SelectItem value="monto">Monto Pendiente</SelectItem>
                <SelectItem value="nombre">Nombre</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => setDialogNuevaCobranza(true)}
            >
              <Plus className="h-4 w-4" />
              Nueva Cobranza
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de clientes */}
      <div className="space-y-4">
        {clientesFiltrados.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No hay clientes con cobranzas registradas
              </p>
            </CardContent>
          </Card>
        ) : (
          clientesFiltrados.map((clienteData) => {
            const { cliente, totalFacturado, totalCobrado, totalPendiente, porcentajeRecuperado, diasVencido } = clienteData
            
            return (
              <Card 
                key={cliente.id}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer"
                onClick={() => handleVerCliente(clienteData)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Info del cliente */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg ${
                        diasVencido > 0 
                          ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300"
                          : "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300"
                      }`}>
                        {getInitials(cliente.nombre, cliente.apellido)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {cliente.nombre} {cliente.apellido || ""}
                          </span>
                          {diasVencido > 0 && (
                            <>
                              <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0 text-xs">
                                Vencido
                              </Badge>
                              <span className="text-sm text-red-600 dark:text-red-400">
                                {diasVencido}d vencido
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {cliente.empresa || ""} {cliente.ciudad ? `- ${cliente.ciudad}` : ""}
                        </p>
                        
                        {/* Barra de progreso */}
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex-1">
                            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 dark:bg-blue-500 transition-all"
                                style={{ width: `${porcentajeRecuperado}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500 dark:text-slate-400">
                              Cobrado: <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(totalCobrado)}</span>
                            </span>
                            <span className="text-slate-500 dark:text-slate-400">
                              Pendiente: <span className="text-red-600 dark:text-red-400 font-medium">{formatCurrency(totalPendiente)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Monto y acciones */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {formatCurrency(totalFacturado)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {cliente.telefono && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`tel:${cliente.telefono}`)
                            }}
                          >
                            <Phone className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        {cliente.email && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`mailto:${cliente.email}`)
                            }}
                          >
                            <Mail className="h-4 w-4 text-slate-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MessageSquare className="h-4 w-4 text-slate-400" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Dialog Nueva Cobranza */}
      <Dialog open={dialogNuevaCobranza} onOpenChange={setDialogNuevaCobranza}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Cobranza</DialogTitle>
            <DialogDescription>
              Registra una nueva venta o cobranza
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select
                value={formCobranza.cliente_id}
                onValueChange={(v) => setFormCobranza({ ...formCobranza, cliente_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre} {c.apellido || ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Producto (opcional)</Label>
              <Select
                value={formCobranza.producto_id || "none"}
                onValueChange={(v) => {
                  const prod = productos.find(p => p.id === v)
                  setFormCobranza({ 
                    ...formCobranza, 
                    producto_id: v === "none" ? "" : v,
                    monto_total: prod ? prod.precio_venta.toString() : formCobranza.monto_total,
                    descripcion: prod ? prod.nombre : formCobranza.descripcion
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin producto</SelectItem>
                  {productos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} - {formatCurrency(p.precio_venta)} (Stock: {p.stock_actual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={formCobranza.descripcion}
                onChange={(e) => setFormCobranza({ ...formCobranza, descripcion: e.target.value })}
                placeholder="Descripcion de la venta"
              />
            </div>

            <div className="space-y-2">
              <Label>Monto Total (Gs.) *</Label>
              <Input
                type="number"
                value={formCobranza.monto_total}
                onChange={(e) => setFormCobranza({ ...formCobranza, monto_total: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Pago</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formCobranza.tipo_pago === "contado"}
                    onChange={() => setFormCobranza({ ...formCobranza, tipo_pago: "contado" })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Contado</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formCobranza.tipo_pago === "cuotas"}
                    onChange={() => setFormCobranza({ ...formCobranza, tipo_pago: "cuotas" })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>Financiado</span>
                </label>
              </div>
            </div>

            {formCobranza.tipo_pago === "cuotas" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pago Inicial (Gs.)</Label>
                    <Input
                      type="number"
                      value={formCobranza.monto_inicial}
                      onChange={(e) => setFormCobranza({ ...formCobranza, monto_inicial: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad de Cuotas</Label>
                    <Input
                      type="number"
                      value={formCobranza.num_cuotas}
                      onChange={(e) => setFormCobranza({ ...formCobranza, num_cuotas: e.target.value })}
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>% Interes</Label>
                    <Input
                      type="number"
                      value={formCobranza.interes_porcentaje}
                      onChange={(e) => setFormCobranza({ ...formCobranza, interes_porcentaje: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia (dias)</Label>
                    <Select
                      value={formCobranza.frecuencia_dias}
                      onValueChange={(v) => setFormCobranza({ ...formCobranza, frecuencia_dias: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Semanal (7 dias)</SelectItem>
                        <SelectItem value="15">Quincenal (15 dias)</SelectItem>
                        <SelectItem value="30">Mensual (30 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Primera Cuota</Label>
                  <Input
                    type="date"
                    value={formCobranza.fecha_inicio_cuotas}
                    onChange={(e) => setFormCobranza({ ...formCobranza, fecha_inicio_cuotas: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Fecha de Venta</Label>
              <Input
                type="date"
                value={formCobranza.fecha_venta}
                onChange={(e) => setFormCobranza({ ...formCobranza, fecha_venta: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDialogNuevaCobranza(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleCrearCobranza}
              disabled={submitting || !formCobranza.cliente_id || !formCobranza.monto_total}
            >
              {submitting ? "Guardando..." : "Guardar Cobranza"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Registrar Pago */}
      <Dialog open={dialogRegistrarPago} onOpenChange={setDialogRegistrarPago}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">
              Registrar Nuevo Pago
            </DialogTitle>
            {cuotaSeleccionada && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cuota {cuotaSeleccionada.numero_cuota} - Vence: {format(parseISO(cuotaSeleccionada.fecha_vencimiento), "dd/MM/yyyy")}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Monto (Gs.)</Label>
              <Input
                type="number"
                value={formPago.monto}
                onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                placeholder="0.00"
                className="text-lg h-12 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Descripcion</Label>
              <Input
                value={formPago.descripcion}
                onChange={(e) => setFormPago({ ...formPago, descripcion: e.target.value })}
                placeholder="Ej: Cuota abril"
                className="border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Metodo de Pago</Label>
              <Select
                value={formPago.metodo_pago}
                onValueChange={(v) => setFormPago({ ...formPago, metodo_pago: v })}
              >
                <SelectTrigger className="border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white gap-2 text-base font-medium"
            onClick={handleRegistrarPago}
            disabled={submitting || !formPago.monto}
          >
            <CheckCircle2 className="h-5 w-5" />
            {submitting ? "Registrando..." : "Confirmar Pago"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
