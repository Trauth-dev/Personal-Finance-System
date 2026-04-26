"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Search, 
  Star, 
  Phone, 
  Mail, 
  MapPin,
  Users,
  Filter,
  UserPlus,
  History
} from "lucide-react"
import { ClienteHistorialUnificado } from "./cliente-historial-unificado"

interface Cliente {
  id: string
  user_id: string
  nombre: string
  apellido: string | null
  telefono: string | null
  email: string | null
  ciudad: string | null
  direccion: string | null
  empresa: string | null
  cargo: string | null
  clasificacion: "amistad" | "ahorro" | null
  estrellas: number
  canal_origen: "ventas" | "referido" | "instagram" | "evento" | "info" | null
  canal_origen_detalle: string | null
  estado: "activo" | "inactivo" | "potencial"
  notas: string | null
  created_at: string
  updated_at: string
}

const CANALES_ORIGEN = [
  { value: "ventas", label: "Ventas directas" },
  { value: "referido", label: "Referido" },
  { value: "instagram", label: "Instagram" },
  { value: "evento", label: "Evento" },
  { value: "info", label: "Info (Room/Consultor)" },
]

const CLASIFICACIONES = [
  { value: "amistad", label: "Amistad" },
  { value: "ahorro", label: "Ahorro" },
]

const ESTADOS = [
  { value: "activo", label: "Activo", color: "bg-green-500" },
  { value: "potencial", label: "Potencial", color: "bg-yellow-500" },
  { value: "inactivo", label: "Inactivo", color: "bg-gray-500" },
]

interface ClientesManagerProps {
  perfilId?: string
}

