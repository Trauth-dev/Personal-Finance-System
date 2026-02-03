"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { useToast } from "@/hooks/use-toast"
import { Plus, Repeat, Trash2, Calendar, TrendingUp, Award, RefreshCw } from "lucide-react"

interface HabitoRecurrente {
  id: string
  nombre: string
  descripcion: string | null
  frecuencia: "diario" | "semanal" | "mensual"
  dias_semana: number[] | null
  dia_mes: number | null
  activo: boolean
  racha_actual: number
  mejor_racha: number
  created_at: string
}

interface RegistroHabito {
  id: string
  habito_id: string
  fecha: string
  completado: boolean
}

export function HabitosRecurrentesManager() {
  const { perfilActual } = usePerfil()
  const { toast } = useToast()
  const [habitos, setHabitos] = useState<HabitoRecurrente[]>([])
  const [registrosHoy, setRegistrosHoy] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    frecuencia: "diario" as "diario" | "semanal" | "mensual",
    dias_semana: [] as number[],
    dia_mes: 1,
  })

  const diasSemana = [
    { value: 0, label: "Dom" },
    { value: 1, label: "Lun" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Mié" },
    { value: 4, label: "Jue" },
    { value: 5, label: "Vie" },
    { value: 6, label: "Sáb" },
  ]

  useEffect(() => {
    if (perfilActual) {
      fetchHabitos()
    }
  }, [perfilActual])

  const fetchHabitos = async () => {
    if (!perfilActual) return
    setLoading(true)

    const supabase = createClient()
    const hoy = new Date().toISOString().split("T")[0]

    const { data: habitosData, error } = await supabase
      .from("habitos_recurrentes")
      .select("*")
      .eq("perfil_id", perfilActual.id)
      .eq("activo", true)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los hábitos", variant: "destructive" })
      setLoading(false)
      return
    }

    setHabitos(habitosData || [])

    // Cargar registros de hoy
    if (habitosData && habitosData.length > 0) {
      const habitoIds = habitosData.map((h) => h.id)
      const { data: registros } = await supabase
        .from("registro_habitos_recurrentes")
        .select("*")
        .in("habito_id", habitoIds)
        .eq("fecha", hoy)

      const registrosMap: Record<string, boolean> = {}
      registros?.forEach((r) => {
        registrosMap[r.habito_id] = r.completado
      })
      setRegistrosHoy(registrosMap)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActual) return

    const supabase = createClient()

    const { error } = await supabase.from("habitos_recurrentes").insert({
      perfil_id: perfilActual.id,
      user_id: perfilActual.user_id,
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      frecuencia: formData.frecuencia,
      dias_semana: formData.frecuencia === "semanal" ? formData.dias_semana : null,
      dia_mes: formData.frecuencia === "mensual" ? formData.dia_mes : null,
    })

    if (error) {
      toast({ title: "Error", description: "No se pudo crear el hábito", variant: "destructive" })
      return
    }

    toast({ title: "Hábito creado", description: "El hábito recurrente fue creado exitosamente" })
    setIsDialogOpen(false)
    setFormData({ nombre: "", descripcion: "", frecuencia: "diario", dias_semana: [], dia_mes: 1 })
    fetchHabitos()
  }

  const toggleHabito = async (habitoId: string, completado: boolean) => {
    const supabase = createClient()
    const hoy = new Date().toISOString().split("T")[0]

    // Verificar si ya existe un registro para hoy
    const { data: existingRecord } = await supabase
      .from("registro_habitos_recurrentes")
      .select("id")
      .eq("habito_id", habitoId)
      .eq("fecha", hoy)
      .single()

    if (existingRecord) {
      // Actualizar registro existente
      await supabase
        .from("registro_habitos_recurrentes")
        .update({ completado })
        .eq("id", existingRecord.id)
    } else {
      // Crear nuevo registro
      await supabase.from("registro_habitos_recurrentes").insert({
        habito_id: habitoId,
        fecha: hoy,
        completado,
      })
    }

    // Actualizar racha si se completó
    if (completado) {
      const habito = habitos.find((h) => h.id === habitoId)
      if (habito) {
        const nuevaRacha = habito.racha_actual + 1
        const mejorRacha = Math.max(nuevaRacha, habito.mejor_racha)
        await supabase
          .from("habitos_recurrentes")
          .update({ racha_actual: nuevaRacha, mejor_racha: mejorRacha })
          .eq("id", habitoId)
      }
    }

    setRegistrosHoy((prev) => ({ ...prev, [habitoId]: completado }))
    fetchHabitos()
  }

  const deleteHabito = async (id: string) => {
    const supabase = createClient()
    await supabase.from("habitos_recurrentes").update({ activo: false }).eq("id", id)
    toast({ title: "Hábito eliminado", description: "El hábito fue eliminado correctamente" })
    fetchHabitos()
  }

  const habitosCompletadosHoy = Object.values(registrosHoy).filter(Boolean).length
  const porcentajeCompletado = habitos.length > 0 ? (habitosCompletadosHoy / habitos.length) * 100 : 0

  const getFrecuenciaLabel = (frecuencia: string) => {
    switch (frecuencia) {
      case "diario":
        return "Diario"
      case "semanal":
        return "Semanal"
      case "mensual":
        return "Mensual"
      default:
        return frecuencia
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header con color cyan/teal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-cyan-600 flex items-center gap-2">
            <Repeat className="w-7 h-7" />
            Hábitos Recurrentes
          </h2>
          <p className="text-muted-foreground mt-1">Gestiona tus hábitos diarios, semanales y mensuales</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Hábito
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-700">Progreso de Hoy</span>
              <Calendar className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-700">
              {habitosCompletadosHoy}/{habitos.length}
            </p>
            <Progress value={porcentajeCompletado} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-700">Mejor Racha</span>
              <TrendingUp className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-700">
              {habitos.length > 0 ? Math.max(...habitos.map((h) => h.mejor_racha)) : 0} días
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-700">Total Hábitos</span>
              <Award className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-700">{habitos.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Hábitos */}
      {habitos.length === 0 ? (
        <Card className="border-2 border-dashed border-cyan-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Repeat className="w-12 h-12 text-cyan-400 mb-4" />
            <h3 className="text-lg font-semibold text-cyan-700 mb-2">Sin hábitos recurrentes</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primer hábito para comenzar a construir rutinas positivas
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Hábito
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {habitos.map((habito) => {
            const completadoHoy = registrosHoy[habito.id] || false
            return (
              <Card
                key={habito.id}
                className={`border-2 transition-all ${
                  completadoHoy
                    ? "border-cyan-500 bg-gradient-to-br from-cyan-50 to-teal-50"
                    : "border-slate-200 hover:border-cyan-300"
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={completadoHoy}
                        onCheckedChange={(checked) => toggleHabito(habito.id, checked as boolean)}
                        className="border-cyan-500 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                      />
                      <div>
                        <CardTitle className={`text-lg ${completadoHoy ? "line-through text-muted-foreground" : ""}`}>
                          {habito.nombre}
                        </CardTitle>
                        {habito.descripcion && (
                          <p className="text-sm text-muted-foreground mt-1">{habito.descripcion}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteHabito(habito.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-cyan-500 text-cyan-700">
                      {getFrecuenciaLabel(habito.frecuencia)}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-cyan-600" />
                      <span className="text-cyan-700 font-medium">{habito.racha_actual} días</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog para crear hábito */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-effect max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-cyan-700">Nuevo Hábito Recurrente</DialogTitle>
            <DialogDescription>Crea un nuevo hábito para tu rutina</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="nombre">Nombre del hábito</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Meditar, Ejercicio, Leer..."
                required
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción (opcional)</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalles adicionales del hábito"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="frecuencia">Frecuencia</Label>
              <Select
                value={formData.frecuencia}
                onValueChange={(value: "diario" | "semanal" | "mensual") =>
                  setFormData({ ...formData, frecuencia: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.frecuencia === "semanal" && (
              <div>
                <Label>Días de la semana</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {diasSemana.map((dia) => (
                    <Button
                      key={dia.value}
                      type="button"
                      variant={formData.dias_semana.includes(dia.value) ? "default" : "outline"}
                      size="sm"
                      className={formData.dias_semana.includes(dia.value) ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                      onClick={() => {
                        const newDias = formData.dias_semana.includes(dia.value)
                          ? formData.dias_semana.filter((d) => d !== dia.value)
                          : [...formData.dias_semana, dia.value]
                        setFormData({ ...formData, dias_semana: newDias })
                      }}
                    >
                      {dia.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {formData.frecuencia === "mensual" && (
              <div>
                <Label htmlFor="dia_mes">Día del mes</Label>
                <Input
                  id="dia_mes"
                  type="number"
                  min={1}
                  max={31}
                  value={formData.dia_mes}
                  onChange={(e) => setFormData({ ...formData, dia_mes: parseInt(e.target.value) })}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white">
                Crear Hábito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
