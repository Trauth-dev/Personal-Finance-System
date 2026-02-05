"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createBrowserClient } from "@supabase/ssr"
import { Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Edit2, Trash2, ChevronLeft, ChevronRight, Calendar, ArrowUpRight, ArrowDownRight, Minus, Copy } from "lucide-react"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

interface PresupuestoCategoria {
  id: string
  categoria: string
  tipo_categoria: "ingreso" | "egreso"
  monto_presupuestado: number
  monto_real: number
  diferencia: number
  porcentaje_usado: number
}

export function PresupuestoManager() {
  const { perfilActivo } = usePerfil()
  const [presupuestos, setPresupuestos] = useState<PresupuestoCategoria[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const now = getParaguayDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [presupuestosMesAnterior, setPresupuestosMesAnterior] = useState<PresupuestoCategoria[]>([])
  const [formData, setFormData] = useState({
    categoria: "",
    tipo_categoria: "egreso" as "ingreso" | "egreso",
    monto_presupuestado: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (perfilActivo) {
      fetchPresupuestos()
    }
  }, [perfilActivo, mesSeleccionado])

  const fetchPresupuestos = async () => {
    if (!perfilActivo) return

    setLoading(true)
    const [year, month] = mesSeleccionado.split('-').map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDia = new Date(year, month, 0).toISOString().split("T")[0]

    // Mes anterior
    const mesAntDate = new Date(year, month - 2, 1)
    const primerDiaAnt = mesAntDate.toISOString().split("T")[0]
    const ultimoDiaAnt = new Date(mesAntDate.getFullYear(), mesAntDate.getMonth() + 1, 0).toISOString().split("T")[0]

    // Obtener presupuestos del mes seleccionado
    const { data: presupuestosData } = await supabase
      .from("presupuesto_categorias")
      .select("*")
      .eq("perfil_id", perfilActivo.id)
      .gte("mes", primerDia)
      .lte("mes", ultimoDia)

    // Obtener presupuestos del mes anterior
    const { data: presupuestosAntData } = await supabase
      .from("presupuesto_categorias")
      .select("*")
      .eq("perfil_id", perfilActivo.id)
      .gte("mes", primerDiaAnt)
      .lte("mes", ultimoDiaAnt)

    // Obtener gastos reales del mes seleccionado
    const { data: egresosData } = await supabase
      .from("egresos")
      .select("categoria_varios, categoria_vivienda, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    // Obtener ingresos reales del mes seleccionado
    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("categoria, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    // Gastos reales del mes anterior
    const { data: egresosAntData } = await supabase
      .from("egresos")
      .select("categoria_varios, categoria_vivienda, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDiaAnt)
      .lte("fecha", ultimoDiaAnt)

    // Ingresos reales del mes anterior
    const { data: ingresosAntData } = await supabase
      .from("ingresos")
      .select("categoria, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDiaAnt)
      .lte("fecha", ultimoDiaAnt)

    // Helper para calcular montos reales
    const calcularMontos = (egresos: typeof egresosData, ingresos: typeof ingresosData) => {
      const montos = new Map<string, number>()
      egresos?.forEach((egreso) => {
        const cat = egreso.categoria_varios || egreso.categoria_vivienda
        if (cat) {
          montos.set(`egreso_${cat}`, (montos.get(`egreso_${cat}`) || 0) + Number(egreso.monto))
        }
      })
      ingresos?.forEach((ingreso) => {
        if (ingreso.categoria) {
          montos.set(`ingreso_${ingreso.categoria}`, (montos.get(`ingreso_${ingreso.categoria}`) || 0) + Number(ingreso.monto))
        }
      })
      return montos
    }

    const montosReales = calcularMontos(egresosData, ingresosData)
    const montosRealesAnt = calcularMontos(egresosAntData, ingresosAntData)

    // Helper para combinar presupuestos con montos reales
    const combinar = (data: typeof presupuestosData, montos: Map<string, number>) => {
      return data?.map((p) => {
        const key = `${p.tipo_categoria}_${p.categoria}`
        const montoReal = montos.get(key) || 0
        const diferencia =
          p.tipo_categoria === "ingreso"
            ? montoReal - Number(p.monto_presupuestado)
            : Number(p.monto_presupuestado) - montoReal
        const porcentajeUsado =
          Number(p.monto_presupuestado) > 0 ? (montoReal / Number(p.monto_presupuestado)) * 100 : 0
        return {
          id: p.id,
          categoria: p.categoria,
          tipo_categoria: p.tipo_categoria,
          monto_presupuestado: Number(p.monto_presupuestado),
          monto_real: montoReal,
          diferencia,
          porcentaje_usado: porcentajeUsado,
        }
      }) || []
    }

    setPresupuestos(combinar(presupuestosData, montosReales))
    setPresupuestosMesAnterior(combinar(presupuestosAntData, montosRealesAnt))
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActivo) return

    const [year, month] = mesSeleccionado.split('-').map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]

    const dataToSave = {
      perfil_id: perfilActivo.id,
      categoria: formData.categoria,
      tipo_categoria: formData.tipo_categoria,
      monto_presupuestado: Number.parseFloat(formData.monto_presupuestado),
      mes: primerDia,
    }

    if (editingId) {
      await supabase.from("presupuesto_categorias").update(dataToSave).eq("id", editingId)
    } else {
      await supabase.from("presupuesto_categorias").insert(dataToSave)
    }

    setFormData({ categoria: "", tipo_categoria: "egreso", monto_presupuestado: "" })
    setShowForm(false)
    setEditingId(null)
    fetchPresupuestos()
  }

  const handleEdit = (presupuesto: PresupuestoCategoria) => {
    setFormData({
      categoria: presupuesto.categoria,
      tipo_categoria: presupuesto.tipo_categoria,
      monto_presupuestado: presupuesto.monto_presupuestado.toString(),
    })
    setEditingId(presupuesto.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este presupuesto?")) {
      await supabase.from("presupuesto_categorias").delete().eq("id", id)
      fetchPresupuestos()
    }
  }

  const totalPresupuestadoIngresos = presupuestos
    .filter((p) => p.tipo_categoria === "ingreso")
    .reduce((sum, p) => sum + p.monto_presupuestado, 0)

  const totalRealIngresos = presupuestos
    .filter((p) => p.tipo_categoria === "ingreso")
    .reduce((sum, p) => sum + p.monto_real, 0)

  const totalPresupuestadoEgresos = presupuestos
    .filter((p) => p.tipo_categoria === "egreso")
    .reduce((sum, p) => sum + p.monto_presupuestado, 0)

  const totalRealEgresos = presupuestos
    .filter((p) => p.tipo_categoria === "egreso")
    .reduce((sum, p) => sum + p.monto_real, 0)

  const superavitPresupuestado = totalPresupuestadoIngresos - totalPresupuestadoEgresos
  const superavitReal = totalRealIngresos - totalRealEgresos

  if (loading) {
    return <div className="text-center py-8">Cargando presupuestos...</div>
  }

  const getMesNombre = (mesStr?: string) => {
    const [year, month] = (mesStr || mesSeleccionado).split('-').map(Number)
    const fecha = new Date(year, month - 1, 1)
    return fecha.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  }

  const navegarMes = (direccion: number) => {
    const [year, month] = mesSeleccionado.split('-').map(Number)
    const nuevaFecha = new Date(year, month - 1 + direccion, 1)
    setMesSeleccionado(`${nuevaFecha.getFullYear()}-${String(nuevaFecha.getMonth() + 1).padStart(2, '0')}`)
  }

  const esMesActual = () => {
    const now = getParaguayDate()
    return mesSeleccionado === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const getMesAnteriorNombre = () => {
    const [year, month] = mesSeleccionado.split('-').map(Number)
    const fecha = new Date(year, month - 2, 1)
    return fecha.toLocaleDateString('es-PY', { month: 'long', year: 'numeric' })
  }

  // Comparativa: totales del mes anterior
  const totalPresupuestadoIngresosAnt = presupuestosMesAnterior
    .filter((p) => p.tipo_categoria === "ingreso")
    .reduce((sum, p) => sum + p.monto_presupuestado, 0)
  const totalRealIngresosAnt = presupuestosMesAnterior
    .filter((p) => p.tipo_categoria === "ingreso")
    .reduce((sum, p) => sum + p.monto_real, 0)
  const totalPresupuestadoEgresosAnt = presupuestosMesAnterior
    .filter((p) => p.tipo_categoria === "egreso")
    .reduce((sum, p) => sum + p.monto_presupuestado, 0)
  const totalRealEgresosAnt = presupuestosMesAnterior
    .filter((p) => p.tipo_categoria === "egreso")
    .reduce((sum, p) => sum + p.monto_real, 0)

  const getComparativa = (actual: number, anterior: number) => {
    if (anterior === 0) return { tipo: "nuevo" as const, porcentaje: 0 }
    const diff = ((actual - anterior) / anterior) * 100
    if (diff > 0) return { tipo: "aumento" as const, porcentaje: diff }
    if (diff < 0) return { tipo: "disminuyo" as const, porcentaje: Math.abs(diff) }
    return { tipo: "igual" as const, porcentaje: 0 }
  }

  const copiarPresupuestoMesAnterior = async () => {
    if (!perfilActivo || presupuestosMesAnterior.length === 0) return
    const [year, month] = mesSeleccionado.split('-').map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]

    for (const p of presupuestosMesAnterior) {
      const yaExiste = presupuestos.find(
        (ex) => ex.categoria === p.categoria && ex.tipo_categoria === p.tipo_categoria
      )
      if (!yaExiste) {
        await supabase.from("presupuesto_categorias").insert({
          perfil_id: perfilActivo.id,
          categoria: p.categoria,
          tipo_categoria: p.tipo_categoria,
          monto_presupuestado: p.monto_presupuestado,
          mes: primerDia,
        })
      }
    }
    fetchPresupuestos()
  }

  return (
    <div className="space-y-6">
      {/* Selector de Mes */}
      <Card className="border-2 border-primary/20">
        <CardContent className="pt-6 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarMes(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-lg font-bold capitalize min-w-[180px] text-center">
                  {getMesNombre()}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarMes(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {esMesActual() && (
                <Badge className="bg-primary text-primary-foreground">Mes Actual</Badge>
              )}
            </div>
            {presupuestos.length === 0 && presupuestosMesAnterior.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={copiarPresupuestoMesAnterior} className="gap-2">
                      <Copy className="w-4 h-4" />
                      Copiar de {getMesAnteriorNombre()}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copia las categorias y montos del mes anterior a este mes</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen General */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Presupuestado</p>
              <p className="text-2xl font-bold text-green-600">{formatGuaranies(totalPresupuestadoIngresos)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Real</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatGuaranies(totalRealIngresos)}</p>
            </div>
            <div
              className={`text-sm font-medium ${totalRealIngresos >= totalPresupuestadoIngresos ? "text-green-600" : "text-red-600"}`}
            >
              {totalRealIngresos >= totalPresupuestadoIngresos ? "+" : ""}
              {formatGuaranies(totalRealIngresos - totalPresupuestadoIngresos)}
            </div>
            {totalPresupuestadoIngresosAnt > 0 && (() => {
              const comp = getComparativa(totalPresupuestadoIngresos, totalPresupuestadoIngresosAnt)
              return (
                <div className="flex items-center gap-1 pt-1 border-t border-green-200 dark:border-green-800">
                  {comp.tipo === "aumento" && <ArrowUpRight className="w-3 h-3 text-green-600" />}
                  {comp.tipo === "disminuyo" && <ArrowDownRight className="w-3 h-3 text-red-600" />}
                  {comp.tipo === "igual" && <Minus className="w-3 h-3 text-slate-500" />}
                  <span className={`text-xs ${comp.tipo === "aumento" ? "text-green-600" : comp.tipo === "disminuyo" ? "text-red-600" : "text-slate-500"}`}>
                    {comp.tipo === "aumento" ? `+${comp.porcentaje.toFixed(1)}%` : comp.tipo === "disminuyo" ? `-${comp.porcentaje.toFixed(1)}%` : "Igual"} vs mes anterior
                  </span>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Egresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Presupuestado</p>
              <p className="text-2xl font-bold text-red-600">{formatGuaranies(totalPresupuestadoEgresos)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Real</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatGuaranies(totalRealEgresos)}</p>
            </div>
            <div
              className={`text-sm font-medium ${totalRealEgresos <= totalPresupuestadoEgresos ? "text-green-600" : "text-red-600"}`}
            >
              {totalRealEgresos <= totalPresupuestadoEgresos ? "Ahorraste " : "Excediste "}
              {formatGuaranies(Math.abs(totalPresupuestadoEgresos - totalRealEgresos))}
            </div>
            {totalPresupuestadoEgresosAnt > 0 && (() => {
              const comp = getComparativa(totalPresupuestadoEgresos, totalPresupuestadoEgresosAnt)
              return (
                <div className="flex items-center gap-1 pt-1 border-t border-red-200 dark:border-red-800">
                  {comp.tipo === "aumento" && <ArrowUpRight className="w-3 h-3 text-red-600" />}
                  {comp.tipo === "disminuyo" && <ArrowDownRight className="w-3 h-3 text-green-600" />}
                  {comp.tipo === "igual" && <Minus className="w-3 h-3 text-slate-500" />}
                  <span className={`text-xs ${comp.tipo === "aumento" ? "text-red-600" : comp.tipo === "disminuyo" ? "text-green-600" : "text-slate-500"}`}>
                    {comp.tipo === "aumento" ? `+${comp.porcentaje.toFixed(1)}%` : comp.tipo === "disminuyo" ? `-${comp.porcentaje.toFixed(1)}%` : "Igual"} vs mes anterior
                  </span>
                </div>
              )
            })()}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 dark:from-blue-950/30 dark:to-cyan-950/30 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Superavit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Presupuestado</p>
              <p className={`text-2xl font-bold ${superavitPresupuestado >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatGuaranies(superavitPresupuestado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Real</p>
              <p className={`text-2xl font-bold ${superavitReal >= 0 ? "text-blue-700 dark:text-blue-400" : "text-red-700 dark:text-red-400"}`}>
                {formatGuaranies(superavitReal)}
              </p>
            </div>
            {(totalPresupuestadoIngresosAnt > 0 || totalPresupuestadoEgresosAnt > 0) && (() => {
              const superavitAnt = (totalPresupuestadoIngresosAnt - totalPresupuestadoEgresosAnt)
              const superavitRealAnt = (totalRealIngresosAnt - totalRealEgresosAnt)
              return (
                <div className="pt-1 border-t border-blue-200 dark:border-blue-800 space-y-1">
                  <div className="flex items-center gap-1">
                    {superavitReal > superavitRealAnt ? <ArrowUpRight className="w-3 h-3 text-green-600" /> : superavitReal < superavitRealAnt ? <ArrowDownRight className="w-3 h-3 text-red-600" /> : <Minus className="w-3 h-3 text-slate-500" />}
                    <span className={`text-xs ${superavitReal >= superavitRealAnt ? "text-green-600" : "text-red-600"}`}>
                      {formatGuaranies(superavitReal - superavitRealAnt)} vs mes anterior
                    </span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Botón Agregar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancelar" : "Agregar Presupuesto"}
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>{editingId ? "Editar" : "Nuevo"} Presupuesto</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.tipo_categoria}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo_categoria: e.target.value as "ingreso" | "egreso" })
                    }
                  >
                    <option value="ingreso">Ingreso</option>
                    <option value="egreso">Egreso</option>
                  </select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Input
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    placeholder="Ej: Salario, Alquiler, etc."
                    required
                  />
                </div>
                <div>
                  <Label>Monto Presupuestado</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monto_presupuestado}
                    onChange={(e) => setFormData({ ...formData, monto_presupuestado: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Actualizar" : "Guardar"} Presupuesto
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Presupuestos */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Ingresos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Presupuesto de Ingresos
            </CardTitle>
            <CardDescription>Comparativa de ingresos presupuestados vs reales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presupuestos.filter((p) => p.tipo_categoria === "ingreso").length > 0 ? (
              presupuestos
                .filter((p) => p.tipo_categoria === "ingreso")
                .map((presupuesto) => (
                  <div key={presupuesto.id} className="space-y-2 p-4 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-800">{presupuesto.categoria}</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(presupuesto)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(presupuesto.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Presupuestado</p>
                        <p className="font-bold text-green-600">{formatGuaranies(presupuesto.monto_presupuestado)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Real</p>
                        <p className="font-bold text-green-700">{formatGuaranies(presupuesto.monto_real)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Progreso</span>
                        <span className="text-xs font-bold">{presupuesto.porcentaje_usado.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(100, presupuesto.porcentaje_usado)} className="h-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      {presupuesto.diferencia >= 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span
                        className={`text-sm font-medium ${presupuesto.diferencia >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {presupuesto.diferencia >= 0 ? "+" : ""}
                        {formatGuaranies(presupuesto.diferencia)}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-slate-600 py-8">No hay presupuestos de ingresos</p>
            )}
          </CardContent>
        </Card>

        {/* Egresos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Presupuesto de Egresos
            </CardTitle>
            <CardDescription>Comparativa de gastos presupuestados vs reales</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {presupuestos.filter((p) => p.tipo_categoria === "egreso").length > 0 ? (
              presupuestos
                .filter((p) => p.tipo_categoria === "egreso")
                .map((presupuesto) => (
                  <div
                    key={presupuesto.id}
                    className={`space-y-2 p-4 rounded-lg border ${
                      presupuesto.porcentaje_usado > 100
                        ? "bg-red-50 border-red-300"
                        : presupuesto.porcentaje_usado > 80
                          ? "bg-amber-50 border-amber-300"
                          : "bg-green-50 border-green-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-800">{presupuesto.categoria}</h4>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(presupuesto)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(presupuesto.id)}>
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600">Presupuestado</p>
                        <p className="font-bold text-red-600">{formatGuaranies(presupuesto.monto_presupuestado)}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Real</p>
                        <p className="font-bold text-red-700">{formatGuaranies(presupuesto.monto_real)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">Uso del presupuesto</span>
                        <span className="text-xs font-bold">{presupuesto.porcentaje_usado.toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={Math.min(100, presupuesto.porcentaje_usado)}
                        className={`h-2 ${presupuesto.porcentaje_usado > 100 ? "bg-red-200" : ""}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {presupuesto.porcentaje_usado > 100 ? (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-600">
                            Excediste por {formatGuaranies(Math.abs(presupuesto.diferencia))}
                          </span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            Disponible: {formatGuaranies(presupuesto.diferencia)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))
            ) : (
              <p className="text-center text-slate-600 py-8">No hay presupuestos de egresos</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