export function ClientesManager({ perfilId }: ClientesManagerProps = {}) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const [filterClasificacion, setFilterClasificacion] = useState<string>("todos")
  const [historialClienteId, setHistorialClienteId] = useState<string | null>(null)
  const [currentPerfilId, setCurrentPerfilId] = useState<string | null>(perfilId || null)
  const { toast } = useToast()
  const supabase = createClient()

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    ciudad: "",
    direccion: "",
    empresa: "",
    cargo: "",
    clasificacion: "" as "amistad" | "ahorro" | "",
    estrellas: 1,
    canal_origen: "" as "ventas" | "referido" | "instagram" | "evento" | "info" | "",
    canal_origen_detalle: "",
    estado: "potencial" as "activo" | "inactivo" | "potencial",
    notas: "",
  })

  useEffect(() => {
    fetchClientes()
    fetchPerfilId()
  }, [])

  const fetchPerfilId = async () => {
    if (perfilId) {
      setCurrentPerfilId(perfilId)
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Obtener perfil empresarial del usuario
    const { data: perfil } = await supabase
      .from("perfiles_empresariales")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (perfil) {
      setCurrentPerfilId(perfil.id)
    }
  }

  const fetchClientes = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      })
    } else {
      setClientes(data || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      apellido: "",
      telefono: "",
      email: "",
      ciudad: "",
      direccion: "",
      empresa: "",
      cargo: "",
      clasificacion: "",
      estrellas: 1,
      canal_origen: "",
      canal_origen_detalle: "",
      estado: "potencial",
      notas: "",
    })
    setEditingCliente(null)
  }

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente)
      setFormData({
        nombre: cliente.nombre,
        apellido: cliente.apellido || "",
        telefono: cliente.telefono || "",
        email: cliente.email || "",
        ciudad: cliente.ciudad || "",
        direccion: cliente.direccion || "",
        empresa: cliente.empresa || "",
        cargo: cliente.cargo || "",
        clasificacion: cliente.clasificacion || "",
        estrellas: cliente.estrellas || 1,
        canal_origen: cliente.canal_origen || "",
        canal_origen_detalle: cliente.canal_origen_detalle || "",
        estado: cliente.estado || "potencial",
        notas: cliente.notas || "",
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

    const clienteData = {
      user_id: user.id,
      nombre: formData.nombre,
      apellido: formData.apellido || null,
      telefono: formData.telefono || null,
      email: formData.email || null,
      ciudad: formData.ciudad || null,
      direccion: formData.direccion || null,
      empresa: formData.empresa || null,
      cargo: formData.cargo || null,
      clasificacion: formData.clasificacion || null,
      estrellas: formData.estrellas,
      canal_origen: formData.canal_origen || null,
      canal_origen_detalle: formData.canal_origen_detalle || null,
      estado: formData.estado,
      notas: formData.notas || null,
    }

    if (editingCliente) {
      const { error } = await supabase
        .from("clientes")
        .update({ ...clienteData, updated_at: new Date().toISOString() })
        .eq("id", editingCliente.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el cliente",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se actualizaron correctamente",
        })
        fetchClientes()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("clientes")
        .insert([clienteData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el cliente",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Cliente creado",
          description: "El cliente se registro correctamente",
        })
        fetchClientes()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Cliente eliminado",
        description: "El cliente se elimino correctamente",
      })
      fetchClientes()
    }
  }

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch =
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (cliente.telefono?.includes(searchTerm) ?? false) ||
      (cliente.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (cliente.ciudad?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesEstado = filterEstado === "todos" || cliente.estado === filterEstado
    const matchesClasificacion = filterClasificacion === "todos" || cliente.clasificacion === filterClasificacion

    return matchesSearch && matchesEstado && matchesClasificacion
  })

  const renderStars = (count: number, editable = false, onChange?: (value: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= count ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${editable ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => editable && onChange?.(star)}
          />
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadisticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Clientes</CardDescription>
            <CardTitle className="text-2xl">{clientes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {clientes.filter((c) => c.estado === "activo").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Potenciales</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {clientes.filter((c) => c.estado === "potencial").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Por Amistad</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {clientes.filter((c) => c.clasificacion === "amistad").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros y acciones */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestion de Clientes
              </CardTitle>
              <CardDescription>
                Administra tu cartera de clientes y prospectos
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingCliente
                      ? "Actualiza los datos del cliente"
                      : "Registra un nuevo cliente en tu cartera"}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre *</Label>
                      <Input
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) =>
                          setFormData({ ...formData, nombre: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        value={formData.apellido}
                        onChange={(e) =>
                          setFormData({ ...formData, apellido: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Telefono</Label>
                      <Input
                        id="telefono"
                        value={formData.telefono}
                        onChange={(e) =>
                          setFormData({ ...formData, telefono: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ciudad">Ciudad</Label>
                      <Input
                        id="ciudad"
                        value={formData.ciudad}
                        onChange={(e) =>
                          setFormData({ ...formData, ciudad: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="direccion">Direccion</Label>
                      <Input
                        id="direccion"
                        value={formData.direccion}
                        onChange={(e) =>
                          setFormData({ ...formData, direccion: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="empresa">Empresa</Label>
                      <Input
                        id="empresa"
                        value={formData.empresa}
                        onChange={(e) =>
                          setFormData({ ...formData, empresa: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                        id="cargo"
                        value={formData.cargo}
                        onChange={(e) =>
                          setFormData({ ...formData, cargo: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clasificacion">Clasificacion</Label>
                      <Select
                        value={formData.clasificacion}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            clasificacion: value as "amistad" | "ahorro" | "",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CLASIFICACIONES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estrellas</Label>
                      <div className="pt-2">
                        {renderStars(formData.estrellas, true, (value) =>
                          setFormData({ ...formData, estrellas: value })
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="canal_origen">Como llego</Label>
                      <Select
                        value={formData.canal_origen}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            canal_origen: value as typeof formData.canal_origen,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar canal..." />
                        </SelectTrigger>
                        <SelectContent>
                          {CANALES_ORIGEN.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Select
                        value={formData.estado}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            estado: value as "activo" | "inactivo" | "potencial",
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map((e) => (
                            <SelectItem key={e.value} value={e.value}>
                              {e.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {formData.canal_origen && (
                    <div className="space-y-2">
                      <Label htmlFor="canal_origen_detalle">
                        Detalle del canal de origen
                      </Label>
                      <Input
                        id="canal_origen_detalle"
                        value={formData.canal_origen_detalle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            canal_origen_detalle: e.target.value,
                          })
                        }
                        placeholder="Ej: Nombre del referido, evento especifico, etc."
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) =>
                        setFormData({ ...formData, notas: e.target.value })
                      }
                      placeholder="Notas adicionales sobre el cliente..."
                      rows={3}
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
                    <Button type="submit">
                      {editingCliente ? "Guardar Cambios" : "Crear Cliente"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Barra de busqueda y filtros */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, telefono, email o ciudad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterClasificacion}
                onValueChange={setFilterClasificacion}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Clasificacion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {CLASIFICACIONES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabla de clientes */}
          {filteredClientes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay clientes registrados</p>
              <p className="text-sm">
                Comienza agregando tu primer cliente
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Clasificacion</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {cliente.nombre} {cliente.apellido}
                          </div>
                          {cliente.empresa && (
                            <div className="text-sm text-muted-foreground">
                              {cliente.empresa}
                              {cliente.cargo && ` - ${cliente.cargo}`}
                            </div>
                          )}
                          <div className="mt-1">
                            {renderStars(cliente.estrellas)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {cliente.telefono && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3" />
                              {cliente.telefono}
                            </div>
                          )}
                          {cliente.email && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {cliente.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {cliente.ciudad && (
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {cliente.ciudad}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.clasificacion && (
                          <Badge variant="outline" className="capitalize">
                            {cliente.clasificacion}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {cliente.canal_origen && (
                          <span className="text-sm capitalize">
                            {CANALES_ORIGEN.find(
                              (c) => c.value === cliente.canal_origen
                            )?.label || cliente.canal_origen}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            ESTADOS.find((e) => e.value === cliente.estado)
                              ?.color || "bg-gray-500"
                          } text-white`}
                        >
                          {ESTADOS.find((e) => e.value === cliente.estado)
                            ?.label || cliente.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setHistorialClienteId(cliente.id)}
                            >
                              <History className="h-4 w-4 mr-2" />
                              Ver Historial
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(cliente)}
                            >
                              <Edit2 className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(cliente.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Historial Unificado del Cliente */}
      <Dialog open={!!historialClienteId} onOpenChange={(open) => !open && setHistorialClienteId(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-600" />
              Historial del Cliente
            </DialogTitle>
            <DialogDescription>
              Toda la actividad relacionada con este cliente
            </DialogDescription>
          </DialogHeader>
          {historialClienteId && currentPerfilId && (
            <ClienteHistorialUnificado 
              clienteId={historialClienteId} 
              perfilId={currentPerfilId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
