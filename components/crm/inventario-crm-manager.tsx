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
  BarChart3,
  RefreshCw
} from "lucide-react"

interface Producto {
  id: string
  user_id: string
  perfil_id: string
  nombre: string
  descripcion: string | null
  sku: string | null
  precio_costo: number
  precio_venta: number
  precio_costo_usd: number | null
  precio_venta_usd: number | null
  moneda: string
  stock_actual: number
  stock_minimo: number
  unidad_medida: string
  activo: boolean
  created_at: string
}

interface TasaCambio {
  id: string
  user_id: string
  moneda_origen: string
  moneda_destino: string
  tasa: number
  fecha: string
}

interface InventarioCRMManagerProps {
  perfilId: string
}

export function InventarioCRMManager({ perfilId }: InventarioCRMManagerProps) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStock, setFilterStock] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [tasaCambio, setTasaCambio] = useState<number>(7500) // Tasa por defecto
  const [editandoTasa, setEditandoTasa] = useState(false)
  const [nuevaTasa, setNuevaTasa] = useState("")
  const [cargandoTasa, setCargandoTasa] = useState(false)
  const [fuenteTasa, setFuenteTasa] = useState<string>("")
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    sku: "",
    moneda: "USD" as "USD" | "PYG",
    precio_costo_usd: "",
    precio_venta_usd: "",
    precio_costo: "",
    precio_venta: "",
    stock_actual: "",
    stock_minimo: "5",
    unidad_medida: "unidad"
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

      // Obtener tasa de cambio del usuario
      const { data: tasaData } = await supabase
        .from("tasas_cambio")
        .select("*")
        .eq("user_id", user.id)
        .eq("moneda_origen", "USD")
        .eq("moneda_destino", "PYG")
        .order("fecha", { ascending: false })
        .limit(1)
        .single()

      if (tasaData) {
        setTasaCambio(tasaData.tasa)
      }

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

  const handleGuardarTasa = async () => {
    if (!userId || !nuevaTasa) return
    
    try {
      const { error } = await supabase
        .from("tasas_cambio")
        .insert({
          user_id: userId,
          moneda_origen: "USD",
          moneda_destino: "PYG",
          tasa: parseFloat(nuevaTasa),
          fecha: new Date().toISOString().split("T")[0]
        })

      if (error) throw error
      
      setTasaCambio(parseFloat(nuevaTasa))
      setEditandoTasa(false)
      setNuevaTasa("")
      toast({ title: "Tasa de cambio actualizada" })
    } catch (error) {
      console.error("Error saving tasa:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la tasa de cambio",
        variant: "destructive"
      })
    }
  }

  // Funcion para obtener tasa de cambio automatica
  const obtenerTasaAutomatica = async () => {
    setCargandoTasa(true)
    try {
      const response = await fetch("/api/tasa-cambio")
      const data = await response.json()
      
      if (data.success && data.tasa) {
        setTasaCambio(data.tasa)
        setFuenteTasa(data.fuente)
        
        // Guardar en la base de datos si el usuario esta logueado
        if (userId) {
          await supabase
            .from("tasas_cambio")
            .insert({
              user_id: userId,
              moneda_origen: "USD",
              moneda_destino: "PYG",
              tasa: data.tasa,
              fecha: new Date().toISOString().split("T")[0],
              es_automatica: true
            })
        }
        
        toast({
          title: "Tasa actualizada",
          description: `Nueva tasa: ${formatCurrency(data.tasa)} (${data.fuente === "fallback" ? "Respaldo" : "En tiempo real"})`
        })
      }
    } catch (error) {
      console.error("Error obteniendo tasa:", error)
      toast({
        title: "Error",
        description: "No se pudo obtener la tasa automatica",
        variant: "destructive"
      })
    } finally {
      setCargandoTasa(false)
    }
  }

  // Funciones de conversion
  const convertirUsdAPyg = (usd: number) => Math.round(usd * tasaCambio)
  const convertirPygAUsd = (pyg: number) => Number((pyg / tasaCambio).toFixed(2))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    try {
      // Calcular precios segun la moneda seleccionada
      let precioCosto: number
      let precioVenta: number
      let precioCostoUsd: number | null = null
      let precioVentaUsd: number | null = null

      if (formData.moneda === "USD") {
        precioCostoUsd = parseFloat(formData.precio_costo_usd) || 0
        precioVentaUsd = parseFloat(formData.precio_venta_usd) || 0
        precioCosto = convertirUsdAPyg(precioCostoUsd)
        precioVenta = convertirUsdAPyg(precioVentaUsd)
      } else {
        precioCosto = parseFloat(formData.precio_costo) || 0
        precioVenta = parseFloat(formData.precio_venta) || 0
        precioCostoUsd = convertirPygAUsd(precioCosto)
        precioVentaUsd = convertirPygAUsd(precioVenta)
      }

      const productoData = {
        user_id: userId,
        perfil_id: perfilId,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        sku: formData.sku || null,
        moneda: formData.moneda,
        precio_costo: precioCosto,
        precio_venta: precioVenta,
        precio_costo_usd: precioCostoUsd,
        precio_venta_usd: precioVentaUsd,
        stock_actual: parseInt(formData.stock_actual) || 0,
        stock_minimo: parseInt(formData.stock_minimo) || 5,
        unidad_medida: formData.unidad_medida,
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
      sku: producto.sku || "",
      moneda: (producto.moneda || "PYG") as "USD" | "PYG",
      precio_costo_usd: producto.precio_costo_usd?.toString() || "",
      precio_venta_usd: producto.precio_venta_usd?.toString() || "",
      precio_costo: producto.precio_costo.toString(),
      precio_venta: producto.precio_venta.toString(),
      stock_actual: producto.stock_actual.toString(),
      stock_minimo: producto.stock_minimo.toString(),
      unidad_medida: producto.unidad_medida
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
      sku: "",
      moneda: "USD",
      precio_costo_usd: "",
      precio_venta_usd: "",
      precio_costo: "",
      precio_venta: "",
      stock_actual: "",
      stock_minimo: "5",
      unidad_medida: "unidad"
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

  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  // Filtros
  const filteredProductos = productos.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchStock = filterStock === "all" ||
      (filterStock === "low" && p.stock_actual <= p.stock_minimo) ||
      (filterStock === "out" && p.stock_actual === 0) ||
      (filterStock === "ok" && p.stock_actual > p.stock_minimo)
    return matchSearch && matchStock
  })

  // Metricas
  const totalProductos = productos.length
  const stockBajo = productos.filter(p => p.stock_actual <= p.stock_minimo && p.stock_actual > 0).length
  const sinStock = productos.filter(p => p.stock_actual === 0).length
  const valorInventario = productos.reduce((sum, p) => sum + (p.precio_costo * p.stock_actual), 0)
  const potencialVenta = productos.reduce((sum, p) => sum + (p.precio_venta * p.stock_actual), 0)
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
      {/* Tasa de Cambio */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 border-blue-200 dark:border-slate-700">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Tasa de Cambio USD/PYG</p>
                {editandoTasa ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={nuevaTasa}
                      onChange={(e) => setNuevaTasa(e.target.value)}
                      placeholder={tasaCambio.toString()}
                      className="w-32 h-8 text-sm bg-white dark:bg-slate-800"
                    />
                    <Button size="sm" onClick={handleGuardarTasa} className="h-8 bg-blue-600 hover:bg-blue-700">
                      Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoTasa(false)} className="h-8">
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrency(tasaCambio)}
                    </p>
                    {fuenteTasa && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                        {fuenteTasa === "fallback" ? "Manual" : "Actualizado"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            {!editandoTasa && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={obtenerTasaAutomatica}
                  disabled={cargandoTasa}
                  className="text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400 dark:border-green-700 dark:hover:bg-green-900"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${cargandoTasa ? "animate-spin" : ""}`} />
                  {cargandoTasa ? "Actualizando..." : "Obtener Tasa Actual"}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setNuevaTasa(tasaCambio.toString())
                    setEditandoTasa(true)
                  }}
                  className="text-blue-600 border-blue-300 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Manual
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            1 USD = {formatCurrency(tasaCambio)} | Los precios se convierten automaticamente
          </p>
        </CardContent>
      </Card>

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
                        <Label htmlFor="unidad_medida">Unidad de Medida</Label>
                        <Select
                          value={formData.unidad_medida}
                          onValueChange={(v) => setFormData({ ...formData, unidad_medida: v })}
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
                      <div className="space-y-2">
                        <Label>Moneda de Carga</Label>
                        <Select
                          value={formData.moneda}
                          onValueChange={(v) => setFormData({ ...formData, moneda: v as "USD" | "PYG" })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD (Dolares)</SelectItem>
                            <SelectItem value="PYG">PYG (Guaranies)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Precios segun moneda seleccionada */}
                    {formData.moneda === "USD" ? (
                      <>
                        <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-600">
                          <p className="text-xs text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Precios en Dolares (Tasa: {formatCurrency(tasaCambio)} por USD)
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="precio_costo_usd" className="text-slate-700 dark:text-slate-200 font-medium">
                                Costo USD *
                              </Label>
                              <Input
                                id="precio_costo_usd"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.precio_costo_usd}
                                onChange={(e) => setFormData({ ...formData, precio_costo_usd: e.target.value })}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="precio_venta_usd" className="text-slate-700 dark:text-slate-200 font-medium">
                                Venta USD *
                              </Label>
                              <Input
                                id="precio_venta_usd"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.precio_venta_usd}
                                onChange={(e) => setFormData({ ...formData, precio_venta_usd: e.target.value })}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                required
                              />
                            </div>
                          </div>
                        </div>
                        
                        {formData.precio_costo_usd && formData.precio_venta_usd && (
                          <div className="p-3 bg-green-50 dark:bg-slate-800 rounded-lg border border-green-200 dark:border-slate-600">
                            <p className="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">Equivalente en Guaranies</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">Costo:</span>{" "}
                                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(convertirUsdAPyg(parseFloat(formData.precio_costo_usd)))}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">Venta:</span>{" "}
                                <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(convertirUsdAPyg(parseFloat(formData.precio_venta_usd)))}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-green-50 dark:bg-slate-800 rounded-lg border border-green-200 dark:border-slate-600">
                          <p className="text-xs text-green-600 dark:text-green-400 mb-3 font-medium">Precios en Guaranies</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="precio_costo" className="text-slate-700 dark:text-slate-200 font-medium">
                                Costo Gs. *
                              </Label>
                              <Input
                                id="precio_costo"
                                type="number"
                                placeholder="0"
                                value={formData.precio_costo}
                                onChange={(e) => setFormData({ ...formData, precio_costo: e.target.value })}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="precio_venta" className="text-slate-700 dark:text-slate-200 font-medium">
                                Venta Gs. *
                              </Label>
                              <Input
                                id="precio_venta"
                                type="number"
                                placeholder="0"
                                value={formData.precio_venta}
                                onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                                required
                              />
                            </div>
                          </div>
                        </div>

                        {formData.precio_costo && formData.precio_venta && (
                          <div className="p-3 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-600">
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 font-medium">Equivalente en Dolares (Tasa: {formatCurrency(tasaCambio)})</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">Costo:</span>{" "}
                                <span className="font-semibold text-slate-900 dark:text-white">{formatUSD(convertirPygAUsd(parseFloat(formData.precio_costo)))}</span>
                              </div>
                              <div>
                                <span className="text-slate-600 dark:text-slate-400">Venta:</span>{" "}
                                <span className="font-semibold text-slate-900 dark:text-white">{formatUSD(convertirPygAUsd(parseFloat(formData.precio_venta)))}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Calculo de ganancia */}
                    {((formData.moneda === "USD" && formData.precio_costo_usd && formData.precio_venta_usd) ||
                      (formData.moneda === "PYG" && formData.precio_costo && formData.precio_venta)) && (
                      <div className="bg-emerald-50 dark:bg-emerald-950 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                          Ganancia por unidad:{" "}
                          {formData.moneda === "USD" 
                            ? `${formatUSD(parseFloat(formData.precio_venta_usd) - parseFloat(formData.precio_costo_usd))} (${formatCurrency(convertirUsdAPyg(parseFloat(formData.precio_venta_usd) - parseFloat(formData.precio_costo_usd)))})`
                            : formatCurrency(parseFloat(formData.precio_venta) - parseFloat(formData.precio_costo))
                          }
                          {" - "}
                          {(((formData.moneda === "USD" 
                            ? parseFloat(formData.precio_venta_usd) - parseFloat(formData.precio_costo_usd)
                            : parseFloat(formData.precio_venta) - parseFloat(formData.precio_costo)
                          ) / (formData.moneda === "USD" 
                            ? parseFloat(formData.precio_costo_usd)
                            : parseFloat(formData.precio_costo)
                          )) * 100).toFixed(1)}% margen
                        </p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="stock_actual">Stock Actual *</Label>
                        <Input
                          id="stock_actual"
                          type="number"
                          value={formData.stock_actual}
                          onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
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
                {searchTerm || filterStock !== "all"
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
                    const gananciaUsd = (producto.precio_venta_usd || 0) - (producto.precio_costo_usd || 0)
                    
                    return (
                      <TableRow key={producto.id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{producto.nombre}</p>
                              {producto.moneda === "USD" && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                                  USD
                                </Badge>
                              )}
                            </div>
                            {producto.descripcion && (
                              <p className="text-xs text-muted-foreground">{producto.descripcion}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {producto.sku || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p>{formatCurrency(producto.precio_costo)}</p>
                            {producto.precio_costo_usd && (
                              <p className="text-xs text-blue-600">{formatUSD(producto.precio_costo_usd)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div>
                            <p>{formatCurrency(producto.precio_venta)}</p>
                            {producto.precio_venta_usd && (
                              <p className="text-xs text-blue-600">{formatUSD(producto.precio_venta_usd)}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <p className="text-green-600 font-medium">{formatCurrency(ganancia)}</p>
                            {producto.precio_venta_usd && (
                              <p className="text-xs text-green-500">{formatUSD(gananciaUsd)}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{margen}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              producto.stock_actual === 0
                                ? "destructive"
                                : producto.stock_actual <= producto.stock_minimo
                                ? "secondary"
                                : "default"
                            }
                            className={
                              producto.stock_actual > producto.stock_minimo
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                : ""
                            }
                          >
                            {producto.stock_actual} {producto.unidad_medida}
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
