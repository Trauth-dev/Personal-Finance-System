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
  RotateCcw,
  User,
  Trash2,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Star,
  Calendar
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface Revisita {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  venta_id: string | null
  fecha: string
  satisfaccion: number
  recomendaria: boolean
  compraria_de_nuevo: boolean
  comentarios: string | null
  created_at: string
  clientes?: Cliente
}

export function RevisitasManager({ perfilId }: { perfilId: string }) {
  const [revisitas, setRevisitas] = useState<Revisita[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRevisita, setEditingRevisita] = useState<Revisita | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    satisfaccion: 5,
    recomendaria: true,
    compraria_de_nuevo: true,
    comentarios: "",
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

    const { data: revisitasData, error } = await supabase
      .from("crm_revisitas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las revisitas",
        variant: "destructive",
      })
    } else {
      setRevisitas(revisitasData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      satisfaccion: 5,
      recomendaria: true,
      compraria_de_nuevo: true,
      comentarios: "",
    })
    setEditingRevisita(null)
  }

  const handleOpenDialog = (revisita?: Revisita) => {
    if (revisita) {
      setEditingRevisita(revisita)
      setFormData({
        cliente_id: revisita.cliente_id,
        fecha: revisita.fecha,
        satisfaccion: revisita.satisfaccion,
        recomendaria: revisita.recomendaria,
        compraria_de_nuevo: revisita.compraria_de_nuevo,
        comentarios: revisita.comentarios || "",
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

    const revisitaData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      fecha: formData.fecha,
      satisfaccion: formData.satisfaccion,
      recomendaria: formData.recomendaria,
      compraria_de_nuevo: formData.compraria_de_nuevo,
      comentarios: formData.comentarios || null,
    }

    if (editingRevisita) {
      const { error } = await supabase
        .from("crm_revisitas")
        .update(revisitaData)
        .eq("id", editingRevisita.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la revisita",
          variant: "destructive",
        })
      } else {
        toast({ title: "Revisita actualizada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_revisitas")
        .insert([revisitaData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la revisita",
          variant: "destructive",
        })
      } else {
        toast({ title: "Revisita registrada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_revisitas")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la revisita",
        variant: "destructive",
      })
    } else {
      toast({ title: "Revisita eliminada" })
      fetchData()
    }
  }

  const renderSatisfaccion = (value: number, editable = false, onChange?: (v: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= value ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            } ${editable ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={() => editable && onChange?.(star)}
          />
        ))}
      </div>
    )
  }

  const promedioSatisfaccion = revisitas.length > 0
    ? (revisitas.reduce((acc, r) => acc + r.satisfaccion, 0) / revisitas.length).toFixed(1)
    : "0"

  const porcentajeRecomendaria = revisitas.length > 0
    ? Math.round((revisitas.filter((r) => r.recomendaria).length / revisitas.length) * 100)
    : 0

  const porcentajeCompraria = revisitas.length > 0
    ? Math.round((revisitas.filter((r) => r.compraria_de_nuevo).length / revisitas.length) * 100)
    : 0

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
            <CardDescription>Total Re-visitas</CardDescription>
            <CardTitle className="text-2xl">{revisitas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Satisfaccion Promedio</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {promedioSatisfaccion}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recomendarian</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              {porcentajeRecomendaria}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Comprarian de nuevo</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {porcentajeCompraria}%
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
                <RotateCcw className="h-5 w-5" />
                Re-visitas
              </CardTitle>
              <CardDescription>
                Evalua la satisfaccion post-venta de tus clientes
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Re-visita
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRevisita ? "Editar Re-visita" : "Nueva Re-visita"}
                  </DialogTitle>
                  <DialogDescription>
                    Registra la evaluacion de satisfaccion del cliente
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
                    <Label htmlFor="fecha">Fecha de la revisita</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nivel de satisfaccion (1-5)</Label>
                    <div className="pt-1">
                      {renderSatisfaccion(formData.satisfaccion, true, (v) =>
                        setFormData({ ...formData, satisfaccion: v })
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="recomendaria"
                        checked={formData.recomendaria}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, recomendaria: !!checked })
                        }
                      />
                      <Label htmlFor="recomendaria" className="cursor-pointer">
                        Recomendaria el producto/servicio
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="compraria"
                        checked={formData.compraria_de_nuevo}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, compraria_de_nuevo: !!checked })
                        }
                      />
                      <Label htmlFor="compraria" className="cursor-pointer">
                        Compraria de nuevo
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comentarios">Comentarios adicionales</Label>
                    <Textarea
                      id="comentarios"
                      value={formData.comentarios}
                      onChange={(e) =>
                        setFormData({ ...formData, comentarios: e.target.value })
                      }
                      placeholder="Feedback del cliente, sugerencias, etc."
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
                      {editingRevisita ? "Guardar" : "Registrar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {revisitas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay re-visitas</p>
              <p className="text-sm">Registra la primera evaluacion de satisfaccion</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revisitas.map((revisita) => (
                <Card key={revisita.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {revisita.clientes?.nombre} {revisita.clientes?.apellido}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(revisita.fecha), "PPP", { locale: es })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mb-2">
                          {renderSatisfaccion(revisita.satisfaccion)}
                          <Badge
                            variant="outline"
                            className={revisita.recomendaria ? "border-green-500 text-green-600" : "border-red-500 text-red-600"}
                          >
                            {revisita.recomendaria ? (
                              <ThumbsUp className="h-3 w-3 mr-1" />
                            ) : (
                              <ThumbsDown className="h-3 w-3 mr-1" />
                            )}
                            {revisita.recomendaria ? "Recomendaria" : "No recomendaria"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={revisita.compraria_de_nuevo ? "border-blue-500 text-blue-600" : "border-gray-500 text-gray-600"}
                          >
                            {revisita.compraria_de_nuevo ? "Compraria de nuevo" : "No compraria de nuevo"}
                          </Badge>
                        </div>
                        {revisita.comentarios && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {revisita.comentarios}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(revisita)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(revisita.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
