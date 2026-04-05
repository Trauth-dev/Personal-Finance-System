"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Search, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  Boxes,
  Edit,
  Trash2,
  BarChart3
} from "lucide-react"

interface Producto {
  id: string
  user_id: string
  perfil_id: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  sku: string | null
  precio_costo: number
  precio_venta: number
  stock: number
  stock_minimo: number
  unidad: string
  activo: boolean
  created_at: string
}

interface InventarioCRMManagerProps {
  perfilId: string
}

export function InventarioCRMManager({ perfilId }: InventarioCRMManagerProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategoria, setFilterCategoria] = useState<string>("all")
  const [filterStock, setFilterStock] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoria: "",
    sku: "",
    precio_costo: "",
    precio_venta: "",
    stock: "",
    stock_minimo: "5",
    unidad: "unidad"
  })

  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchUserAndProductos()
  }, [perfilId])

  const fetchUserAndProductos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      setUserId(user.id)

      // Obtener productos del usuario (compartidos entre perfiles)
      const { data, error } = await supabase
        .from("inventario")
        .select("*")
        .eq("user_id", user.id)
        .eq("activo", true)
        .order("nombre")

      if (error) throw error
      setProductos(data || [])
    } catch (error) {
      console.error("Error fetching productos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      const productoData = {
        user_id: userId,
        perfil_id: perfilId,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        categoria: formData.categoria || null,
        sku: formData.sku || null,
        precio_costo: parseFloat(formData.precio_costo) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        stock: parseInt(formData.stock) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 5,
        unidad: formData.unidad,
        activo: true
      }

      if (editingProducto) {
        const { error } = await supabase
          .from("inventario")
          .update(productoData)
          .eq("id", editingProducto.id)

        if (error) throw error
        toast({ title: "Producto actualizado correctamente" })
      } else {
        const { error } = await supabase
          .from("inventario")
          .insert([productoData])

        if (error) throw error
        toast({ title: "Producto agregado correctamente" })
      }

      setDialogOpen(false)
      resetForm()
      fetchUserAndProductos()
    } catch (error) {
      console.error("Error saving producto:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar el producto",
        variant: "destructive"
      })
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingProducto(producto)
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion || "",
      categoria: producto.categoria || "",
      sku: producto.sku || "",
      precio_costo: producto.precio_costo.toString(),
      precio_venta: producto.precio_venta.toString(),
      stock: producto.stock.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      unidad: producto.unidad
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return

    try {
      const { error } = await supabase
        .from("inventario")
        .update({ activo: false })
        .eq("id", id)

      if (error) throw error
      toast({ title: "Producto eliminado" })
      fetchUserAndProductos()
    } catch (error) {
      console.error("Error deleting producto:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto",
        variant: "destructive"
      })
    }
  }

  const resetForm = () => {
    setEditingProducto(null)
    setFormData({
      nombre: "",
      descripcion: "",
      categoria: "",
      sku: "",
      precio_costo: "",
      precio_venta: "",
      stock: "",
      stock_minimo: "5",
      unidad: "unidad"
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Filtros
  const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))]
  
  const filteredProductos = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchCategoria = filterCategoria === "all" || p.categoria === filterCategoria
    const matchStock = filterStock === "all" ||
      (filterStock === "low" && p.stock <= p.stock_minimo) ||
      (filterStock === "out" && p.stock === 0) ||
      (filterStock === "ok" && p.stock > p.stock_minimo)
    return matchSearch && matchCategoria && matchStock
  })

  // Metricas
  const totalProductos = productos.length
  const stockBajo = productos.filter(p => p.stock <= p.stock_minimo && p.stock > 0).length
  const sinStock = productos.filter(p => p.stock === 0).length
  const valorInventario = productos.reduce((sum, p) => sum + (p.precio_costo * p.stock), 0)
  const potencialVenta = productos.reduce((sum, p) => sum + (p.precio_venta * p.stock), 0)
  const gananciaEstimada = potencialVenta - valorInventario

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-600" />
              <span className="text-sm text-muted-foreground">Productos</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalProductos}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">Stock Bajo</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-yellow-600">{stockBajo}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Sin Stock</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{sinStock}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Valor Costo</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(valorInventario)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Potencial Venta</span>
            </div>
            <p className="text-lg font-bold mt-1">{formatCurrency(potencialVenta)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Ganancia Est.</span>
            </div>
            <p className="text-lg font-bold mt-1 text-green-600">{formatCurrency(gananciaEstimada)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Inventario</CardTitle>
              <CardDescription>
                Gestiona tus productos disponibles para venta
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingProducto ? "Editar Producto" : "Nuevo Producto"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProducto ? "Modifica los datos del producto" : "Agrega un nuevo producto al inventario"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU/Codigo</Label>
                        <Input
                          id="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="descripcion">Descripcion</Label>
                      <Input
                        id="descripcion"
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="categoria">Categoria</Label>
                        <Input
                          id="categoria"
                          value={formData.categoria}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                          placeholder="Ej: Suplementos"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="unidad">Unidad</Label>
                        <Select
                          value={formData.unidad}
                          onValueChange={(v) => setFormData({ ...formData, unidad: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unidad">Unidad</SelectItem>
                            <SelectItem value="caja">Caja</SelectItem>
                            <SelectItem value="paquete">Paquete</SelectItem>
                            <SelectItem value="kg">Kilogramo</SelectItem>
                            <SelectItem value="litro">Litro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="precio_costo">Precio Costo *</Label>
                        <Input
                          id="precio_costo"
                          type="number"
                          value={formData.precio_costo}
                          onChange={(e) => setFormData({ ...formData, precio_costo: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="precio_venta">Precio Venta *</Label>
                        <Input
                          id="precio_venta"
                          type="number"
                          value={formData.precio_venta}
                          onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    
                    {formData.precio_costo && formData.precio_venta && (
                      <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Ganancia por unidad: {formatCurrency(parseFloat(formData.precio_venta) - parseFloat(formData.precio_costo))}
                          {" "}({(((parseFloat(formData.precio_venta) - parseFloat(formData.precio_costo)) / parseFloat(formData.precio_costo)) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock Actual *</Label>
                        <Input
                          id="stock"
                          type="number"
                          value={formData.stock}
                          onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock_minimo">Stock Minimo</Label>
                        <Input
                          id="stock_minimo"
                          type="number"
                          value={formData.stock_minimo}
                          onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700">
                      {editingProducto ? "Guardar Cambios" : "Agregar Producto"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorias</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Estado Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el stock</SelectItem>
                <SelectItem value="ok">Stock OK</SelectItem>
                <SelectItem value="low">Stock Bajo</SelectItem>
                <SelectItem value="out">Sin Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabla */}
          {filteredProductos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No hay productos</h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCategoria !== "all" || filterStock !== "all"
                  ? "No se encontraron productos con los filtros aplicados"
                  : "Agrega tu primer producto al inventario"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">P. Costo</TableHead>
                    <TableHead className="text-right">P. Venta</TableHead>
                    <TableHead className="text-right">Ganancia</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProductos.map((producto) => {
                    const ganancia = producto.precio_venta - producto.precio_costo
                    const margen = producto.precio_costo > 0 
                      ? ((ganancia / producto.precio_costo) * 100).toFixed(1) 
                      : "0"
                    
                    return (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{producto.nombre}</p>
                            {producto.descripcion && (
                              <p className="text-xs text-muted-foreground">{producto.descripcion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {producto.sku || "-"}
                        </TableCell>
                        <TableCell>
                          {producto.categoria && (
                            <Badge variant="outline">{producto.categoria}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(producto.precio_costo)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(producto.precio_venta)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="text-green-600 font-medium">{formatCurrency(ganancia)}</p>
                            <p className="text-xs text-muted-foreground">{margen}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              producto.stock === 0
                                ? "destructive"
                                : producto.stock <= producto.stock_minimo
                                ? "secondary"
                                : "default"
                            }
                            className={
                              producto.stock > producto.stock_minimo
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                : ""
                            }
                          >
                            {producto.stock} {producto.unidad}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(producto)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(producto.id)}
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
    </div>
  )
}
