"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  ClipboardList, 
  Calendar, 
  CheckCircle2, 
  Clock,
  User,
  Bell,
  Trash2,
  Edit2
} from "lucide-react"
import { format, addDays, addWeeks, addMonths, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
  telefono: string | null
}

interface Seguimiento {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  nota: string
  recordatorio_tipo: "semanal" | "quincenal" | "mensual" | "personalizado" | null
  recordatorio_fecha: string | null
  recordatorio_completado: boolean
  created_at: string
  clientes?: Cliente
}

const RECORDATORIO_TIPOS = [
  { value: "semanal", label: "Cada semana", days: 7 },
  { value: "quincenal", label: "Cada 2 semanas", days: 14 },
  { value: "mensual", label: "Cada mes", days: 30 },
  { value: "personalizado", label: "Fecha personalizada", days: 0 },
]

export function SeguimientosManager({ perfilId }: { perfilId: string }) {
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSeguimiento, setEditingSeguimiento] = useState<Seguimiento | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("pendientes")
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    nota: "",
    recordatorio_tipo: "" as "semanal" | "quincenal" | "mensual" | "personalizado" | "",
    recordatorio_fecha: "",
  })

  useEffect(() => {
    fetchData()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch clientes
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido, telefono")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    // Fetch seguimientos con datos del cliente
    const { data: seguimientosData, error } = await supabase
      .from("crm_seguimientos")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido, telefono)
      `)
      .eq("perfil_id", perfilId)
      .order("recordatorio_fecha", { ascending: true })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los seguimientos",
        variant: "destructive",
      })
    } else {
      setSeguimientos(seguimientosData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      nota: "",
      recordatorio_tipo: "",
      recordatorio_fecha: "",
    })
    setEditingSeguimiento(null)
  }

  const calcularFechaRecordatorio = (tipo: string) => {
    const hoy = new Date()
    switch (tipo) {
      case "semanal":
        return format(addWeeks(hoy, 1), "yyyy-MM-dd")
      case "quincenal":
        return format(addDays(hoy, 14), "yyyy-MM-dd")
      case "mensual":
        return format(addMonths(hoy, 1), "yyyy-MM-dd")
      default:
        return ""
    }
  }

  const handleOpenDialog = (seguimiento?: Seguimiento) => {
    if (seguimiento) {
      setEditingSeguimiento(seguimiento)
      setFormData({
        cliente_id: seguimiento.cliente_id,
        nota: seguimiento.nota,
        recordatorio_tipo: seguimiento.recordatorio_tipo || "",
        recordatorio_fecha: seguimiento.recordatorio_fecha || "",
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

    let fechaRecordatorio = formData.recordatorio_fecha
    if (formData.recordatorio_tipo && formData.recordatorio_tipo !== "personalizado") {
      fechaRecordatorio = calcularFechaRecordatorio(formData.recordatorio_tipo)
    }

    const seguimientoData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      nota: formData.nota,
      recordatorio_tipo: formData.recordatorio_tipo || null,
      recordatorio_fecha: fechaRecordatorio || null,
      recordatorio_completado: false,
    }

    if (editingSeguimiento) {
      const { error } = await supabase
        .from("crm_seguimientos")
        .update(seguimientoData)
        .eq("id", editingSeguimiento.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el seguimiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Seguimiento actualizado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_seguimientos")
        .insert([seguimientoData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el seguimiento",
          variant: "destructive",
        })
      } else {
        toast({ title: "Seguimiento creado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleToggleCompletado = async (id: string, completado: boolean) => {
    const { error } = await supabase
      .from("crm_seguimientos")
      .update({ recordatorio_completado: !completado })
      .eq("id", id)

    if (!error) {
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_seguimientos")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el seguimiento",
        variant: "destructive",
      })
    } else {
      toast({ title: "Seguimiento eliminado" })
      fetchData()
    }
  }

  const filteredSeguimientos = seguimientos.filter((s) => {
    if (filterStatus === "pendientes") return !s.recordatorio_completado
    if (filterStatus === "completados") return s.recordatorio_completado
    return true
  })

  const getRecordatorioStatus = (fecha: string | null, completado: boolean) => {
    if (completado) return { color: "bg-green-500", label: "Completado" }
    if (!fecha) return { color: "bg-gray-500", label: "Sin fecha" }
    if (isToday(new Date(fecha))) return { color: "bg-yellow-500", label: "Hoy" }
    if (isPast(new Date(fecha))) return { color: "bg-red-500", label: "Vencido" }
    return { color: "bg-blue-500", label: "Pendiente" }
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
            <CardDescription>Total Seguimientos</CardDescription>
            <CardTitle className="text-2xl">{seguimientos.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {seguimientos.filter((s) => !s.recordatorio_completado).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Para Hoy</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {seguimientos.filter((s) => 
                s.recordatorio_fecha && isToday(new Date(s.recordatorio_fecha)) && !s.recordatorio_completado
              ).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencidos</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {seguimientos.filter((s) => 
                s.recordatorio_fecha && isPast(new Date(s.recordatorio_fecha)) && !s.recordatorio_completado
              ).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista de seguimientos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Seguimientos
              </CardTitle>
              <CardDescription>
                Gestiona tus recordatorios y notas de seguimiento
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendientes">Pendientes</SelectItem>
                  <SelectItem value="completados">Completados</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingSeguimiento ? "Editar Seguimiento" : "Nuevo Seguimiento"}
                    </DialogTitle>
                    <DialogDescription>
                      Agrega una nota de seguimiento para un cliente
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
                      <Label htmlFor="nota">Nota *</Label>
                      <Textarea
                        id="nota"
                        value={formData.nota}
                        onChange={(e) =>
                          setFormData({ ...formData, nota: e.target.value })
                        }
                        placeholder="Escribe la nota de seguimiento..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recordatorio">Recordatorio</Label>
                      <Select
                        value={formData.recordatorio_tipo}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            recordatorio_tipo: value as typeof formData.recordatorio_tipo,
                            recordatorio_fecha: value !== "personalizado" ? "" : formData.recordatorio_fecha,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sin recordatorio" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECORDATORIO_TIPOS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.recordatorio_tipo === "personalizado" && (
                      <div className="space-y-2">
                        <Label htmlFor="fecha">Fecha del recordatorio</Label>
                        <Input
                          id="fecha"
                          type="date"
                          value={formData.recordatorio_fecha}
                          onChange={(e) =>
                            setFormData({ ...formData, recordatorio_fecha: e.target.value })
                          }
                        />
                      </div>
                    )}
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
                        {editingSeguimiento ? "Guardar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSeguimientos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay seguimientos</p>
              <p className="text-sm">Agrega tu primer seguimiento para un cliente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSeguimientos.map((seguimiento) => {
                const status = getRecordatorioStatus(
                  seguimiento.recordatorio_fecha,
                  seguimiento.recordatorio_completado
                )
                return (
                  <Card key={seguimiento.id} className={seguimiento.recordatorio_completado ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={seguimiento.recordatorio_completado}
                          onCheckedChange={() =>
                            handleToggleCompletado(seguimiento.id, seguimiento.recordatorio_completado)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {seguimiento.clientes?.nombre} {seguimiento.clientes?.apellido}
                            </span>
                            <Badge className={`${status.color} text-white text-xs`}>
                              {status.label}
                            </Badge>
                          </div>
                          <p className={`text-sm ${seguimiento.recordatorio_completado ? "line-through" : ""}`}>
                            {seguimiento.nota}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {seguimiento.recordatorio_fecha && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(seguimiento.recordatorio_fecha), "PPP", { locale: es })}
                              </span>
                            )}
                            {seguimiento.recordatorio_tipo && (
                              <span className="flex items-center gap-1">
                                <Bell className="h-3 w-3" />
                                {RECORDATORIO_TIPOS.find((r) => r.value === seguimiento.recordatorio_tipo)?.label}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(seguimiento)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(seguimiento.id)}
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
