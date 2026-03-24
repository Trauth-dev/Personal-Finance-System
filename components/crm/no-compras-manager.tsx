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
  XCircle,
  User,
  Trash2,
  Edit2,
  Calendar,
  RefreshCcw
} from "lucide-react"
import { format, isPast, isToday } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface NoCompra {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  motivo: string
  detalle: string | null
  fecha: string
  recontactar: boolean
  fecha_recontacto: string | null
  created_at: string
  clientes?: Cliente
}

const MOTIVOS_NO_COMPRA = [
  { value: "precio", label: "Precio muy alto" },
  { value: "competencia", label: "Eligio competencia" },
  { value: "timing", label: "No es el momento" },
  { value: "desconfianza", label: "No confio en el producto" },
  { value: "necesidad", label: "No tiene la necesidad" },
  { value: "presupuesto", label: "Sin presupuesto" },
  { value: "decision", label: "No toma la decision" },
  { value: "otro", label: "Otro motivo" },
]

export function NoComprasManager({ perfilId }: { perfilId: string }) {
  const [noCompras, setNoCompras] = useState<NoCompra[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingNoCompra, setEditingNoCompra] = useState<NoCompra | null>(null)
  const [filterRecontactar, setFilterRecontactar] = useState<string>("todos")
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    motivo: "",
    detalle: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    recontactar: false,
    fecha_recontacto: "",
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

    const { data: noComprasData, error } = await supabase
      .from("crm_no_compras")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("created_at", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los registros",
        variant: "destructive",
      })
    } else {
      setNoCompras(noComprasData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      motivo: "",
      detalle: "",
      fecha: format(new Date(), "yyyy-MM-dd"),
      recontactar: false,
      fecha_recontacto: "",
    })
    setEditingNoCompra(null)
  }

  const handleOpenDialog = (noCompra?: NoCompra) => {
    if (noCompra) {
      setEditingNoCompra(noCompra)
      setFormData({
        cliente_id: noCompra.cliente_id,
        motivo: noCompra.motivo,
        detalle: noCompra.detalle || "",
        fecha: noCompra.fecha,
        recontactar: noCompra.recontactar,
        fecha_recontacto: noCompra.fecha_recontacto || "",
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

    const noCompraData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      motivo: formData.motivo,
      detalle: formData.detalle || null,
      fecha: formData.fecha,
      recontactar: formData.recontactar,
      fecha_recontacto: formData.recontactar ? formData.fecha_recontacto : null,
    }

    if (editingNoCompra) {
      const { error } = await supabase
        .from("crm_no_compras")
        .update(noCompraData)
        .eq("id", editingNoCompra.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el registro",
          variant: "destructive",
        })
      } else {
        toast({ title: "Registro actualizado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { error } = await supabase
        .from("crm_no_compras")
        .insert([noCompraData])

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear el registro",
          variant: "destructive",
        })
      } else {
        toast({ title: "Registro creado" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("crm_no_compras")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      })
    } else {
      toast({ title: "Registro eliminado" })
      fetchData()
    }
  }

  const filteredNoCompras = noCompras.filter((nc) => {
    if (filterRecontactar === "todos") return true
    if (filterRecontactar === "pendientes") {
      return nc.recontactar && nc.fecha_recontacto && !isPast(new Date(nc.fecha_recontacto))
    }
    if (filterRecontactar === "vencidos") {
      return nc.recontactar && nc.fecha_recontacto && isPast(new Date(nc.fecha_recontacto))
    }
    return true
  })

  // Estadisticas por motivo
  const motivoStats = MOTIVOS_NO_COMPRA.map((m) => ({
    ...m,
    count: noCompras.filter((nc) => nc.motivo === m.value).length,
  })).sort((a, b) => b.count - a.count)

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
            <CardDescription>Total No Compras</CardDescription>
            <CardTitle className="text-2xl">{noCompras.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Para Re-contactar</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {noCompras.filter((nc) => nc.recontactar).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Re-contacto Pendiente</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">
              {noCompras.filter((nc) => 
                nc.recontactar && nc.fecha_recontacto && 
                (isToday(new Date(nc.fecha_recontacto)) || !isPast(new Date(nc.fecha_recontacto)))
              ).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Motivo Principal</CardDescription>
            <CardTitle className="text-lg text-muted-foreground">
              {motivoStats[0]?.count > 0 ? motivoStats[0].label : "N/A"}
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
                <XCircle className="h-5 w-5" />
                Registro de No Compras
              </CardTitle>
              <CardDescription>
                Analiza los motivos de no compra para mejorar tu estrategia
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterRecontactar} onValueChange={setFilterRecontactar}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendientes">Por re-contactar</SelectItem>
                  <SelectItem value="vencidos">Re-contacto vencido</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Registrar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingNoCompra ? "Editar Registro" : "Registrar No Compra"}
                    </DialogTitle>
                    <DialogDescription>
                      Documenta el motivo por el cual el cliente no compro
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
                      <Label htmlFor="motivo">Motivo principal *</Label>
                      <Select
                        value={formData.motivo}
                        onValueChange={(value) =>
                          setFormData({ ...formData, motivo: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar motivo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MOTIVOS_NO_COMPRA.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detalle">Detalle</Label>
                      <Textarea
                        id="detalle"
                        value={formData.detalle}
                        onChange={(e) =>
                          setFormData({ ...formData, detalle: e.target.value })
                        }
                        placeholder="Describe los detalles del motivo..."
                        rows={3}
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
                        id="recontactar"
                        checked={formData.recontactar}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, recontactar: !!checked })
                        }
                      />
                      <Label htmlFor="recontactar" className="cursor-pointer">
                        Programar re-contacto
                      </Label>
                    </div>
                    {formData.recontactar && (
                      <div className="space-y-2">
                        <Label htmlFor="fecha_recontacto">Fecha de re-contacto</Label>
                        <Input
                          id="fecha_recontacto"
                          type="date"
                          value={formData.fecha_recontacto}
                          onChange={(e) =>
                            setFormData({ ...formData, fecha_recontacto: e.target.value })
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
                        {editingNoCompra ? "Guardar" : "Registrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNoCompras.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay registros</p>
              <p className="text-sm">Documenta los motivos de no compra para analizar patrones</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNoCompras.map((noCompra) => {
                const motivoInfo = MOTIVOS_NO_COMPRA.find((m) => m.value === noCompra.motivo)
                const recontactoVencido = noCompra.recontactar && 
                  noCompra.fecha_recontacto && 
                  isPast(new Date(noCompra.fecha_recontacto))
                
                return (
                  <Card key={noCompra.id} className={recontactoVencido ? "border-red-200" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {noCompra.clientes?.nombre} {noCompra.clientes?.apellido}
                            </span>
                            <Badge variant="outline">
                              {motivoInfo?.label || noCompra.motivo}
                            </Badge>
                          </div>
                          {noCompra.detalle && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {noCompra.detalle}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(noCompra.fecha), "PPP", { locale: es })}
                            </span>
                            {noCompra.recontactar && noCompra.fecha_recontacto && (
                              <Badge 
                                variant={recontactoVencido ? "destructive" : "secondary"}
                                className="flex items-center gap-1"
                              >
                                <RefreshCcw className="h-3 w-3" />
                                Re-contactar: {format(new Date(noCompra.fecha_recontacto), "dd/MM/yyyy")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(noCompra)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(noCompra.id)}
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

      {/* Analisis de Motivos */}
      {noCompras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analisis de Motivos</CardTitle>
            <CardDescription>Distribucion de razones de no compra</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {motivoStats.filter((m) => m.count > 0).map((motivo) => (
                <div key={motivo.value} className="flex items-center gap-4">
                  <span className="text-sm w-40 truncate">{motivo.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${(motivo.count / noCompras.length) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{motivo.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
