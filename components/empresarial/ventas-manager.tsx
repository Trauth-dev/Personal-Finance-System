"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, ShoppingCart, AlertTriangle, PackageX } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"

interface Venta {
  id: string
  producto_id: string | null
  cantidad: number
  precio_unitario: number
  total: number
  cliente_nombre: string | null
  fecha: string
  notas: string | null
  created_at: string
  ingreso_id: string | null
  estado_pago: string
  fecha_pago: string | null
  inventario?: {
    nombre: string
  }
}

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  stock_actual: number
  stock_minimo: number
}

export function VentasManager() {
  const { perfilActual } = usePerfil()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    producto_id: "",
    cantidad: "",
    precio_unitario: "",
    cliente_nombre: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    notas: "",
    estado_pago: "pagado",
  })

  useEffect(() => {
    if (perfilActual) {
      cargarDatos()
    }
  }, [perfilActual])

  const cargarDatos = async () => {
    if (!perfilActual) return

    const supabase = createClient()
    setIsLoading(true)

    try {
      // Cargar ventas
      const { data: ventasData, error: ventasError } = await supabase
        .from("ventas")
        .select(`
          *,
          inventario (
            nombre
          )
        `)
        .eq("perfil_id", perfilActual.id)
        .order("fecha", { ascending: false })

      if (ventasError) throw ventasError

      setVentas(ventasData || [])

      // Cargar productos
      const { data: productosData, error: productosError } = await supabase
        .from("inventario")
        .select("id, nombre, precio_venta, stock_actual, stock_minimo")
        .eq("perfil_id", perfilActual.id)
        .order("nombre", { ascending: true })

      if (productosError) throw productosError

      setProductos(productosData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProductoChange = (productoId: string) => {
    const producto = productos.find((p) => p.id === productoId)
    if (producto) {
      setFormData({
        ...formData,
        producto_id: productoId,
        precio_unitario: producto.precio_venta.toString(),
      })
    }
  }

  const calcularTotal = () => {
    const cantidad = Number.parseFloat(formData.cantidad) || 0
    const precioUnitario = Number.parseFloat(formData.precio_unitario) || 0
    return cantidad * precioUnitario
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual) {
      toast.error("No hay perfil activo")
      return
    }

    if (!formData.producto_id) {
      toast.error("Selecciona un producto")
      return
    }

    const cantidad = Number.parseFloat(formData.cantidad)
    if (!cantidad || cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    // Verificar stock disponible (solo en ventas nuevas: al editar, el stock ya se descontó)
    const producto = productos.find((p) => p.id === formData.producto_id)
    if (!editingVenta && producto && cantidad > producto.stock_actual) {
      toast.error(
        `Stock insuficiente de "${producto.nombre}". Disponible: ${producto.stock_actual}. Registrá una compra para reabastecer.`,
      )
      return
    }

    const supabase = createClient()

    try {
      const total = calcularTotal()
      // producto_nombre es NOT NULL en la tabla: lo tomamos del producto elegido.
      const productoNombre = producto?.nombre || "Producto"

      const dataToSave = {
        producto_id: formData.producto_id,
        producto_nombre: productoNombre,
        cantidad: cantidad,
        precio_unitario: Number.parseFloat(formData.precio_unitario),
        total: total,
        cliente_nombre: formData.cliente_nombre || null,
        fecha: formData.fecha,
        notas: formData.notas || null,
        estado_pago: formData.estado_pago,
        fecha_pago: formData.estado_pago === "pagado" ? formData.fecha : null,
      }

      if (editingVenta) {
        const { error } = await supabase.from("ventas").update(dataToSave).eq("id", editingVenta.id)

        if (error) throw error

        // Mantener sincronizado el ingreso vinculado (si existe)
        if (editingVenta.ingreso_id) {
          await supabase
            .from("ingresos")
            .update({
              tipo_ingreso: "Ventas",
              monto: total,
              fecha: formData.fecha,
            })
            .eq("id", editingVenta.ingreso_id)
        }

        toast.success("Venta actualizada exitosamente")
      } else {
        // 1) Crear el ingreso primero, para vincularlo a la venta
        const { data: ingresoData, error: ingresoError } = await supabase
          .from("ingresos")
          .insert({
            user_id: perfilActual.user_id,
            perfil_id: perfilActual.id,
            tipo_ingreso: "Ventas",
            monto: total,
            fecha: formData.fecha,
          })
          .select("id")
          .single()

        if (ingresoError) throw ingresoError

        // 2) Crear la venta vinculada al ingreso
        const { error } = await supabase.from("ventas").insert({
          ...dataToSave,
          perfil_id: perfilActual.id,
          ingreso_id: ingresoData?.id ?? null,
        })

        if (error) {
          // Revertir el ingreso si la venta falla, para no dejar ingresos huérfanos
          if (ingresoData?.id) {
            await supabase.from("ingresos").delete().eq("id", ingresoData.id)
          }
          throw error
        }

        // 3) Actualizar stock del producto
        if (producto) {
          const { error: stockError } = await supabase
            .from("inventario")
            .update({
              stock_actual: producto.stock_actual - cantidad,
            })
            .eq("id", formData.producto_id)

          if (stockError) throw stockError
        }

        toast.success("Venta registrada e ingreso generado")
      }

      setIsDialogOpen(false)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error("Error al guardar venta:", error)
      toast.error("Error al guardar venta")
    }
  }

  const handleEdit = (venta: Venta) => {
    setEditingVenta(venta)
    setFormData({
      producto_id: venta.producto_id || "",
      cantidad: venta.cantidad.toString(),
      precio_unitario: venta.precio_unitario.toString(),
      cliente_nombre: venta.cliente_nombre || "",
      fecha: venta.fecha,
      notas: venta.notas || "",
      estado_pago: venta.estado_pago || "pagado",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta venta? También se eliminará el ingreso asociado.")) return

    const supabase = createClient()

    try {
      const venta = ventas.find((v) => v.id === id)

      // Reponer el stock del producto vendido
      if (venta?.producto_id) {
        const producto = productos.find((p) => p.id === venta.producto_id)
        if (producto) {
          await supabase
            .from("inventario")
            .update({ stock_actual: producto.stock_actual + Number(venta.cantidad) })
            .eq("id", venta.producto_id)
        }
      }

      const { error } = await supabase.from("ventas").delete().eq("id", id)

      if (error) throw error

      // Eliminar el ingreso vinculado, para que las finanzas queden consistentes
      if (venta?.ingreso_id) {
        await supabase.from("ingresos").delete().eq("id", venta.ingreso_id)
      }

      toast.success("Venta e ingreso eliminados")
      cargarDatos()
    } catch (error) {
      console.error("Error al eliminar venta:", error)
      toast.error("Error al eliminar venta")
    }
  }

  const resetForm = () => {
    setFormData({
      producto_id: "",
      cantidad: "",
      precio_unitario: "",
      cliente_nombre: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      notas: "",
      estado_pago: "pagado",
    })
    setEditingVenta(null)
  }

  const filteredVentas = ventas.filter(
    (venta) =>
      venta.inventario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venta.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0)
  const ventasHoy = ventas.filter((v) => v.fecha === format(new Date(), "yyyy-MM-dd"))
  const totalVentasHoy = ventasHoy.reduce((sum, v) => sum + v.total, 0)

  // Estado de stock del producto seleccionado (para el aviso en el formulario)
  const productoSeleccionado = productos.find((p) => p.id === formData.producto_id)
  const cantidadNum = Number.parseFloat(formData.cantidad) || 0
  const stockDisponible = productoSeleccionado ? Number(productoSeleccionado.stock_actual) : 0
  const stockMinimo = productoSeleccionado ? Number(productoSeleccionado.stock_minimo) : 0
  // Al editar, el stock ya fue descontado, así que no recalculamos el remanente
  const stockInsuficiente = !editingVenta && !!productoSeleccionado && cantidadNum > stockDisponible
  const stockRestante = stockDisponible - cantidadNum
  const quedaBajoMinimo = !editingVenta && !!productoSeleccionado && !stockInsuficiente && stockRestante <= stockMinimo

  if (!perfilActual) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">Gs {totalVentas.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{ventas.length} transacciones</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">Gs {totalVentasHoy.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">{ventasHoy.length} transacciones</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Promedio por Venta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              Gs {ventas.length > 0 ? Math.round(totalVentas / ventas.length).toLocaleString() : "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de ventas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Registro de Ventas</CardTitle>
              <CardDescription>Historial de todas tus ventas</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVenta ? "Editar Venta" : "Nueva Venta"}</DialogTitle>
                  <DialogDescription>
                    {editingVenta ? "Actualiza la información de la venta" : "Registra una nueva venta"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="producto_id">Producto *</Label>
                      <Select value={formData.producto_id} onValueChange={handleProductoChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} value={producto.id}>
                              {producto.nombre} (Stock: {producto.stock_actual})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cantidad">Cantidad *</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        step="0.01"
                        value={formData.cantidad}
                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="precio_unitario">Precio Unitario *</Label>
                      <Input
                        id="precio_unitario"
                        type="number"
                        step="0.01"
                        value={formData.precio_unitario}
                        onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha *</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cliente_nombre">Cliente</Label>
                      <Input
                        id="cliente_nombre"
                        value={formData.cliente_nombre}
                        onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                        placeholder="Nombre del cliente (opcional)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="estado_pago">Estado de pago *</Label>
                      <Select
                        value={formData.estado_pago}
                        onValueChange={(value) => setFormData({ ...formData, estado_pago: value })}
                      >
                        <SelectTrigger id="estado_pago">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pagado">Cobrado (contado)</SelectItem>
                          <SelectItem value="pendiente">Pendiente (a crédito)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {productoSeleccionado && !editingVenta && (
                    <div className="space-y-2">
                      {stockInsuficiente ? (
                        <div className="flex items-start gap-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10">
                          <PackageX className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-red-600 dark:text-red-400">
                              Stock insuficiente: solo hay {stockDisponible} unidad(es) de{" "}
                              {productoSeleccionado.nombre}.
                            </p>
                            <p className="text-muted-foreground mt-0.5">
                              No podés vender {cantidadNum}. Reabastecé el producto para continuar.
                            </p>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="mt-2 h-7 border-red-500/40 bg-transparent"
                            >
                              <Link href="/dashboard/empresarial/compras">Registrar compra</Link>
                            </Button>
                          </div>
                        </div>
                      ) : quedaBajoMinimo ? (
                        <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-amber-600 dark:text-amber-400">
                              Después de esta venta quedarán {stockRestante} unidad(es), por debajo del mínimo (
                              {stockMinimo}).
                            </p>
                            <p className="text-muted-foreground mt-0.5">Considerá reabastecer pronto.</p>
                          </div>
                        </div>
                      ) : cantidadNum > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Stock disponible: {stockDisponible} · quedarán {stockRestante} tras la venta.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Stock disponible: {stockDisponible} unidad(es).</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Información adicional sobre la venta..."
                      rows={3}
                    />
                  </div>

                  {formData.cantidad && formData.precio_unitario && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total:</span>
                        <span className="text-2xl font-bold">Gs {calcularTotal().toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
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
                    <Button type="submit" disabled={stockInsuficiente}>
                      {editingVenta ? "Actualizar" : "Registrar"} Venta
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ventas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando ventas...</p>
            </div>
          ) : filteredVentas.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron ventas" : "No hay ventas registradas"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio Unit.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVentas.map((venta) => (
                    <TableRow key={venta.id}>
                      <TableCell>{format(new Date(venta.fecha), "dd/MM/yyyy", { locale: es })}</TableCell>
                      <TableCell className="font-medium">{venta.inventario?.nombre || "-"}</TableCell>
                      <TableCell>{venta.cliente_nombre || "-"}</TableCell>
                      <TableCell>{venta.cantidad}</TableCell>
                      <TableCell>Gs {venta.precio_unitario.toLocaleString()}</TableCell>
                      <TableCell className="font-bold">Gs {venta.total.toLocaleString()}</TableCell>
                      <TableCell>
                        {venta.estado_pago === "pendiente" ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                            Por cobrar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400">
                            Cobrado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(venta)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(venta.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  )
}
