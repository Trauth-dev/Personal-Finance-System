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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  CalendarClock, 
  MapPin, 
  Clock,
  User,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Calendar
} from "lucide-react"
import { 
  formatDateGMT3, 
  formatDateTimeGMT3, 
  formatTimeGMT3,
  formatForCalendar,
  isToday, 
  isPast, 
  isTomorrow,
  toISOWithGMT3
} from "@/lib/utils/timezone"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface Agendamiento {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  titulo: string
  tipo: "presentacion" | "seguimiento" | "cierre" | "otro"
  lugar: string | null
  fecha_hora: string
  duracion_minutos: number
  estado: "pendiente" | "confirmada" | "realizada" | "cancelada"
  notas: string | null
  created_at: string
  clientes?: Cliente
}

const TIPOS_CITA = [
  { value: "presentacion", label: "Presentacion de producto" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "cierre", label: "Cierre de venta" },
  { value: "otro", label: "Otro" },
]

const ESTADOS_CITA = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-500" },
  { value: "confirmada", label: "Confirmada", color: "bg-blue-500" },
  { value: "realizada", label: "Realizada", color: "bg-green-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-500" },
]

const DURACIONES = [
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 45, label: "45 minutos" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1.5 horas" },
  { value: 120, label: "2 horas" },
]

