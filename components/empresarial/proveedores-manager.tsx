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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, User, Building2 } from "lucide-react"
import { toast } from "sonner"

interface Proveedor {
  id: string
  nombre: string
  contacto_nombre: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
  created_at: string
}

export function ProveedoresManager() {
  const { perfilActual } = usePerfil()
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    contacto_nombre: "",
    telefono: "",
    email: "",
    direccion: "",
    notas: "",
  })

  useEffect(() => {
    if (perfilActual) {
      cargarProveedores()
    }
  }, [perfilActual])

  const cargarProveedores = async () => {
    if (!perfilActual) return

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .eq("perfil_id", perfilActual.id)
        .order("nombre", { ascending: true })

      if (error) throw error

      setProveedores(data || [])
    } catch (error) {
      console.error("Error al cargar proveedores:", error)
      toast.error("Error al cargar proveedores")
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
      toast.error("El nombre del proveedor es requerido")
      return
    }

    const supabase = createClient()

    try {
      if (editingProveedor) {
        // Actualizar proveedor existente
        const { error } = await supabase
          .from("proveedores")
          .update({
            nombre: formData.nombre,
            contacto_nombre: formData.contacto_nombre || null,
            telefono: formData.telefono || null,
            email: formData.email || null,
            direccion: formData.direccion || null,
            notas: formData.notas || null,
          })
          .eq("id", editingProveedor.id)

        if (error) throw error

        toast.success("Proveedor actualizado exitosamente")
      } else {
        // Crear nuevo proveedor
        const { error } = await supabase.from("proveedores").insert({
          perfil_id: perfilActual.id,
          nombre: formData.nombre,
          contacto_nombre: formData.contacto_nombre || null,
          telefono: formData.telefono || null,
          email: formData.email || null,
          direccion: formData.direccion || null,
          notas: formData.notas || null,
        })

        if (error) throw error

        toast.success("Proveedor creado exitosamente")
      }

      setIsDialogOpen(false)
      resetForm()
      cargarProveedores()
    } catch (error) {
      console.error("Error al guardar proveedor:", error)
      toast.error("Error al guardar proveedor")
    }
  }

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor)
    setFormData({
      nombre: proveedor.nombre,
      contacto_nombre: proveedor.contacto_nombre || "",
      telefono: proveedor.telefono || "",
      email: proveedor.email || "",
      direccion: proveedor.direccion || "",
      notas: proveedor.notas || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este proveedor?")) return

    const supabase = createClient()

    try {
      const { error } = await supabase.from("proveedores").delete().eq("id", id)

      if (error) throw error

      toast.success("Proveedor eliminado exitosamente")
      cargarProveedores()
    } catch (error) {
      console.error("Error al eliminar proveedor:", error)
      toast.error("Error al eliminar proveedor")
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      contacto_nombre: "",
      telefono: "",
      email: "",
      direccion: "",
      notas: "",
    })
    setEditingProveedor(null)
  }

  const filteredProveedores = proveedores.filter(
    (proveedor) =>
      proveedor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.contacto_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proveedor.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{proveedores.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{proveedores.filter((p) => p.email).length}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Con Teléfono</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{proveedores.filter((p) => p.telefono).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Lista de Proveedores</CardTitle>
              <CardDescription>Gestiona tu red de proveedores</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Proveedor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle>
                  <DialogDescription>
                    {editingProveedor ? "Actualiza la información del proveedor" : "Agrega un nuevo proveedor a tu red"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Nombre del Proveedor *
                      </Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        placeholder="Ej: Distribuidora ABC"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contacto_nombre" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Persona de Contacto
                      </Label>
                      <Input
                        id="contacto_nombre"
                        value={formData.contacto_nombre}
                        onChange={(e) => setFormData({ ...formData, contacto_nombre: e.target.value })}
                        placeholder="Ej: Juan Pérez"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefono" className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        Teléfono
                      </Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        placeholder="Ej: +595 981 123456"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Ej: contacto@proveedor.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="direccion" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Dirección
                    </Label>
                    <Input
                      id="direccion"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      placeholder="Ej: Av. Principal 123, Asunción"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      placeholder="Información adicional sobre el proveedor..."
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
                    <Button type="submit">{editingProveedor ? "Actualizar" : "Crear"} Proveedor</Button>
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
              placeholder="Buscar proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando proveedores...</p>
            </div>
          ) : filteredProveedores.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron proveedores" : "No hay proveedores registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProveedores.map((proveedor) => (
                    <TableRow key={proveedor.id}>
                      <TableCell className="font-medium">{proveedor.nombre}</TableCell>
                      <TableCell>{proveedor.contacto_nombre || "-"}</TableCell>
                      <TableCell>{proveedor.telefono || "-"}</TableCell>
                      <TableCell>{proveedor.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(proveedor)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(proveedor.id)}
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
