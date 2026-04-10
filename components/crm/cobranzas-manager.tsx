"use client"

import { useState, useEffect, useCallback } from "react"
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
  Calculator
} from "lucide-react"
import { format, addDays } from "date-fns"
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
  estado: "pendiente" | "en_curso" | "completada" | "cancelada"
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

export function CobranzasManager({ 
  perfilId, 
  perfilEmpresarialId,
  userId 
}: { 
  perfilId: string
  perfilEmpresarialId: string | null
  userId: string
}) {
  const [cobranzas, setCobranzas] = useState<Cobranza[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCobranza, setEditingCobranza] = useState<Cobranza | null>(null)
  const [selectedCobranza, setSelectedCobranza] = useState<Cobranza | null>(null)
  const [pagos, setPagos] = useState<PagoCuota[]>([])
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    producto_id: "",
    cantidad: "1",
    descripcion: "",
    tipo_pago: "contado" as "contado" | "cuotas",
    monto_total: "",
    // Campos de financiamiento
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
    } else {
      setCobranzas(cobranzasData || [])
    }
    setIsLoading(false)
  }, [userId, perfilId, supabase, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  // Calcular monto con interes
  const calcularMontoConInteres = () => {
    const total = parseFloat(formData.monto_total) || 0
    const interes = parseFloat(formData.interes_porcentaje) || 0
    return total + (total * interes / 100)
  }

  // Calcular monto por cuota
  const calcularMontoCuota = () => {
    const montoConInteres = calcularMontoConInteres()
    const inicial = parseFloat(formData.monto_inicial) || 0
    let numCuotas = parseInt(formData.num_cuotas) || 1
    
    // Si el pago inicial cuenta como cuota #1, restamos una cuota
    if (formData.pago_inicial_es_cuota && inicial > 0) {
      numCuotas = Math.max(1, numCuotas - 1)
    }
    
    const restante = montoConInteres - inicial
    return restante > 0 ? Math.ceil(restante / numCuotas) : 0
  }

  // Calcular total de cuotas restantes (sin contar pago inicial como cuota)
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

  // Registrar ingreso en perfil empresarial
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
    
    console.log("[v0] handleSubmit iniciado")
    console.log("[v0] formData:", JSON.stringify(formData, null, 2))
    console.log("[v0] tipo_pago:", formData.tipo_pago)

    // Validar cliente
    if (!formData.cliente_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      })
      return
    }

    // Validar stock si hay producto seleccionado
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

    // Validar campos requeridos para modo financiado
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

    console.log("[v0] Pasó todas las validaciones")
    console.log("[v0] montoConInteres:", montoConInteres)
    console.log("[v0] montoCuota:", montoCuota)
    console.log("[v0] cuotasRestantes:", cuotasRestantes)

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
      estado: formData.tipo_pago === "contado" ? "completada" : "pendiente",
      notas: formData.notas || null,
    }
    
    console.log("[v0] cobranzaData a insertar:", JSON.stringify(cobranzaData, null, 2))

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
      console.log("[v0] Iniciando insert en crm_ventas...")
      
      const { data: nuevaCobranza, error } = await supabase
        .from("crm_ventas")
        .insert([cobranzaData])
        .select()
        .single()

      console.log("[v0] Resultado insert - data:", nuevaCobranza)
      console.log("[v0] Resultado insert - error:", error)

      if (error) {
        console.error("[v0] Error completo:", JSON.stringify(error, null, 2))
        toast({
          title: "Error",
          description: "No se pudo crear la cobranza: " + error.message,
          variant: "destructive",
        })
      } else {
        // Descontar stock del inventario
        if (formData.producto_id && selectedProducto) {
          const cantidadVendida = parseInt(formData.cantidad) || 1
          await supabase
            .from("inventario")
            .update({ 
              stock_actual: selectedProducto.stock_actual - cantidadVendida 
            })
            .eq("id", formData.producto_id)
        }

        // Registrar ingreso en Empresarial
        if (formData.tipo_pago === "contado") {
          // Pago contado: registrar todo el monto
          await registrarIngresoEmpresarial(
            parseFloat(formData.monto_total),
            formData.descripcion,
            formData.fecha_venta,
            nuevaCobranza.id
          )
        } else {
          // Pago financiado: registrar pago inicial si existe
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

          // Crear registros de cuotas
          const fechaInicio = new Date(formData.fecha_inicio_cuotas)
          const frecuenciaDias = parseInt(formData.frecuencia_dias) || 30
          
          // Si el pago inicial cuenta como cuota 1, empezamos desde cuota 2
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

          // Si hay pago inicial y cuenta como cuota 1, agregarlo como pagada
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

  const handleVerPagos = async (cobranza: Cobranza) => {
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
      // Registrar ingreso en Empresarial
      await registrarIngresoEmpresarial(
        montoPago,
        selectedCobranza.descripcion,
        format(new Date(), "yyyy-MM-dd"),
        selectedCobranza.id,
        true,
        numeroCuota
      )

      // Verificar si todas las cuotas estan pagadas
      const { data: cuotasPendientes } = await supabase
        .from("crm_pagos_cuotas")
        .select("id")
        .eq("venta_id", selectedCobranza.id)
        .eq("estado", "pendiente")

      // Si solo queda 1 (la que acabamos de pagar), actualizar estado de cobranza
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

    const cuotasPendientes = pagos.filter(p => p.estado === "pendiente")
    
    for (const cuota of cuotasPendientes) {
      await supabase
        .from("crm_pagos_cuotas")
        .update({
          estado: "pagada",
          fecha_pago: format(new Date(), "yyyy-MM-dd"),
          monto_pagado: selectedCobranza.monto_cuota,
        })
        .eq("id", cuota.id)

      // Registrar cada cuota como ingreso
      await registrarIngresoEmpresarial(
        selectedCobranza.monto_cuota || 0,
        selectedCobranza.descripcion,
        format(new Date(), "yyyy-MM-dd"),
        selectedCobranza.id,
        true,
        cuota.numero_cuota
      )
    }

    // Marcar cobranza como completada
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

    // Primero eliminar los pagos asociados
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

  // Metricas
  const totalCobranzas = cobranzas.length
  const totalRecaudado = cobranzas
    .filter(c => c.estado === "completada")
    .reduce((sum, c) => sum + c.monto_total, 0)
  const pendienteCobrar = cobranzas
    .filter(c => c.estado === "pendiente")
    .reduce((sum, c) => {
      const inicial = c.monto_inicial || 0
      return sum + ((c.monto_con_interes || c.monto_total) - inicial)
    }, 0)
  const enCurso = cobranzas.filter(c => c.estado === "pendiente").length

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900">
                <Wallet className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cobranzas</p>
                <p className="text-2xl font-bold">{totalCobranzas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recaudado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRecaudado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendiente</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendienteCobrar)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En Cuotas</p>
                <p className="text-2xl font-bold">{enCurso}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Cobranzas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-cyan-600" />
              Cobranzas
            </CardTitle>
            <CardDescription>Gestiona tus ventas y planes de pago</CardDescription>
          </div>
          <div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Cobranza
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCobranza ? "Editar Cobranza" : "Nueva Cobranza"}
                  </DialogTitle>
                  <DialogDescription>
                    Registra una venta con opcion de pago contado o financiado
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Cliente */}
                  <div className="space-y-2">
                    <Label htmlFor="cliente_id">Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre} {cliente.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Producto del inventario (opcional) */}
                  <div className="space-y-2">
                    <Label htmlFor="producto_id">Producto (opcional)</Label>
                    <Select
                      value={formData.producto_id || "none"}
                      onValueChange={(value) => handleProductoChange(value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un producto o deja vacio" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin producto</SelectItem>
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {p.nombre} - {formatCurrency(p.precio_venta)}
                              <Badge variant="outline" className="ml-2">
                                Stock: {p.stock_actual}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Info del producto seleccionado */}
                  {selectedProducto && (
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Precio unitario:</span>
                        <span className="font-medium">{formatCurrency(selectedProducto.precio_venta)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cantidad">Cantidad</Label>
                        <Input
                          id="cantidad"
                          type="number"
                          min="1"
                          max={selectedProducto.stock_actual}
                          value={formData.cantidad}
                          onChange={(e) => handleCantidadChange(e.target.value)}
                        />
                        {parseInt(formData.cantidad) > selectedProducto.stock_actual && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Stock insuficiente
                          </p>
                        )}
                      </div>

                      <div className="bg-green-100 dark:bg-green-900 p-2 rounded text-sm">
                        <div className="flex justify-between">
                          <span>Ganancia estimada:</span>
                          <span className="font-bold text-green-700 dark:text-green-300">
                            {formatCurrency(calcularGanancia())}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Descripcion */}
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripcion *</Label>
                    <Input
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) =>
                        setFormData({ ...formData, descripcion: e.target.value })
                      }
                      placeholder="Ej: Kit de productos, Servicio de consultoria..."
                      required
                    />
                  </div>

                  {/* Monto Total */}
                  <div className="space-y-2">
                    <Label htmlFor="monto_total">Monto Total *</Label>
                    <Input
                      id="monto_total"
                      type="number"
                      step="1"
                      value={formData.monto_total}
                      onChange={(e) =>
                        setFormData({ ...formData, monto_total: e.target.value })
                      }
                      placeholder="0"
                      required
                    />
                  </div>

                  {/* Tipo de Pago - Checks */}
                  <div className="space-y-3">
                    <Label>Forma de Pago *</Label>
                    <div className="flex gap-4">
                      <div 
                        className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.tipo_pago === "contado" 
                            ? "border-green-500 bg-green-50 dark:bg-green-950" 
                            : "border-muted hover:border-green-300"
                        }`}
                        onClick={() => setFormData({ ...formData, tipo_pago: "contado" })}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.tipo_pago === "contado" ? "border-green-500 bg-green-500" : "border-muted-foreground"
                          }`}>
                            {formData.tipo_pago === "contado" && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-green-600" />
                            <span className="font-medium">Contado</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-8">Pago completo al momento</p>
                      </div>

                      <div 
                        className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          formData.tipo_pago === "cuotas" 
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950" 
                            : "border-muted hover:border-blue-300"
                        }`}
                        onClick={() => setFormData({ ...formData, tipo_pago: "cuotas" })}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            formData.tipo_pago === "cuotas" ? "border-blue-500 bg-blue-500" : "border-muted-foreground"
                          }`}>
                            {formData.tipo_pago === "cuotas" && (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                            <span className="font-medium">Financiado</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-8">Pago en cuotas</p>
                      </div>
                    </div>
                  </div>

                  {/* Opciones de Financiamiento */}
                  {formData.tipo_pago === "cuotas" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                      <h4 className="font-medium flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Configuracion del Plan de Pago
                      </h4>

                      {/* Pago Inicial */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monto_inicial">Pago Inicial (opcional)</Label>
                          <Input
                            id="monto_inicial"
                            type="number"
                            step="1"
                            value={formData.monto_inicial}
                            onChange={(e) =>
                              setFormData({ ...formData, monto_inicial: e.target.value })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="num_cuotas">Cantidad de Cuotas *</Label>
                          <Input
                            id="num_cuotas"
                            type="number"
                            min="1"
                            value={formData.num_cuotas}
                            onChange={(e) =>
                              setFormData({ ...formData, num_cuotas: e.target.value })
                            }
                            placeholder="Ej: 3"
                            required={formData.tipo_pago === "cuotas"}
                          />
                        </div>
                      </div>

                      {/* Opcion: Pago inicial cuenta como cuota */}
                      {parseFloat(formData.monto_inicial) > 0 && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pago_inicial_es_cuota"
                            checked={formData.pago_inicial_es_cuota}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, pago_inicial_es_cuota: checked as boolean })
                            }
                          />
                          <label
                            htmlFor="pago_inicial_es_cuota"
                            className="text-sm cursor-pointer"
                          >
                            El pago inicial cuenta como cuota #1
                          </label>
                        </div>
                      )}

                      {/* Interes y Frecuencia */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="interes_porcentaje" className="flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Interes (opcional)
                          </Label>
                          <Input
                            id="interes_porcentaje"
                            type="number"
                            step="0.1"
                            min="0"
                            value={formData.interes_porcentaje}
                            onChange={(e) =>
                              setFormData({ ...formData, interes_porcentaje: e.target.value })
                            }
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="frecuencia_dias" className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Frecuencia (dias)
                          </Label>
                          <Select
                            value={formData.frecuencia_dias}
                            onValueChange={(v) => setFormData({ ...formData, frecuencia_dias: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">Cada 7 dias (semanal)</SelectItem>
                              <SelectItem value="15">Cada 15 dias (quincenal)</SelectItem>
                              <SelectItem value="30">Cada 30 dias (mensual)</SelectItem>
                              <SelectItem value="60">Cada 60 dias (bimestral)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Fecha inicio cuotas */}
                      <div className="space-y-2">
                        <Label htmlFor="fecha_inicio_cuotas">Fecha Primera Cuota</Label>
                        <Input
                          id="fecha_inicio_cuotas"
                          type="date"
                          value={formData.fecha_inicio_cuotas}
                          onChange={(e) =>
                            setFormData({ ...formData, fecha_inicio_cuotas: e.target.value })
                          }
                        />
                      </div>

{/* Resumen del Plan */}
  {formData.monto_total && formData.num_cuotas && (
  <div className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/50 dark:to-teal-950/50 rounded-lg border border-cyan-200 dark:border-cyan-800 text-sm space-y-3">
  <p className="font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-2">
    <Calculator className="h-4 w-4" />
    Resumen del Plan:
  </p>
  <div className="grid grid-cols-2 gap-3 text-sm">
  <div className="flex justify-between">
  <span className="text-gray-600 dark:text-gray-300">Monto base:</span>
  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(parseFloat(formData.monto_total))}</span>
  </div>
  {parseFloat(formData.interes_porcentaje) > 0 && (
  <div className="flex justify-between">
  <span className="text-amber-600 dark:text-amber-400">+ Interes ({formData.interes_porcentaje}%):</span>
  <span className="font-medium text-amber-700 dark:text-amber-300">{formatCurrency(calcularMontoConInteres() - parseFloat(formData.monto_total))}</span>
  </div>
  )}
  <div className="flex justify-between">
  <span className="text-gray-600 dark:text-gray-300">Total a pagar:</span>
  <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(calcularMontoConInteres())}</span>
  </div>
  {parseFloat(formData.monto_inicial) > 0 && (
  <div className="flex justify-between">
  <span className="text-gray-600 dark:text-gray-300">Pago inicial:</span>
  <span className="font-medium text-blue-600 dark:text-blue-400">{formatCurrency(parseFloat(formData.monto_inicial))}</span>
  </div>
  )}
  </div>
  <div className="border-t border-cyan-200 dark:border-cyan-700 pt-3 mt-3">
  <p className="font-bold text-lg text-cyan-800 dark:text-cyan-200">
  {calcularCuotasRestantes()} cuota(s) de {formatCurrency(calcularMontoCuota())}
  </p>
  <p className="text-xs text-cyan-600 dark:text-cyan-400">
  Cada {formData.frecuencia_dias} dias desde {format(new Date(formData.fecha_inicio_cuotas || new Date()), "dd/MM/yyyy")}
  </p>
  </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fecha de Venta */}
                  <div className="space-y-2">
                    <Label htmlFor="fecha_venta">Fecha de Venta</Label>
                    <Input
                      id="fecha_venta"
                      type="date"
                      value={formData.fecha_venta}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_venta: e.target.value })
                      }
                    />
                  </div>

                  {/* Notas */}
                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas (opcional)</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) =>
                        setFormData({ ...formData, notas: e.target.value })
                      }
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
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
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                      {editingCobranza ? "Guardar Cambios" : "Registrar Cobranza"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {cobranzas.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay cobranzas registradas</h3>
              <p className="text-muted-foreground">Registra tu primera cobranza</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobranzas.map((cobranza) => (
                    <TableRow key={cobranza.id}>
                      <TableCell>
                        {format(new Date(cobranza.fecha_venta), "dd/MM/yyyy", { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {cobranza.clientes?.nombre} {cobranza.clientes?.apellido}
                      </TableCell>
                      <TableCell>
                        {cobranza.producto_id ? (
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3 text-cyan-600" />
                            <span className="text-sm">{cobranza.descripcion}</span>
                            {cobranza.cantidad && cobranza.cantidad > 1 && (
                              <Badge variant="outline" className="ml-1">x{cobranza.cantidad}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {cobranza.descripcion}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(cobranza.monto_con_interes || cobranza.monto_total)}
                        {cobranza.interes_porcentaje && cobranza.interes_porcentaje > 0 && (
                          <span className="text-xs text-muted-foreground block">
                            +{cobranza.interes_porcentaje}% int.
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={cobranza.tipo_pago === "contado" ? "default" : "secondary"}>
                          {cobranza.tipo_pago === "contado" ? (
                            <span className="flex items-center gap-1">
                              <Banknote className="h-3 w-3" /> Contado
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" /> {cobranza.num_cuotas} cuotas
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cobranza.estado === "completada"
                              ? "default"
                              : cobranza.estado === "cancelada"
                              ? "destructive"
                              : "secondary"
                          }
                          className={cobranza.estado === "completada" ? "bg-green-500" : ""}
                        >
                          {cobranza.estado === "completada" ? "Completada" :
                           cobranza.estado === "pendiente" ? "En curso" :
                           cobranza.estado === "cancelada" ? "Cancelada" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {cobranza.tipo_pago === "cuotas" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleVerPagos(cobranza)}
                              title="Ver cuotas"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(cobranza)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(cobranza.id)}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Pagos/Cuotas */}
      <Dialog open={isPagosDialogOpen} onOpenChange={setIsPagosDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Control de Cuotas</DialogTitle>
            <DialogDescription>
              {selectedCobranza?.clientes?.nombre} - {selectedCobranza?.descripcion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedCobranza?.monto_con_interes || selectedCobranza?.monto_total || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cuota:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedCobranza?.monto_cuota || 0)}</span>
              </div>
            </div>

            {/* Boton pagar todas */}
            {pagos.some(p => p.estado === "pendiente") && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handlePagarTodas}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Pagar Todas las Cuotas Pendientes
              </Button>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pagos.map((pago) => (
                <div
                  key={pago.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    pago.estado === "pagada" ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium">Cuota {pago.numero_cuota}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {format(new Date(pago.fecha_vencimiento), "dd/MM/yyyy")}
                    </p>
                    {pago.fecha_pago && (
                      <p className="text-xs text-green-600">
                        Pagada: {format(new Date(pago.fecha_pago), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  {pago.estado === "pendiente" ? (
                    <Button
                      size="sm"
                      onClick={() => handleRegistrarPago(pago.id, pago.numero_cuota)}
                    >
                      Registrar Pago
                    </Button>
                  ) : (
                    <Badge variant="default" className="bg-green-500">
                      Pagada
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