export function AgendamientosManager({ perfilId }: { perfilId: string }) {
  const [agendamientos, setAgendamientos] = useState<Agendamiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAgendamiento, setEditingAgendamiento] = useState<Agendamiento | null>(null)
  const [filterEstado, setFilterEstado] = useState<string>("todos")
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    titulo: "",
    tipo: "presentacion" as "presentacion" | "seguimiento" | "cierre" | "otro",
    lugar: "",
    fecha: "",
    hora: "",
    duracion_minutos: 60,
    notas: "",
  })

  useEffect(() => {
    fetchData()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    const { data: agendamientosData, error } = await supabase
      .from("crm_agendamientos")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha_hora", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los agendamientos",
        variant: "destructive",
      })
    } else {
      setAgendamientos(agendamientosData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      titulo: "",
      tipo: "presentacion",
      lugar: "",
      fecha: "",
      hora: "",
      duracion_minutos: 60,
      notas: "",
    })
    setEditingAgendamiento(null)
  }

  const handleOpenDialog = (agendamiento?: Agendamiento) => {
    if (agendamiento) {
      setEditingAgendamiento(agendamiento)
      const fechaHora = new Date(agendamiento.fecha_hora)
      setFormData({
        cliente_id: agendamiento.cliente_id,
        titulo: agendamiento.titulo,
        tipo: agendamiento.tipo,
        lugar: agendamiento.lugar || "",
        fecha: fechaHora.toISOString().split("T")[0],
        hora: fechaHora.toTimeString().slice(0, 5),
        duracion_minutos: agendamiento.duracion_minutos,
        notas: agendamiento.notas || "",
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

    const fechaHora = toISOWithGMT3(formData.fecha, formData.hora)

    const agendamientoData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      titulo: formData.titulo,
      tipo: formData.tipo,
      lugar: formData.lugar || null,
      fecha_hora: fechaHora,
      duracion_minutos: formData.duracion_minutos,
      estado: "pendiente" as const,
      notas: formData.notas || null,
    }

    if (editingAgendamiento) {
      const { error } = await supabase
        .from("crm_agendamientos")
        .update({ ...agendamientoData, updated_at: new Date().toISOString() })
        .eq("id", editingAgendamiento.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el agendamiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Agendamiento actualizado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_agendamientos")
        .insert([agendamientoData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el agendamiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Agendamiento creado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleUpdateEstado = async (id: string, estado: string) => {
    const { error } = await supabase
      .from("crm_agendamientos")
      .update({ estado, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (!error) {
      fetchData()
      toast({ title: `Estado actualizado a ${estado}` })
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_agendamientos")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el agendamiento",
        variant: "destructive",
      })
    } else {
      toast({ title: "Agendamiento eliminado" })
      fetchData()
    }
  }

  const filteredAgendamientos = agendamientos.filter((a) => {
    if (filterEstado === "todos") return true
    return a.estado === filterEstado
  })

  const getDateLabel = (fecha: string) => {
    const date = parseISO(fecha)
    if (isToday(date)) return "Hoy"
    if (isTomorrow(date)) return "Manana"
    if (isPast(date)) return "Pasado"
    return formatForCalendar(date)
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
      {/* Estadisticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Citas</CardDescription>
            <CardTitle className="text-2xl">{agendamientos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {agendamientos.filter((a) => a.estado === "pendiente").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Confirmadas</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {agendamientos.filter((a) => a.estado === "confirmada").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Realizadas</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {agendamientos.filter((a) => a.estado === "realizada").length}
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
                <CalendarClock className="h-5 w-5" />
                Agendamientos
              </CardTitle>
              <CardDescription>
                Gestiona tus citas y reuniones con clientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS_CITA.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Cita
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAgendamiento ? "Editar Cita" : "Nueva Cita"}
                    </DialogTitle>
                    <DialogDescription>
                      Programa una reunion con un cliente
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
                    <div className="space-y-2">
                      <Label htmlFor="titulo">Titulo *</Label>
                      <Input
                        id="titulo"
                        value={formData.titulo}
                        onChange={(e) =>
                          setFormData({ ...formData, titulo: e.target.value })
                        }
                        placeholder="Ej: Presentacion de catalogo"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tipo">Tipo de cita</Label>
                        <Select
                          value={formData.tipo}
                          onValueChange={(value) =>
                            setFormData({ ...formData, tipo: value as typeof formData.tipo })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_CITA.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duracion">Duracion</Label>
                        <Select
                          value={formData.duracion_minutos.toString()}
                          onValueChange={(value) =>
                            setFormData({ ...formData, duracion_minutos: parseInt(value) })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DURACIONES.map((d) => (
                              <SelectItem key={d.value} value={d.value.toString()}>
                                {d.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fecha">Fecha *</Label>
                        <Input
                          id="fecha"
                          type="date"
                          value={formData.fecha}
                          onChange={(e) =>
                            setFormData({ ...formData, fecha: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hora">Hora *</Label>
                        <Input
                          id="hora"
                          type="time"
                          value={formData.hora}
                          onChange={(e) =>
                            setFormData({ ...formData, hora: e.target.value })
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lugar">Lugar</Label>
                      <Input
                        id="lugar"
                        value={formData.lugar}
                        onChange={(e) =>
                          setFormData({ ...formData, lugar: e.target.value })
                        }
                        placeholder="Ej: Oficina central, Zoom, etc."
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
                      <Button type="submit">
                        {editingAgendamiento ? "Guardar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAgendamientos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay citas programadas</p>
              <p className="text-sm">Agenda tu primera cita con un cliente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAgendamientos.map((agendamiento) => {
                const estadoInfo = ESTADOS_CITA.find((e) => e.value === agendamiento.estado)
                const fechaHora = new Date(agendamiento.fecha_hora)
                return (
                  <Card key={agendamiento.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center bg-muted rounded-lg p-3 min-w-[70px]">
                          <span className="text-xs text-muted-foreground uppercase">
                            {getDateLabel(agendamiento.fecha_hora)}
                          </span>
                          <span className="text-2xl font-bold">
                            {new Date(agendamiento.fecha_hora).getDate()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeGMT3(agendamiento.fecha_hora)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{agendamiento.titulo}</span>
                            <Badge className={`${estadoInfo?.color} text-white text-xs`}>
                              {estadoInfo?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            <span>
                              {agendamiento.clientes?.nombre} {agendamiento.clientes?.apellido}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            {agendamiento.lugar && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {agendamiento.lugar}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {agendamiento.duracion_minutos} min
                            </span>
                            <span className="capitalize">
                              {TIPOS_CITA.find((t) => t.value === agendamiento.tipo)?.label}
                            </span>
                          </div>
                          {agendamiento.notas && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                              {agendamiento.notas}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {agendamiento.estado !== "realizada" && agendamiento.estado !== "cancelada" && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateEstado(agendamiento.id, "realizada")}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Realizada
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUpdateEstado(agendamiento.id, "cancelada")}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancelar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(agendamiento)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(agendamiento.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
