"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  MoreVertical, 
  User, 
  DollarSign, 
  Calendar,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit,
  Eye,
  Phone,
  Mail
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Etapa {
  id: string
  nombre: string
  color: string
  orden: number
  es_final: boolean
  es_ganado: boolean
}

interface Cliente {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  ciudad: string | null
}

interface Oportunidad {
  id: string
  cliente_id: string
  etapa_id: string
  titulo: string
  monto_estimado: number | null
  probabilidad: number
  fecha_cierre_estimada: string | null
  notas: string | null
  prioridad: string
  created_at: string
  updated_at: string
  cliente?: Cliente
}

interface PipelineKanbanProps {
  perfilId: string
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: "bg-slate-100 text-slate-700 border-slate-200",
  media: "bg-blue-100 text-blue-700 border-blue-200",
  alta: "bg-orange-100 text-orange-700 border-orange-200",
  urgente: "bg-red-100 text-red-700 border-red-200",
}

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("PYG", "Gs")
}

export function PipelineKanban({ perfilId }: PipelineKanbanProps) {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOportunidad, setEditingOportunidad] = useState<Oportunidad | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Form state
  const [clienteId, setClienteId] = useState("")
  const [titulo, setTitulo] = useState("")
  const [montoEstimado, setMontoEstimado] = useState("")
  const [probabilidad, setProbabilidad] = useState("50")
  const [fechaCierreEstimada, setFechaCierreEstimada] = useState("")
  const [notas, setNotas] = useState("")
  const [prioridad, setPrioridad] = useState("media")
  const [etapaId, setEtapaId] = useState("")

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [perfilId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load etapas
      const { data: etapasData, error: etapasError } = await supabase
        .from("crm_pipeline_etapas")
        .select("*")
        .eq("user_id", user.id)
        .order("orden", { ascending: true })

      if (etapasError) throw etapasError
      setEtapas(etapasData || [])

      // Set default etapa for new oportunidades
      if (etapasData && etapasData.length > 0) {
        setEtapaId(etapasData[0].id)
      }

      // Load oportunidades with cliente data
      const { data: oportunidadesData, error: oportunidadesError } = await supabase
        .from("crm_oportunidades")
        .select(`
          *,
          cliente:clientes(id, nombre, telefono, email, ciudad)
        `)
        .eq("perfil_id", perfilId)

      if (oportunidadesError) throw oportunidadesError
      setOportunidades(oportunidadesData || [])

      // Load clientes for dropdown
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nombre, telefono, email, ciudad")
        .eq("user_id", user.id)
        .order("nombre", { ascending: true })

      if (clientesError) throw clientesError
      setClientes(clientesData || [])

    } catch (error) {
      console.error("Error loading pipeline data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del pipeline",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setClienteId("")
    setTitulo("")
    setMontoEstimado("")
    setProbabilidad("50")
    setFechaCierreEstimada("")
    setNotas("")
    setPrioridad("media")
    if (etapas.length > 0) {
      setEtapaId(etapas[0].id)
    }
    setEditingOportunidad(null)
  }

  const handleOpenDialog = (oportunidad?: Oportunidad) => {
    if (oportunidad) {
      setEditingOportunidad(oportunidad)
      setClienteId(oportunidad.cliente_id)
      setTitulo(oportunidad.titulo)
      setMontoEstimado(oportunidad.monto_estimado?.toString() || "")
      setProbabilidad(oportunidad.probabilidad.toString())
      setFechaCierreEstimada(oportunidad.fecha_cierre_estimada || "")
      setNotas(oportunidad.notas || "")
      setPrioridad(oportunidad.prioridad)
      setEtapaId(oportunidad.etapa_id)
    } else {
      resetForm()
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!clienteId || !titulo) {
      toast({
        title: "Error",
        description: "Cliente y titulo son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      const oportunidadData = {
        perfil_id: perfilId,
        cliente_id: clienteId,
        etapa_id: etapaId,
        titulo,
        monto_estimado: montoEstimado ? parseInt(montoEstimado) : null,
        probabilidad: parseInt(probabilidad),
        fecha_cierre_estimada: fechaCierreEstimada || null,
        notas: notas || null,
        prioridad,
      }

      if (editingOportunidad) {
        const { error } = await supabase
          .from("crm_oportunidades")
          .update(oportunidadData)
          .eq("id", editingOportunidad.id)

        if (error) throw error
        toast({ title: "Oportunidad actualizada" })
      } else {
        const { error } = await supabase
          .from("crm_oportunidades")
          .insert(oportunidadData)

        if (error) throw error
        toast({ title: "Oportunidad creada" })
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error) {
      console.error("Error saving oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la oportunidad",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta oportunidad?")) return

    try {
      const { error } = await supabase
        .from("crm_oportunidades")
        .delete()
        .eq("id", id)

      if (error) throw error
      toast({ title: "Oportunidad eliminada" })
      loadData()
    } catch (error) {
      console.error("Error deleting oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la oportunidad",
        variant: "destructive",
      })
    }
  }

  const moveOportunidad = async (oportunidadId: string, newEtapaId: string) => {
    try {
      const oldOportunidad = oportunidades.find(o => o.id === oportunidadId)
      if (!oldOportunidad || oldOportunidad.etapa_id === newEtapaId) return

      // Update oportunidad
      const { error: updateError } = await supabase
        .from("crm_oportunidades")
        .update({ etapa_id: newEtapaId })
        .eq("id", oportunidadId)

      if (updateError) throw updateError

      // Log history
      const { error: historyError } = await supabase
        .from("crm_pipeline_historial")
        .insert({
          oportunidad_id: oportunidadId,
          etapa_anterior_id: oldOportunidad.etapa_id,
          etapa_nueva_id: newEtapaId,
        })

      if (historyError) console.error("Error logging history:", historyError)

      // Update local state immediately for better UX
      setOportunidades(prev => 
        prev.map(o => o.id === oportunidadId ? { ...o, etapa_id: newEtapaId } : o)
      )

      const newEtapa = etapas.find(e => e.id === newEtapaId)
      toast({ 
        title: "Oportunidad movida",
        description: `Movida a "${newEtapa?.nombre}"` 
      })
    } catch (error) {
      console.error("Error moving oportunidad:", error)
      toast({
        title: "Error",
        description: "No se pudo mover la oportunidad",
        variant: "destructive",
      })
    }
  }

  const getOportunidadesByEtapa = (etapaId: string) => {
    return oportunidades.filter(o => o.etapa_id === etapaId)
  }

  const getTotalByEtapa = (etapaId: string) => {
    return getOportunidadesByEtapa(etapaId)
      .reduce((sum, o) => sum + (o.monto_estimado || 0), 0)
  }

  const getAdjacentEtapas = (currentEtapaId: string) => {
    const currentIndex = etapas.findIndex(e => e.id === currentEtapaId)
    return {
      prev: currentIndex > 0 ? etapas[currentIndex - 1] : null,
      next: currentIndex < etapas.length - 1 ? etapas[currentIndex + 1] : null,
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pipeline de Ventas</h2>
          <p className="text-sm text-muted-foreground">
            {oportunidades.length} oportunidades | Total: {formatMoney(oportunidades.reduce((sum, o) => sum + (o.monto_estimado || 0), 0))}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Oportunidad
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingOportunidad ? "Editar Oportunidad" : "Nueva Oportunidad"}
              </DialogTitle>
              <DialogDescription>
                {editingOportunidad 
                  ? "Modifica los datos de la oportunidad" 
                  : "Agrega una nueva oportunidad al pipeline"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="titulo">Titulo *</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej: Venta producto X"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="monto">Monto Estimado (Gs)</Label>
                  <Input
                    id="monto"
                    type="number"
                    value={montoEstimado}
                    onChange={(e) => setMontoEstimado(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="probabilidad">Probabilidad (%)</Label>
                  <Input
                    id="probabilidad"
                    type="number"
                    min="0"
                    max="100"
                    value={probabilidad}
                    onChange={(e) => setProbabilidad(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="etapa">Etapa</Label>
                  <Select value={etapaId} onValueChange={setEtapaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {etapas.map(etapa => (
                        <SelectItem key={etapa.id} value={etapa.id}>
                          {etapa.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select value={prioridad} onValueChange={setPrioridad}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha Cierre Estimada</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fechaCierreEstimada}
                  onChange={(e) => setFechaCierreEstimada(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                {editingOportunidad ? "Guardar Cambios" : "Crear Oportunidad"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {etapas.map(etapa => {
          const etapaOportunidades = getOportunidadesByEtapa(etapa.id)
          const total = getTotalByEtapa(etapa.id)

          return (
            <div
              key={etapa.id}
              className="flex-shrink-0 w-80 bg-muted/30 rounded-lg"
            >
              {/* Column Header */}
              <div 
                className="p-3 rounded-t-lg border-b-2"
                style={{ borderColor: etapa.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: etapa.color }}
                    />
                    <h3 className="font-medium">{etapa.nombre}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {etapaOportunidades.length}
                    </Badge>
                  </div>
                </div>
                {total > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatMoney(total)}
                  </p>
                )}
              </div>

              {/* Cards Container */}
              <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
                {etapaOportunidades.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Sin oportunidades
                  </div>
                ) : (
                  etapaOportunidades.map(oportunidad => {
                    const { prev, next } = getAdjacentEtapas(oportunidad.etapa_id)
                    
                    return (
                      <Card 
                        key={oportunidad.id} 
                        className="bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <CardContent className="p-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {oportunidad.titulo}
                              </h4>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <User className="h-3 w-3" />
                                <span className="truncate">
                                  {oportunidad.cliente?.nombre || "Sin cliente"}
                                </span>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(oportunidad)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(oportunidad.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Monto y Probabilidad */}
                          {oportunidad.monto_estimado && (
                            <div className="flex items-center gap-1 text-sm font-medium text-green-600 mb-2">
                              <DollarSign className="h-3 w-3" />
                              {formatMoney(oportunidad.monto_estimado)}
                              <span className="text-muted-foreground text-xs ml-1">
                                ({oportunidad.probabilidad}%)
                              </span>
                            </div>
                          )}

                          {/* Cliente Info */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {oportunidad.cliente?.telefono && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {oportunidad.cliente.telefono}
                              </Badge>
                            )}
                            {oportunidad.cliente?.ciudad && (
                              <Badge variant="outline" className="text-xs">
                                {oportunidad.cliente.ciudad}
                              </Badge>
                            )}
                          </div>

                          {/* Prioridad y Fecha */}
                          <div className="flex items-center justify-between">
                            <Badge className={`text-xs ${PRIORIDAD_COLORS[oportunidad.prioridad]}`}>
                              {oportunidad.prioridad}
                            </Badge>
                            {oportunidad.fecha_cierre_estimada && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(oportunidad.fecha_cierre_estimada).toLocaleDateString('es-PY')}
                              </span>
                            )}
                          </div>

                          {/* Move Buttons */}
                          <div className="flex items-center justify-between mt-3 pt-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!prev}
                              onClick={() => prev && moveOportunidad(oportunidad.id, prev.id)}
                            >
                              <ChevronLeft className="h-3 w-3 mr-1" />
                              {prev?.nombre || ""}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!next}
                              onClick={() => next && moveOportunidad(oportunidad.id, next.id)}
                            >
                              {next?.nombre || ""}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty State */}
      {etapas.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No se encontraron etapas del pipeline.
          </p>
          <Button variant="outline" onClick={loadData}>
            Recargar
          </Button>
        </Card>
      )}
    </div>
  )
}
