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
import { Plus, Search, Edit, Trash2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatMoney } from "@/lib/currency"

const SIN_PROVEEDOR = "none"

// Tipo de destino de la compra: a qué se le suma el stock
type Destino = "producto" | "materia" | "otro"

interface Compra {
  id: string
  producto_id: string | null
  materia_prima_id: string | null
  materia_prima_nombre: string
  proveedor_id: string | null
  proveedor_nombre: string
  cantidad: number
  costo_unitario: number
  total: number
  fecha: string
  notas: string | null
  egreso_id: string | null
  estado_pago: string
  fecha_pago: string | null
  fecha_vencimiento: string | null
  created_at: string
}

interface Proveedor {
  id: string
  nombre: string
}

interface MateriaPrima {
  id: string
  nombre: string
  stock_actual: number
  costo_unitario: number
}

interface Producto {
  id: string
  nombre: string
  stock_actual: number
  precio_costo: number
}

export function ComprasManager() {
  const { perfilActual } = usePerfil()
  const [compras, setCompras] = useState<Compra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)

  const [formData, setFormData] = useState({
    destino: "producto" as Destino,
    item_id: "",
    item_nombre: "",
    proveedor_id: SIN_PROVEEDOR,
    cantidad: "",
    costo_unitario: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    notas: "",
    estado_pago: "pagado",
    fecha_vencimiento: "",
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
      const [{ data: comprasData }, { data: proveedoresData }, { data: materiasData }, { data: productosData }] =
        await Promise.all([
          supabase.from("compras").select("*").eq("perfil_id", perfilActual.id).order("fecha", { ascending: false }),
          supabase.from("proveedores").select("id, nombre").eq("perfil_id", perfilActual.id).order("nombre"),
          supabase
            .from("materias_primas")
            .select("id, nombre, stock_actual, costo_unitario")
            .eq("perfil_id", perfilActual.id)
            .order("nombre"),
          supabase
            .from("inventario")
            .select("id, nombre, stock_actual, precio_costo")
            .eq("perfil_id", perfilActual.id)
            .order("nombre"),
        ])

      setCompras(comprasData || [])
      setProveedores(proveedoresData || [])
      setMateriasPrimas(materiasData || [])
      setProductos(productosData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDestinoChange = (destino: Destino) => {
    setFormData({ ...formData, destino, item_id: "", item_nombre: "" })
  }

  const handleItemChange = (itemId: string) => {
    if (formData.destino === "producto") {
      const p = productos.find((x) => x.id === itemId)
      setFormData({
        ...formData,
        item_id: itemId,
        item_nombre: p?.nombre || "",
        costo_unitario: p ? p.precio_costo.toString() : formData.costo_unitario,
      })
    } else {
      const m = materiasPrimas.find((x) => x.id === itemId)
      setFormData({
        ...formData,
        item_id: itemId,
        item_nombre: m?.nombre || "",
        costo_unitario: m ? m.costo_unitario.toString() : formData.costo_unitario,
      })
    }
  }

  const calcularTotal = () => {
    const cantidad = Number.parseFloat(formData.cantidad) || 0
    const costo = Number.parseFloat(formData.costo_unitario) || 0
    return cantidad * costo
  }

  // Suma (signo +1) o resta (signo -1) stock al destino de una compra
  const ajustarStock = async (
    supabase: ReturnType<typeof createClient>,
    compra: { producto_id: string | null; materia_prima_id: string | null; cantidad: number },
    signo: 1 | -1,
  ) => {
    const delta = signo * Number(compra.cantidad)
    if (compra.producto_id) {
      const p = productos.find((x) => x.id === compra.producto_id)
      if (p) {
        await supabase
          .from("inventario")
          .update({ stock_actual: Math.max(0, Number(p.stock_actual) + delta) })
          .eq("id", compra.producto_id)
      }
    } else if (compra.materia_prima_id) {
      const m = materiasPrimas.find((x) => x.id === compra.materia_prima_id)
      if (m) {
        await supabase
          .from("materias_primas")
          .update({ stock_actual: Math.max(0, Number(m.stock_actual) + delta) })
          .eq("id", compra.materia_prima_id)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual) {
      toast.error("No hay perfil activo")
      return
    }

    const cantidad = Number.parseFloat(formData.cantidad)
    if (!cantidad || cantidad <= 0) {
      toast.error("La cantidad debe ser mayor a 0")
      return
    }

    const costoUnitario = Number.parseFloat(formData.costo_unitario)
    if (!costoUnitario || costoUnitario <= 0) {
      toast.error("El costo unitario debe ser mayor a 0")
      return
    }

    // Resolver el ítem comprado según el destino
    let productoId: string | null = null
    let materiaPrimaId: string | null = null
    let itemNombre = ""

    if (formData.destino === "producto") {
      const p = productos.find((x) => x.id === formData.item_id)
      if (!p) {
        toast.error("Seleccioná un producto de inventario")
        return
      }
      productoId = p.id
      itemNombre = p.nombre
    } else if (formData.destino === "materia") {
      const m = materiasPrimas.find((x) => x.id === formData.item_id)
      if (!m) {
        toast.error("Seleccioná una materia prima")
        return
      }
      materiaPrimaId = m.id
      itemNombre = m.nombre
    } else {
      itemNombre = formData.item_nombre.trim()
      if (!itemNombre) {
        toast.error("Indicá qué compraste")
        return
      }
    }

    const proveedor = proveedores.find((p) => p.id === formData.proveedor_id)
    const supabase = createClient()

    try {
      const total = cantidad * costoUnitario
      const proveedorNombre = proveedor?.nombre || "Sin proveedor"

      const dataToSave = {
        producto_id: productoId,
        materia_prima_id: materiaPrimaId,
        materia_prima_nombre: itemNombre,
        proveedor_id: proveedor?.id || null,
        proveedor_nombre: proveedorNombre,
        cantidad,
        costo_unitario: costoUnitario,
        total,
        fecha: formData.fecha,
        notas: formData.notas || null,
        estado_pago: formData.estado_pago,
        fecha_pago: formData.estado_pago === "pagado" ? formData.fecha : null,
        fecha_vencimiento:
          formData.estado_pago === "pendiente" && formData.fecha_vencimiento ? formData.fecha_vencimiento : null,
      }

      if (editingCompra) {
        // Revertir el stock del destino anterior antes de aplicar el nuevo
        await ajustarStock(supabase, editingCompra, -1)

        const { error } = await supabase.from("compras").update(dataToSave).eq("id", editingCompra.id)
        if (error) throw error

        // Aplicar el stock del nuevo destino
        await ajustarStock(supabase, { producto_id: productoId, materia_prima_id: materiaPrimaId, cantidad }, 1)

        // Sincronizar el egreso vinculado
        if (editingCompra.egreso_id) {
          await supabase
            .from("egresos")
            .update({ monto: total, fecha: formData.fecha, concepto: `Compra: ${itemNombre}` })
            .eq("id", editingCompra.egreso_id)
        }

        toast.success("Compra actualizada exitosamente")
      } else {
        // 1) Crear el egreso primero (queda como costo del negocio)
        const { data: egresoData, error: egresoError } = await supabase
          .from("egresos")
          .insert({
            user_id: perfilActual.user_id,
            perfil_id: perfilActual.id,
            monto: total,
            fecha: formData.fecha,
            concepto: `Compra: ${itemNombre}`,
          })
          .select("id")
          .single()

        if (egresoError) throw egresoError

        // 2) Crear la compra vinculada al egreso
        const { error } = await supabase.from("compras").insert({
          ...dataToSave,
          perfil_id: perfilActual.id,
          egreso_id: egresoData?.id ?? null,
        })

        if (error) {
          if (egresoData?.id) {
            await supabase.from("egresos").delete().eq("id", egresoData.id)
          }
          throw error
        }

        // 3) Sumar stock al destino elegido (producto o materia prima)
        await ajustarStock(supabase, { producto_id: productoId, materia_prima_id: materiaPrimaId, cantidad }, 1)

        toast.success("Compra registrada y egreso generado")
      }

      setIsDialogOpen(false)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error("Error al guardar compra:", error)
      toast.error("Error al guardar compra")
    }
  }

  const handleEdit = (compra: Compra) => {
    const destino: Destino = compra.producto_id ? "producto" : compra.materia_prima_id ? "materia" : "otro"
    setEditingCompra(compra)
    setFormData({
      destino,
      item_id: compra.producto_id || compra.materia_prima_id || "",
      item_nombre: compra.materia_prima_nombre,
      proveedor_id: compra.proveedor_id || SIN_PROVEEDOR,
      cantidad: compra.cantidad.toString(),
      costo_unitario: compra.costo_unitario.toString(),
      fecha: compra.fecha,
      notas: compra.notas || "",
      estado_pago: compra.estado_pago || "pagado",
      fecha_vencimiento: compra.fecha_vencimiento || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta compra? También se eliminará el egreso asociado y se revertirá el stock.")) return

    const supabase = createClient()

    try {
      const compra = compras.find((c) => c.id === id)

      // Revertir el stock sumado (al producto o materia prima)
      if (compra) {
        await ajustarStock(supabase, compra, -1)
      }

      const { error } = await supabase.from("compras").delete().eq("id", id)
      if (error) throw error

      if (compra?.egreso_id) {
        await supabase.from("egresos").delete().eq("id", compra.egreso_id)
      }

      toast.success("Compra y egreso eliminados")
      cargarDatos()
    } catch (error) {
      console.error("Error al eliminar compra:", error)
      toast.error("Error al eliminar compra")
    }
  }

  const resetForm = () => {
    setFormData({
      destino: "producto",
      item_id: "",
      item_nombre: "",
      proveedor_id: SIN_PROVEEDOR,
      cantidad: "",
      costo_unitario: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      notas: "",
      estado_pago: "pagado",
      fecha_vencimiento: "",
    })
    setEditingCompra(null)
  }

  const filteredCompras = compras.filter(
    (c) =>
      c.materia_prima_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.proveedor_nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const now = new Date()
  const totalMes = compras
    .filter((c) => {
      const f = new Date(c.fecha)
      return f.getMonth() === now.getMonth() && f.getFullYear() === now.getFullYear()
    })
    .reduce((sum, c) => sum + Number(c.total), 0)
  const totalHistorico = compras.reduce((sum, c) => sum + Number(c.total), 0)

  const tipoCompra = (c: Compra) =>
    c.producto_id ? "Producto" : c.materia_prima_id ? "Materia prima" : "Otro"

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
      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-600/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-500">{formatMoney(totalMes)}</div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{formatMoney(totalHistorico)}</div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compras Registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{compras.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Registro de Compras</CardTitle>
              <CardDescription>
                Cada compra genera un egreso y suma stock al producto o materia prima elegido
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Compra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCompra ? "Editar Compra" : "Nueva Compra"}</DialogTitle>
                  <DialogDescription>
                    {editingCompra
                      ? "Actualiza la información de la compra"
                      : "Registrá una compra a un proveedor. Se creará el egreso automáticamente."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Destino de la compra */}
                  <div className="space-y-2">
                    <Label>¿Qué estás comprando?</Label>
                    <Select value={formData.destino} onValueChange={(v) => handleDestinoChange(v as Destino)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="producto">Producto de inventario (reventa)</SelectItem>
                        <SelectItem value="materia">Materia prima</SelectItem>
                        <SelectItem value="otro">Otro / gasto (sin stock)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="proveedor_id">Proveedor</Label>
                      <Select
                        value={formData.proveedor_id}
                        onValueChange={(value) => setFormData({ ...formData, proveedor_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
                          {proveedores.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.destino === "producto" && (
                      <div className="space-y-2">
                        <Label htmlFor="item_id">Producto *</Label>
                        <Select value={formData.item_id} onValueChange={handleItemChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {productos.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No hay productos en inventario
                              </SelectItem>
                            ) : (
                              productos.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nombre} (stock: {p.stock_actual})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.destino === "materia" && (
                      <div className="space-y-2">
                        <Label htmlFor="item_id">Materia prima *</Label>
                        <Select value={formData.item_id} onValueChange={handleItemChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar materia prima" />
                          </SelectTrigger>
                          <SelectContent>
                            {materiasPrimas.length === 0 ? (
                              <SelectItem value="none" disabled>
                                No hay materias primas
                              </SelectItem>
                            ) : (
                              materiasPrimas.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.nombre} (stock: {m.stock_actual})
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.destino === "otro" && (
                      <div className="space-y-2">
                        <Label htmlFor="item_nombre">¿Qué compraste? *</Label>
                        <Input
                          id="item_nombre"
                          value={formData.item_nombre}
                          onChange={(e) => setFormData({ ...formData, item_nombre: e.target.value })}
                          placeholder="Ej: Envases, etiquetas, servicio..."
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="cantidad">Cantidad *</Label>
                      <Input
                        id="cantidad"
                        type="number"
                        step="0.01"
                        value={formData.cantidad}
                        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                        placeholder="0"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="costo_unitario">Costo Unitario *</Label>
                      <Input
                        id="costo_unitario"
                        type="number"
                        step="0.01"
                        value={formData.costo_unitario}
                        onChange={(e) => setFormData({ ...formData, costo_unitario: e.target.value })}
                        placeholder="0"
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

                    <div className="flex items-end">
                      <div className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-lg font-bold text-foreground">{formatMoney(calcularTotal())}</p>
                      </div>
                    </div>
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
                        <SelectItem value="pagado">Pagado (contado)</SelectItem>
                        <SelectItem value="pendiente">Pendiente (a crédito)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.estado_pago === "pendiente" && (
                    <div className="space-y-2">
                      <Label htmlFor="fecha_vencimiento">Fecha de vencimiento del pago</Label>
                      <Input
                        id="fecha_vencimiento"
                        type="date"
                        value={formData.fecha_vencimiento}
                        min={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Opcional. Se usa para avisarte cuándo debés pagar esta compra.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Información adicional..."
                      rows={2}
                    />
                  </div>

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
                    <Button type="submit">{editingCompra ? "Actualizar" : "Registrar Compra"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">Cargando compras...</p>
            </div>
          ) : filteredCompras.length === 0 ? (
            <div className="py-8 text-center">
              <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron compras" : "No hay compras registradas"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ítem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Unit.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompras.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="font-medium">{compra.materia_prima_nombre}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{tipoCompra(compra)}</Badge>
                      </TableCell>
                      <TableCell>{compra.proveedor_nombre}</TableCell>
                      <TableCell>{compra.cantidad}</TableCell>
                      <TableCell>{formatMoney(compra.costo_unitario)}</TableCell>
                      <TableCell className="font-semibold">{formatMoney(compra.total)}</TableCell>
                      <TableCell>{format(new Date(compra.fecha), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        {compra.estado_pago === "pendiente" ? (
                          <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                            Por pagar
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400">
                            Pagado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(compra)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(compra.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
