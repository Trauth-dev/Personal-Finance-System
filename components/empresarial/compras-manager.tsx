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
import { Plus, Search, Edit, Trash2, ShoppingBag } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatMoney } from "@/lib/currency"

const SIN_MATERIA = "none"

interface Compra {
  id: string
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

export function ComprasManager() {
  const { perfilActual } = usePerfil()
  const [compras, setCompras] = useState<Compra[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [materiasPrimas, setMateriasPrimas] = useState<MateriaPrima[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCompra, setEditingCompra] = useState<Compra | null>(null)

  const [formData, setFormData] = useState({
    materia_prima_id: SIN_MATERIA,
    materia_prima_nombre: "",
    proveedor_id: SIN_MATERIA,
    cantidad: "",
    costo_unitario: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    notas: "",
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
      const [{ data: comprasData }, { data: proveedoresData }, { data: materiasData }] = await Promise.all([
        supabase.from("compras").select("*").eq("perfil_id", perfilActual.id).order("fecha", { ascending: false }),
        supabase.from("proveedores").select("id, nombre").eq("perfil_id", perfilActual.id).order("nombre"),
        supabase
          .from("materias_primas")
          .select("id, nombre, stock_actual, costo_unitario")
          .eq("perfil_id", perfilActual.id)
          .order("nombre"),
      ])

      setCompras(comprasData || [])
      setProveedores(proveedoresData || [])
      setMateriasPrimas(materiasData || [])
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast.error("Error al cargar datos")
    } finally {
      setIsLoading(false)
    }
  }

  const handleMateriaChange = (materiaId: string) => {
    if (materiaId === SIN_MATERIA) {
      setFormData({ ...formData, materia_prima_id: SIN_MATERIA })
      return
    }
    const materia = materiasPrimas.find((m) => m.id === materiaId)
    setFormData({
      ...formData,
      materia_prima_id: materiaId,
      materia_prima_nombre: materia?.nombre || "",
      costo_unitario: materia ? materia.costo_unitario.toString() : formData.costo_unitario,
    })
  }

  const calcularTotal = () => {
    const cantidad = Number.parseFloat(formData.cantidad) || 0
    const costo = Number.parseFloat(formData.costo_unitario) || 0
    return cantidad * costo
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

    const proveedor = proveedores.find((p) => p.id === formData.proveedor_id)
    const materia = materiasPrimas.find((m) => m.id === formData.materia_prima_id)

    // Nombre del ítem comprado: materia prima elegida o texto libre
    const materiaNombre = materia?.nombre || formData.materia_prima_nombre.trim()
    if (!materiaNombre) {
      toast.error("Indicá qué compraste (materia prima o descripción)")
      return
    }

    const supabase = createClient()

    try {
      const total = cantidad * costoUnitario
      const proveedorNombre = proveedor?.nombre || "Sin proveedor"

      const dataToSave = {
        materia_prima_id: materia?.id || null,
        materia_prima_nombre: materiaNombre,
        proveedor_id: proveedor?.id || null,
        proveedor_nombre: proveedorNombre,
        cantidad,
        costo_unitario: costoUnitario,
        total,
        fecha: formData.fecha,
        notas: formData.notas || null,
      }

      if (editingCompra) {
        const { error } = await supabase.from("compras").update(dataToSave).eq("id", editingCompra.id)
        if (error) throw error

        // Sincronizar el egreso vinculado
        if (editingCompra.egreso_id) {
          await supabase
            .from("egresos")
            .update({
              monto: total,
              fecha: formData.fecha,
              concepto: `Compra: ${materiaNombre}`,
            })
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
            concepto: `Compra: ${materiaNombre}`,
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

        // 3) Sumar stock a la materia prima (si se eligió una)
        if (materia) {
          await supabase
            .from("materias_primas")
            .update({ stock_actual: Number(materia.stock_actual) + cantidad })
            .eq("id", materia.id)
        }

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
    setEditingCompra(compra)
    setFormData({
      materia_prima_id: compra.materia_prima_id || SIN_MATERIA,
      materia_prima_nombre: compra.materia_prima_nombre,
      proveedor_id: compra.proveedor_id || SIN_MATERIA,
      cantidad: compra.cantidad.toString(),
      costo_unitario: compra.costo_unitario.toString(),
      fecha: compra.fecha,
      notas: compra.notas || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta compra? También se eliminará el egreso asociado.")) return

    const supabase = createClient()

    try {
      const compra = compras.find((c) => c.id === id)

      // Revertir el stock sumado a la materia prima
      if (compra?.materia_prima_id) {
        const materia = materiasPrimas.find((m) => m.id === compra.materia_prima_id)
        if (materia) {
          await supabase
            .from("materias_primas")
            .update({ stock_actual: Math.max(0, Number(materia.stock_actual) - Number(compra.cantidad)) })
            .eq("id", compra.materia_prima_id)
        }
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
      materia_prima_id: SIN_MATERIA,
      materia_prima_nombre: "",
      proveedor_id: SIN_MATERIA,
      cantidad: "",
      costo_unitario: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      notas: "",
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
                Cada compra genera automáticamente un egreso en tus finanzas empresariales
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
                          <SelectItem value={SIN_MATERIA}>Sin proveedor</SelectItem>
                          {proveedores.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="materia_prima_id">Materia prima</Label>
                      <Select value={formData.materia_prima_id} onValueChange={handleMateriaChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SIN_MATERIA}>Otro / descripción libre</SelectItem>
                          {materiasPrimas.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.materia_prima_id === SIN_MATERIA && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="materia_prima_nombre">¿Qué compraste? *</Label>
                        <Input
                          id="materia_prima_nombre"
                          value={formData.materia_prima_nombre}
                          onChange={(e) => setFormData({ ...formData, materia_prima_nombre: e.target.value })}
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
                    <TableHead>Producto</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Costo Unit.</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompras.map((compra) => (
                    <TableRow key={compra.id}>
                      <TableCell className="font-medium">{compra.materia_prima_nombre}</TableCell>
                      <TableCell>{compra.proveedor_nombre}</TableCell>
                      <TableCell>{compra.cantidad}</TableCell>
                      <TableCell>{formatMoney(compra.costo_unitario)}</TableCell>
                      <TableCell className="font-semibold">{formatMoney(compra.total)}</TableCell>
                      <TableCell>{format(new Date(compra.fecha), "dd/MM/yyyy")}</TableCell>
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
