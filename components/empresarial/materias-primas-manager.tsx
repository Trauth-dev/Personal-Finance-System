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
import { Plus, Search, Edit, Trash2, Package, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface MateriaPrima {
  id: string
  proveedor_id: string | null
  nombre: string
  descripcion: string | null
  stock_actual: number
  stock_minimo: number
  costo_unitario: number
  unidad_medida: string
  created_at: string
  proveedores?: {
    nombre: string
  }
}

interface Proveedor {
  id: string
  nombre: string
}

export function MateriasPrimasManager() {
  const { perfilActual } = usePerfil()
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMateria, setEditingMateria] = useState<MateriaPrima | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    proveedor_id: "",
    stock_actual: "",
    stock_minimo: "",
    costo_unitario: "",
    unidad_medida: "kg",
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
      // Cargar materias primas
      const { data: materiasData, error: materiasError } = await supabase
        .from("materias_primas")
        .select(`
          *,
          proveedores (
            nombre
          )
        `)
        .eq("perfil_id", perfilActual.id)
        .order("nombre", { ascending: true })

      if (materiasError) throw materiasError

      setMateriasPrimas(materiasData || [])

      // Cargar proveedores
      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from("proveedores")
        .select("id, nombre")
        .eq("perfil_id", perfilActual.id)
        .order("nombre", { ascending: true })

      if (proveedoresError) throw proveedoresError

      setProveedores(proveedoresData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual) {
      toast.error("No hay perfil activo")
      return
    }

    if (!formData.nombre.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    const supabase = createClient()

    try {
      const dataToSave = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        proveedor_id: formData.proveedor_id || null,
        stock_actual: Number.parseFloat(formData.stock_actual) || 0,
        stock_minimo: Number.parseFloat(formData.stock_minimo) || 0,
        costo_unitario: Number.parseFloat(formData.costo_unitario) || 0,
        unidad_medida: formData.unidad_medida,
      }

      if (editingMateria) {
        const { error } = await supabase.from("materias_primas").update(dataToSave).eq("id", editingMateria.id)

        if (error) throw error

        toast.success("Materia prima actualizada exitosamente")
      } else {
        const { error } = await supabase.from("materias_primas").insert({
          ...dataToSave,
          perfil_id: perfilActual.id,
        })

        if (error) throw error

        toast.success("Materia prima creada exitosamente")
      }

      setIsDialogOpen(false)
      resetForm()
      cargarDatos()
    } catch (error) {
      console.error("Error al guardar materia prima:", error)
      toast.error("Error al guardar materia prima")
    }
  }

  const handleEdit = (materia: MateriaPrima) => {
    setEditingMateria(materia)
    setFormData({
      nombre: materia.nombre,
      descripcion: materia.descripcion || "",
      proveedor_id: materia.proveedor_id || "",
      stock_actual: materia.stock_actual.toString(),
      stock_minimo: materia.stock_minimo.toString(),
      costo_unitario: materia.costo_unitario.toString(),
      unidad_medida: materia.unidad_medida,
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta materia prima?")) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from("materias_primas").delete().eq("id", id)

      if (error) throw error

      toast.success("Materia prima eliminada exitosamente")
      cargarDatos()
    } catch (error) {
      console.error("Error al eliminar materia prima:", error)
      toast.error("Error al eliminar materia prima")
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      proveedor_id: "",
      stock_actual: "",
      stock_minimo: "",
      costo_unitario: "",
      unidad_medida: "kg",
    })
    setEditingMateria(null)
  }

  const filteredMaterias = materiasPrimas.filter((materia) =>
    materia.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const materiasConStockBajo = materiasPrimas.filter((m) => m.stock_actual <= m.stock_minimo)
  const valorTotalInventario = materiasPrimas.reduce((sum, m) => sum + m.stock_actual * m.costo_unitario, 0)

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
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Materias Primas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{materiasPrimas.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{materiasConStockBajo.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">Gs {valorTotalInventario.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de stock bajo */}
      {materiasConStockBajo.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {materiasConStockBajo.map((materia) => (
                <div key={materia.id} className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <div>
                    <p className="font-medium">{materia.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      Stock: {materia.stock_actual} {materia.unidad_medida} (Mínimo: {materia.stock_minimo}{" "}
                      {materia.unidad_medida})
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(materia)}>
                    Reabastecer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de materias primas */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Catálogo de Materias Primas</CardTitle>
              <CardDescription>Gestiona tu inventario de materias primas</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Materia Prima
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingMateria ? "Editar Materia Prima" : "Nueva Materia Prima"}</DialogTitle>
                  <DialogDescription>
                    {editingMateria
                      ? "Actualiza la información de la materia prima"
                      : "Agrega una nueva materia prima al catálogo"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Harina de trigo"
                        required
                      />
                    </div>

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
                          <SelectItem value="none">Sin proveedor</SelectItem>
                          {proveedores.map((proveedor) => (
                            <SelectItem key={proveedor.id} value={proveedor.id}>
                              {proveedor.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock_actual">Stock Actual *</Label>
                      <Input
                        id="stock_actual"
                        type="number"
                        step="0.01"
                        value={formData.stock_actual}
                        onChange={(e) => setFormData({ ...formData, stock_actual: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stock_minimo">Stock Mínimo *</Label>
                      <Input
                        id="stock_minimo"
                        type="number"
                        step="0.01"
                        value={formData.stock_minimo}
                        onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                        placeholder="0.00"
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
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unidad_medida">Unidad de Medida *</Label>
                      <Select
                        value={formData.unidad_medida}
                        onValueChange={(value) => setFormData({ ...formData, unidad_medida: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kg">Kilogramos (kg)</SelectItem>
                          <SelectItem value="g">Gramos (g)</SelectItem>
                          <SelectItem value="l">Litros (l)</SelectItem>
                          <SelectItem value="ml">Mililitros (ml)</SelectItem>
                          <SelectItem value="unidad">Unidades</SelectItem>
                          <SelectItem value="caja">Cajas</SelectItem>
                          <SelectItem value="paquete">Paquetes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Información adicional sobre la materia prima..."
                      rows={3}
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
                    <Button type="submit">{editingMateria ? "Actualizar" : "Crear"}</Button>
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
              placeholder="Buscar materias primas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando materias primas...</p>
            </div>
          ) : filteredMaterias.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron materias primas" : "No hay materias primas registradas"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Costo Unit.</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterias.map((materia) => (
                    <TableRow key={materia.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{materia.nombre}</p>
                          {materia.stock_actual <= materia.stock_minimo && (
                            <Badge variant="destructive" className="mt-1">
                              Stock Bajo
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{materia.proveedores?.nombre || "-"}</TableCell>
                      <TableCell>
                        {materia.stock_actual} {materia.unidad_medida}
                      </TableCell>
                      <TableCell>Gs {materia.costo_unitario.toLocaleString()}</TableCell>
                      <TableCell>Gs {(materia.stock_actual * materia.costo_unitario).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(materia)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(materia.id)}
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
