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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Package, AlertTriangle, Edit, Trash2, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getParaguayTimestamp } from "@/lib/utils"

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  sku: string
  stock_actual: number
  stock_minimo: number
  precio_costo: number
  precio_venta: number
  unidad_medida: string
  created_at: string
}

export function InventarioManager() {
  const { perfilActual } = usePerfil()
  const [productos, setProductos] = useState<Producto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    sku: "",
    stock_actual: 0,
    stock_minimo: 0,
    precio_costo: 0,
    precio_venta: 0,
    unidad_medida: "unidad",
  })

  useEffect(() => {
    if (perfilActual) {
      cargarProductos()
    }
  }, [perfilActual])

  const cargarProductos = async () => {
    if (!perfilActual) return

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("perfil_id", perfilActual.id)
        .order("nombre", { ascending: true })

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error("[v0] Error al cargar inventario:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActual) return

    const supabase = createClient()

    try {
      if (editingProducto) {
        // Actualizar producto existente
        const { error } = await supabase
          .from("inventario")
          .update({
            ...formData,
            updated_at: getParaguayTimestamp(),
          })
          .eq("id", editingProducto.id)

        if (error) throw error
      } else {
        // Crear nuevo producto
        const { error } = await supabase.from("inventario").insert({
          ...formData,
          perfil_id: perfilActual.id,
        })

        if (error) throw error
      }

      await cargarProductos()
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("[v0] Error al guardar producto:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from("inventario").delete().eq("id", id)

      if (error) throw error
      await cargarProductos()
    } catch (error) {
      console.error("[v0] Error al eliminar producto:", error)
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      sku: producto.sku,
      stock_actual: producto.stock_actual,
      stock_minimo: producto.stock_minimo,
      precio_costo: producto.precio_costo,
      precio_venta: producto.precio_venta,
      unidad_medida: producto.unidad_medida,
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingProducto(null)
    setFormData({
      nombre: "",
      descripcion: "",
      sku: "",
      stock_actual: 0,
      stock_minimo: 0,
      precio_costo: 0,
      precio_venta: 0,
      unidad_medida: "unidad",
    })
  }

  const productosFiltrados = productos.filter(
    (p) =>
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const productosStockBajo = productos.filter((p) => p.stock_actual <= p.stock_minimo)

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
      {/* Alertas de stock bajo */}
      {productosStockBajo.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Productos con Stock Bajo
            </CardTitle>
            <CardDescription>{productosStockBajo.length} producto(s) necesitan reabastecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {productosStockBajo.map((producto) => (
                <div key={producto.id} className="flex items-center justify-between p-2 rounded-lg bg-background">
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">SKU: {producto.sku}</p>
                  </div>
                  <Badge variant="destructive">
                    {producto.stock_actual} / {producto.stock_minimo}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Gs {productos.reduce((sum, p) => sum + p.stock_actual * p.precio_costo, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{productosStockBajo.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda y botón agregar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProducto ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
              <DialogDescription>
                {editingProducto ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre del Producto *</Label>
                  <Input
                    id="nombre"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Código único"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock_actual">Stock Actual *</Label>
                  <Input
                    id="stock_actual"
                    type="number"
                    required
                    min="0"
                    value={formData.stock_actual}
                    onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
                  <Input
                    id="stock_minimo"
                    type="number"
                    required
                    min="0"
                    value={formData.stock_minimo}
                    onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio_costo">Precio Costo (Gs) *</Label>
                  <Input
                    id="precio_costo"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.precio_costo}
                    onChange={(e) => setFormData({ ...formData, precio_costo: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_venta">Precio Venta (Gs) *</Label>
                  <Input
                    id="precio_venta"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.precio_venta}
                    onChange={(e) => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unidad_medida">Unidad de Medida *</Label>
                  <Input
                    id="unidad_medida"
                    required
                    value={formData.unidad_medida}
                    onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                    placeholder="ej: unidad, kg, litro"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingProducto ? "Actualizar" : "Crear"} Producto</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
          <CardDescription>{productosFiltrados.length} producto(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando inventario...</p>
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron productos" : "No hay productos en el inventario"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Precio Costo</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productosFiltrados.map((producto) => {
                    const margen = (
                      ((producto.precio_venta - producto.precio_costo) / producto.precio_costo) *
                      100
                    ).toFixed(1)
                    const stockBajo = producto.stock_actual <= producto.stock_minimo

                    return (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            {producto.descripcion && (
                              <p className="text-sm text-muted-foreground line-clamp-1">{producto.descripcion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">{producto.sku}</code>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={stockBajo ? "destructive" : "secondary"}>
                            {producto.stock_actual} {producto.unidad_medida}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">Gs {producto.precio_costo.toLocaleString()}</TableCell>
                        <TableCell className="text-right">Gs {producto.precio_venta.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={Number(margen) > 0 ? "text-green-600" : "text-red-600"}>{margen}%</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(producto)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(producto.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
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
    </div>
  )
}
