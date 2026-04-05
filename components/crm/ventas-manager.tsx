"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
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
  ShoppingCart, 
  Trash2,
  Edit2,
  DollarSign,
  Eye,
  TrendingUp,
  Package,
  AlertTriangle
} from "lucide-react"
import { format } from "date-fns"
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
  stock: number
  unidad: string
}

interface Venta {
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
  fecha_venta: string
  fecha_inicio_cuotas: string | null
  estado: "pendiente" | "en_curso" | "completada" | "cancelada"
  notas: string | null
  created_at: string
  clientes?: Cliente
  inventario?: Producto
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

const TIPOS_PAGO = [
  { value: "contado", label: "Contado" },
  { value: "cuotas", label: "Cuotas" },
]

export function VentasManager({ perfilId }: { perfilId: string }) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
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
    monto_inicial: "",
    num_cuotas: "",
    monto_cuota: "",
    fecha_venta: format(new Date(), "yyyy-MM-dd"),
    fecha_inicio_cuotas: "",
    notas: "",
  })

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)

  useEffect(() => {
    fetchData()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    // Fetch productos del inventario compartido
    const { data: productosData } = await supabase
      .from("inventario")
      .select("id, nombre, precio_costo, precio_venta, stock, unidad")
      .eq("user_id", user.id)
      .eq("activo", true)
      .order("nombre")

    setProductos(productosData || [])

    // Fetch ventas con relaciones
    const { data: ventasData, error } = await supabase
      .from("crm_ventas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido),
        inventario:producto_id (id, nombre, precio_costo, precio_venta, stock, unidad)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha_venta", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas",
        variant: "destructive",
      })
    } else {
      setVentas(ventasData || [])
    }
    setIsLoading(false)
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
      num_cuotas: "",
      monto_cuota: "",
      fecha_venta: format(new Date(), "yyyy-MM-dd"),
      fecha_inicio_cuotas: "",
      notas: "",
    })
    setSelectedProducto(null)
    setEditingVenta(null)
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
    setFormData({ ...formData, cantidad: cantidadStr })
    
    if (selectedProducto) {
      const montoTotal = selectedProducto.precio_venta * cantidad
      setFormData(prev => ({
        ...prev,
        cantidad: cantidadStr,
        monto_total: montoTotal.toString(),
      }))
    }
  }

  const calcularMontoCuota = () => {
    const total = parseFloat(formData.monto_total) || 0
    const inicial = parseFloat(formData.monto_inicial) || 0
    const numCuotas = parseInt(formData.num_cuotas) || 1
    const restante = total - inicial
    return restante > 0 ? (restante / numCuotas).toFixed(0) : "0"
  }

  const calcularGanancia = () => {
    if (!selectedProducto) return 0
    const cantidad = parseInt(formData.cantidad) || 1
    const ganancia = (selectedProducto.precio_venta - selectedProducto.precio_costo) * cantidad
    return ganancia
  }

  const handleOpenDialog = (venta?: Venta) => {
    if (venta) {
      setEditingVenta(venta)
      const producto = productos.find(p => p.id === venta.producto_id)
      setSelectedProducto(producto || null)
      setFormData({
        cliente_id: venta.cliente_id,
        producto_id: venta.producto_id || "",
        cantidad: venta.cantidad?.toString() || "1",
        descripcion: venta.descripcion,
        tipo_pago: venta.tipo_pago,
        monto_total: venta.monto_total.toString(),
        monto_inicial: venta.monto_inicial?.toString() || "",
        num_cuotas: venta.num_cuotas?.toString() || "",
        monto_cuota: venta.monto_cuota?.toString() || "",
        fecha_venta: venta.fecha_venta,
        fecha_inicio_cuotas: venta.fecha_inicio_cuotas || "",
        notas: venta.notas || "",
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Validar stock si hay producto seleccionado
    if (selectedProducto && !editingVenta) {
      const cantidad = parseInt(formData.cantidad) || 1
      if (cantidad > selectedProducto.stock) {
        toast({
          title: "Stock insuficiente",
          description: `Solo hay ${selectedProducto.stock} ${selectedProducto.unidad}(s) disponibles`,
          variant: "destructive",
        })
        return
      }
    }

    const ventaData = {
      user_id: user.id,
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
      monto_cuota: formData.tipo_pago === "cuotas" ? parseFloat(formData.monto_cuota || calcularMontoCuota()) : null,
      fecha_venta: formData.fecha_venta,
      fecha_inicio_cuotas: formData.tipo_pago === "cuotas" ? formData.fecha_inicio_cuotas : null,
      estado: formData.tipo_pago === "contado" ? "completada" : "en_curso",
      notas: formData.notas || null,
    }

    if (editingVenta) {
      const { error } = await supabase
        .from("crm_ventas")
        .update({ ...ventaData, updated_at: new Date().toISOString() })
        .eq("id", editingVenta.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la venta",
          variant: "destructive",
        })
      } else {
        toast({ title: "Venta actualizada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { data: nuevaVenta, error } = await supabase
        .from("crm_ventas")
        .insert([ventaData])
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la venta",
          variant: "destructive",
        })
      } else {
        // El trigger automaticamente descuenta el stock

        // Si es a cuotas, crear los registros de pagos
        if (formData.tipo_pago === "cuotas" && nuevaVenta) {
          const numCuotas = parseInt(formData.num_cuotas)
          const montoCuota = parseFloat(formData.monto_cuota || calcularMontoCuota())
          const fechaInicio = new Date(formData.fecha_inicio_cuotas)

          const pagosData = Array.from({ length: numCuotas }, (_, i) => {
            const fechaVenc = new Date(fechaInicio)
            fechaVenc.setMonth(fechaVenc.getMonth() + i)
            return {
              user_id: user.id,
              venta_id: nuevaVenta.id,
              numero_cuota: i + 1,
              monto_pagado: null,
              fecha_vencimiento: format(fechaVenc, "yyyy-MM-dd"),
              fecha_pago: null,
              estado: "pendiente",
            }
          })

          await supabase.from("crm_pagos_cuotas").insert(pagosData)
        }

        toast({ title: "Venta registrada correctamente" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleVerPagos = async (venta: Venta) => {
    setSelectedVenta(venta)
    const { data } = await supabase
      .from("crm_pagos_cuotas")
      .select("*")
      .eq("venta_id", venta.id)
      .order("numero_cuota")

    setPagos(data || [])
    setIsPagosDialogOpen(true)
  }

  const handleRegistrarPago = async (pagoId: string) => {
    const { error } = await supabase
      .from("crm_pagos_cuotas")
      .update({
        estado: "pagada",
        fecha_pago: format(new Date(), "yyyy-MM-dd"),
        monto_pagado: selectedVenta?.monto_cuota,
      })
      .eq("id", pagoId)

    if (!error) {
      handleVerPagos(selectedVenta!)
      
      const { data: pagosRestantes } = await supabase
        .from("crm_pagos_cuotas")
        .select("id")
        .eq("venta_id", selectedVenta!.id)
        .eq("estado", "pendiente")

      if (pagosRestantes?.length === 0) {
        await supabase
          .from("crm_ventas")
          .update({ estado: "completada" })
          .eq("id", selectedVenta!.id)
        fetchData()
      }

      toast({ title: "Pago registrado" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estas seguro de eliminar esta venta? El stock se restaurara automaticamente.")) return
    
    await supabase.from("crm_pagos_cuotas").delete().eq("venta_id", id)
    
    const { error } = await supabase
      .from("crm_ventas")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta",
        variant: "destructive",
      })
    } else {
      toast({ title: "Venta eliminada y stock restaurado" })
      fetchData()
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Calcular estadisticas
  const totalVentas = ventas.reduce((acc, v) => acc + v.monto_total, 0)
  const ventasCompletadas = ventas.filter((v) => v.estado === "completada")
  const totalCompletado = ventasCompletadas.reduce((acc, v) => acc + v.monto_total, 0)
  
  // Ganancia total (solo para ventas con producto vinculado)
  const gananciaTotal = ventas.reduce((acc, v) => {
    if (v.producto_id && v.cantidad && v.precio_costo) {
      const precioVentaUnitario = v.monto_total / v.cantidad
      return acc + ((precioVentaUnitario - v.precio_costo) * v.cantidad)
    }
    return acc
  }, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadisticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ventas</CardDescription>
            <CardTitle className="text-2xl">{ventas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monto Total</CardDescription>
            <CardTitle className="text-xl text-blue-600">
              {formatCurrency(totalVentas)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-2xl text-cyan-600">
              {ventasCompletadas.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cobrado</CardDescription>
            <CardTitle className="text-xl text-emerald-600">
              {formatCurrency(totalCompletado)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-green-50 dark:bg-green-950">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Ganancia Total
            </CardDescription>
            <CardTitle className="text-xl text-green-600">
              {formatCurrency(gananciaTotal)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Ventas
              </CardTitle>
              <CardDescription>
                Registra ventas vinculadas al inventario con descuento automatico de stock
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingVenta ? "Editar Venta" : "Nueva Venta"}
                  </DialogTitle>
                  <DialogDescription>
                    Registra una venta con pago al contado o en cuotas
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value })
                      }
                    >
                      <SelectTrigger>
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

                  {/* Seleccion de Producto */}
                  <div className="space-y-2">
                    <Label htmlFor="producto">Producto del Inventario</Label>
                    <Select
                      value={formData.producto_id}
                      onValueChange={handleProductoChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto (opcional)..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin producto vinculado</SelectItem>
                        {productos.map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={p.stock === 0}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{p.nombre}</span>
                              <span className="text-xs text-muted-foreground">
                                Stock: {p.stock} | {formatCurrency(p.precio_venta)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedProducto && (
                    <div className="bg-cyan-50 dark:bg-cyan-950 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Producto seleccionado</span>
                        <Badge variant={selectedProducto.stock > 0 ? "default" : "destructive"}>
                          Stock: {selectedProducto.stock} {selectedProducto.unidad}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Precio costo:</span>
                          <span className="ml-2">{formatCurrency(selectedProducto.precio_costo)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Precio venta:</span>
                          <span className="ml-2 font-medium">{formatCurrency(selectedProducto.precio_venta)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 pt-2 border-t">
                        <Label htmlFor="cantidad">Cantidad</Label>
                        <Input
                          id="cantidad"
                          type="number"
                          min="1"
                          max={selectedProducto.stock}
                          value={formData.cantidad}
                          onChange={(e) => handleCantidadChange(e.target.value)}
                        />
                        {parseInt(formData.cantidad) > selectedProducto.stock && (
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

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripcion *</Label>
                    <Input
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) =>
                        setFormData({ ...formData, descripcion: e.target.value })
                      }
                      placeholder="Ej: Kit de productos, Plan de negocio..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo_pago">Tipo de pago</Label>
                      <Select
                        value={formData.tipo_pago}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo_pago: value as "contado" | "cuotas" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_PAGO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                  </div>

                  {formData.tipo_pago === "cuotas" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monto_inicial">Monto Inicial (Entrega)</Label>
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
                          <Label htmlFor="num_cuotas">Numero de Cuotas</Label>
                          <Input
                            id="num_cuotas"
                            type="number"
                            min="1"
                            value={formData.num_cuotas}
                            onChange={(e) =>
                              setFormData({ ...formData, num_cuotas: e.target.value })
                            }
                            placeholder="Ej: 3"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monto_cuota">Monto por Cuota</Label>
                          <Input
                            id="monto_cuota"
                            type="number"
                            step="1"
                            value={formData.monto_cuota || calcularMontoCuota()}
                            onChange={(e) =>
                              setFormData({ ...formData, monto_cuota: e.target.value })
                            }
                            placeholder="Calculado automaticamente"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha_inicio_cuotas">Inicio de Cuotas</Label>
                          <Input
                            id="fecha_inicio_cuotas"
                            type="date"
                            value={formData.fecha_inicio_cuotas}
                            onChange={(e) =>
                              setFormData({ ...formData, fecha_inicio_cuotas: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      {formData.monto_total && formData.num_cuotas && (
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-1">Resumen del Plan:</p>
                          <p>Entrega: {formatCurrency(parseFloat(formData.monto_inicial || "0"))}</p>
                          <p>{formData.num_cuotas} cuotas de {formatCurrency(parseFloat(calcularMontoCuota()))}</p>
                        </div>
                      )}
                    </>
                  )}

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

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
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
                      {editingVenta ? "Guardar Cambios" : "Registrar Venta"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay ventas registradas</h3>
              <p className="text-muted-foreground">Registra tu primera venta</p>
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
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => {
                    const ganancia = venta.producto_id && venta.cantidad && venta.precio_costo
                      ? (venta.monto_total / venta.cantidad - venta.precio_costo) * venta.cantidad
                      : null

                    return (
                      <TableRow key={venta.id}>
                        <TableCell>
                          {format(new Date(venta.fecha_venta), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {venta.clientes?.nombre} {venta.clientes?.apellido}
                        </TableCell>
                        <TableCell>
                          {venta.inventario ? (
                            <div className="flex items-center gap-1">
                              <Package className="h-3 w-3 text-cyan-600" />
                              <span className="text-sm">{venta.inventario.nombre}</span>
                              {venta.cantidad && venta.cantidad > 1 && (
                                <Badge variant="outline" className="ml-1">x{venta.cantidad}</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {venta.descripcion}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(venta.monto_total)}
                        </TableCell>
                        <TableCell className="text-right">
                          {ganancia !== null ? (
                            <span className="text-green-600 font-medium">
                              {formatCurrency(ganancia)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={venta.tipo_pago === "contado" ? "default" : "secondary"}>
                            {venta.tipo_pago === "contado" ? "Contado" : `${venta.num_cuotas} cuotas`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              venta.estado === "completada"
                                ? "default"
                                : venta.estado === "cancelada"
                                ? "destructive"
                                : "secondary"
                            }
                            className={venta.estado === "completada" ? "bg-green-500" : ""}
                          >
                            {venta.estado === "completada" ? "Completada" :
                             venta.estado === "en_curso" ? "En curso" :
                             venta.estado === "cancelada" ? "Cancelada" : "Pendiente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {venta.tipo_pago === "cuotas" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerPagos(venta)}
                                title="Ver cuotas"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(venta)}
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(venta.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
              {selectedVenta?.clientes?.nombre} - {selectedVenta?.descripcion}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedVenta?.monto_total || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Cuota:</span>
                <span className="ml-2 font-medium">{formatCurrency(selectedVenta?.monto_cuota || 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
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
                      onClick={() => handleRegistrarPago(pago.id)}
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
