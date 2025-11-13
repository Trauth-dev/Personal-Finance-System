"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Plus, CreditCard, TrendingDown, AlertCircle, CheckCircle2, Calendar, DollarSign } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { formatGuaranies } from "@/lib/utils"
import { toast } from "sonner"

interface Deuda {
  id: string
  nombre: string
  descripcion: string | null
  monto_total: number
  monto_pagado: number
  tasa_interes: number
  fecha_inicio: string
  fecha_vencimiento: string | null
  cuotas_totales: number | null
  cuotas_pagadas: number
  monto_cuota: number | null
  frecuencia_pago: string | null
  acreedor: string
  estado: string
  prioridad: string
  notas: string | null
}

interface DeudasManagerProps {
  userId: string
  perfilId: string
}

export function DeudasManager({ userId, perfilId }: DeudasManagerProps) {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    monto_total: "",
    tasa_interes: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    cuotas_totales: "",
    monto_cuota: "",
    frecuencia_pago: "mensual",
    acreedor: "",
    prioridad: "media",
    notas: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchDeudas()
  }, [])

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from("deudas")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)
        .order("prioridad", { ascending: false })
        .order("fecha_vencimiento", { ascending: true })

      if (error) throw error
      setDeudas(data || [])
    } catch (error) {
      console.error("Error fetching deudas:", error)
      toast.error("Error al cargar las deudas")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { error } = await supabase.from("deudas").insert({
        user_id: userId,
        perfil_id: perfilId,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        monto_total: Number.parseFloat(formData.monto_total),
        tasa_interes: Number.parseFloat(formData.tasa_interes) || 0,
        fecha_inicio: formData.fecha_inicio,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        cuotas_totales: formData.cuotas_totales ? Number.parseInt(formData.cuotas_totales) : null,
        monto_cuota: formData.monto_cuota ? Number.parseFloat(formData.monto_cuota) : null,
        frecuencia_pago: formData.frecuencia_pago,
        acreedor: formData.acreedor,
        prioridad: formData.prioridad,
        notas: formData.notas || null,
      })

      if (error) throw error

      toast.success("Deuda registrada exitosamente")
      setShowForm(false)
      setFormData({
        nombre: "",
        descripcion: "",
        monto_total: "",
        tasa_interes: "",
        fecha_inicio: new Date().toISOString().split("T")[0],
        fecha_vencimiento: "",
        cuotas_totales: "",
        monto_cuota: "",
        frecuencia_pago: "mensual",
        acreedor: "",
        prioridad: "media",
        notas: "",
      })
      fetchDeudas()
    } catch (error) {
      console.error("Error creating deuda:", error)
      toast.error("Error al registrar la deuda")
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    const colors = {
      urgente: "bg-red-500",
      alta: "bg-orange-500",
      media: "bg-yellow-500",
      baja: "bg-green-500",
    }
    return colors[prioridad as keyof typeof colors] || colors.media
  }

  const getEstadoColor = (estado: string) => {
    const colors = {
      activa: "text-blue-600 bg-blue-50",
      pagada: "text-green-600 bg-green-50",
      vencida: "text-red-600 bg-red-50",
      refinanciada: "text-purple-600 bg-purple-50",
    }
    return colors[estado as keyof typeof colors] || colors.activa
  }

  const totalDeudas = deudas.reduce((sum, d) => sum + Number(d.monto_total), 0)
  const totalPagado = deudas.reduce((sum, d) => sum + Number(d.monto_pagado), 0)
  const totalPendiente = totalDeudas - totalPagado
  const porcentajePagado = totalDeudas > 0 ? (totalPagado / totalDeudas) * 100 : 0

  if (loading) {
    return <div className="text-center py-8">Cargando deudas...</div>
  }

  return (
    <div className="space-y-6">
      {/* Resumen de Deudas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Total Deudas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatGuaranies(totalDeudas)}</div>
            <p className="text-xs text-slate-600 mt-1">{deudas.length} deuda(s) registrada(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatGuaranies(totalPagado)}</div>
            <p className="text-xs text-slate-600 mt-1">{porcentajePagado.toFixed(1)}% completado</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Saldo Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatGuaranies(totalPendiente)}</div>
            <Progress value={100 - porcentajePagado} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Deudas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{deudas.filter((d) => d.estado === "activa").length}</div>
            <p className="text-xs text-slate-600 mt-1">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Botón Agregar Deuda */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancelar" : "Agregar Deuda"}
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle>Nueva Deuda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la Deuda *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="acreedor">Acreedor *</Label>
                  <Input
                    id="acreedor"
                    value={formData.acreedor}
                    onChange={(e) => setFormData({ ...formData, acreedor: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="monto_total">Monto Total *</Label>
                  <Input
                    id="monto_total"
                    type="number"
                    step="0.01"
                    value={formData.monto_total}
                    onChange={(e) => setFormData({ ...formData, monto_total: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="tasa_interes">Tasa de Interés (%)</Label>
                  <Input
                    id="tasa_interes"
                    type="number"
                    step="0.01"
                    value={formData.tasa_interes}
                    onChange={(e) => setFormData({ ...formData, tasa_interes: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
                  <Input
                    id="fecha_inicio"
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                  <Input
                    id="fecha_vencimiento"
                    type="date"
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="cuotas_totales">Cuotas Totales</Label>
                  <Input
                    id="cuotas_totales"
                    type="number"
                    value={formData.cuotas_totales}
                    onChange={(e) => setFormData({ ...formData, cuotas_totales: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="monto_cuota">Monto por Cuota</Label>
                  <Input
                    id="monto_cuota"
                    type="number"
                    step="0.01"
                    value={formData.monto_cuota}
                    onChange={(e) => setFormData({ ...formData, monto_cuota: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="frecuencia_pago">Frecuencia de Pago</Label>
                  <Select
                    value={formData.frecuencia_pago}
                    onValueChange={(value) => setFormData({ ...formData, frecuencia_pago: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prioridad">Prioridad</Label>
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                  >
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

              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  value={formData.notas}
                  onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Registrar Deuda
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Deudas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {deudas.map((deuda) => {
          const porcentaje = (Number(deuda.monto_pagado) / Number(deuda.monto_total)) * 100
          const pendiente = Number(deuda.monto_total) - Number(deuda.monto_pagado)

          return (
            <Card key={deuda.id} className="border-2 hover:shadow-lg transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{deuda.nombre}</CardTitle>
                    <p className="text-sm text-slate-600 mt-1">{deuda.acreedor}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`w-3 h-3 rounded-full ${getPrioridadColor(deuda.prioridad)}`} />
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEstadoColor(deuda.estado)}`}>
                      {deuda.estado}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Progreso</span>
                    <span className="font-semibold">{porcentaje.toFixed(1)}%</span>
                  </div>
                  <Progress value={porcentaje} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Total</p>
                    <p className="text-lg font-bold text-slate-800">{formatGuaranies(Number(deuda.monto_total))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Pendiente</p>
                    <p className="text-lg font-bold text-red-600">{formatGuaranies(pendiente)}</p>
                  </div>
                </div>

                {deuda.cuotas_totales && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Cuotas</span>
                    <span className="font-semibold">
                      {deuda.cuotas_pagadas} / {deuda.cuotas_totales}
                    </span>
                  </div>
                )}

                {deuda.fecha_vencimiento && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Vence: {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-ES")}</span>
                  </div>
                )}

                {deuda.monto_cuota && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-slate-600" />
                    <span className="text-slate-600">Cuota:</span>
                    <span className="font-semibold">{formatGuaranies(Number(deuda.monto_cuota))}</span>
                    <span className="text-slate-500">({deuda.frecuencia_pago})</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {deudas.length === 0 && !showForm && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">No tienes deudas registradas</p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar Primera Deuda
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
