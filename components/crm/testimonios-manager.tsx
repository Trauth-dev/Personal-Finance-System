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
  MessageSquare, 
  User,
  Trash2,
  Edit2,
  Star,
  Quote,
  Award,
  Heart
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface Testimonio {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  venta_id: string | null
  tipo: "conformidad" | "logro"
  texto: string
  fecha: string
  destacado: boolean
  created_at: string
  clientes?: Cliente
}

const TIPOS_TESTIMONIO = [
  { value: "conformidad", label: "Conformidad", icon: Heart, color: "text-pink-500" },
  { value: "logro", label: "Logro", icon: Award, color: "text-yellow-500" },
]

export function TestimoniosManager({ perfilId }: { perfilId: string }) {
  const [testimonios, setTestimonios] = useState<Testimonio[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTestimonio, setEditingTestimonio] = useState<Testimonio | null>(null)
  const [filterTipo, setFilterTipo] = useState<string>("todos")
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    tipo: "conformidad" as "conformidad" | "logro",
    texto: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    destacado: false,
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

    const { data: testimoniosData, error } = await supabase
      .from("crm_testimonios")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("destacado", { ascending: false })
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los testimonios",
        variant: "destructive",
      })
    } else {
      setTestimonios(testimoniosData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      tipo: "conformidad",
      texto: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      destacado: false,
    })
    setEditingTestimonio(null)
  }

  const handleOpenDialog = (testimonio?: Testimonio) => {
    if (testimonio) {
      setEditingTestimonio(testimonio)
      setFormData({
        cliente_id: testimonio.cliente_id,
        tipo: testimonio.tipo,
        texto: testimonio.texto,
        fecha: testimonio.fecha,
        destacado: testimonio.destacado,
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

    const testimonioData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      tipo: formData.tipo,
      texto: formData.texto,
      fecha: formData.fecha,
      destacado: formData.destacado,
    }

    if (editingTestimonio) {
      const { error } = await supabase
        .from("crm_testimonios")
        .update(testimonioData)
        .eq("id", editingTestimonio.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el testimonio",
          variant: "destructive",
        })
      } else {
        toast({ title: "Testimonio actualizado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_testimonios")
        .insert([testimonioData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el testimonio",
          variant: "destructive",
        })
      } else {
        toast({ title: "Testimonio registrado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleToggleDestacado = async (id: string, destacado: boolean) => {
    const { error } = await supabase
      .from("crm_testimonios")
      .update({ destacado: !destacado })
      .eq("id", id)

    if (!error) {
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_testimonios")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el testimonio",
        variant: "destructive",
      })
    } else {
      toast({ title: "Testimonio eliminado" })
      fetchData()
    }
  }

  const filteredTestimonios = testimonios.filter((t) => {
    if (filterTipo === "todos") return true
    if (filterTipo === "destacados") return t.destacado
    return t.tipo === filterTipo
  })

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
            <CardDescription>Total Testimonios</CardDescription>
            <CardTitle className="text-2xl">{testimonios.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conformidad</CardDescription>
            <CardTitle className="text-2xl text-pink-600">
              {testimonios.filter((t) => t.tipo === "conformidad").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Logros</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {testimonios.filter((t) => t.tipo === "logro").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Destacados</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {testimonios.filter((t) => t.destacado).length}
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
                <MessageSquare className="h-5 w-5" />
                Testimonios
              </CardTitle>
              <CardDescription>
                Registra la conformidad y logros de tus clientes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="destacados">Destacados</SelectItem>
                  <SelectItem value="conformidad">Conformidad</SelectItem>
                  <SelectItem value="logro">Logros</SelectItem>
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
                      {editingTestimonio ? "Editar Testimonio" : "Nuevo Testimonio"}
                    </DialogTitle>
                    <DialogDescription>
                      Registra un testimonio de conformidad o logro
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
                      <Label htmlFor="tipo">Tipo de Testimonio</Label>
                      <Select
                        value={formData.tipo}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo: value as "conformidad" | "logro" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_TESTIMONIO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div className="flex items-center gap-2">
                                <t.icon className={`h-4 w-4 ${t.color}`} />
                                {t.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="texto">Testimonio *</Label>
                      <Textarea
                        id="texto"
                        value={formData.texto}
                        onChange={(e) =>
                          setFormData({ ...formData, texto: e.target.value })
                        }
                        placeholder="Escribe el testimonio del cliente..."
                        rows={4}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) =>
                          setFormData({ ...formData, fecha: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="destacado"
                        checked={formData.destacado}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, destacado: !!checked })
                        }
                      />
                      <Label htmlFor="destacado" className="cursor-pointer">
                        Marcar como destacado
                      </Label>
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
                        {editingTestimonio ? "Guardar" : "Registrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTestimonios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay testimonios</p>
              <p className="text-sm">Registra el primer testimonio de un cliente</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTestimonios.map((testimonio) => {
                const tipoInfo = TIPOS_TESTIMONIO.find((t) => t.value === testimonio.tipo)
                const TipoIcon = tipoInfo?.icon || MessageSquare
                return (
                  <Card key={testimonio.id} className={testimonio.destacado ? "border-yellow-400 border-2" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full bg-muted ${tipoInfo?.color}`}>
                          <TipoIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">
                              {testimonio.clientes?.nombre} {testimonio.clientes?.apellido}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {tipoInfo?.label}
                            </Badge>
                            {testimonio.destacado && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          <div className="relative mb-2">
                            <Quote className="absolute -left-1 -top-1 h-4 w-4 text-muted-foreground/50" />
                            <p className="text-sm pl-4 italic">"{testimonio.texto}"</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(testimonio.fecha), "PPP", { locale: es })}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleDestacado(testimonio.id, testimonio.destacado)}
                            title={testimonio.destacado ? "Quitar destacado" : "Destacar"}
                          >
                            <Star className={`h-4 w-4 ${testimonio.destacado ? "fill-yellow-400 text-yellow-400" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(testimonio)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(testimonio.id)}
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
