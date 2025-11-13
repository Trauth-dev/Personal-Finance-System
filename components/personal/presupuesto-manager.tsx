"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@supabase/ssr"
import { Plus, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Edit2, Trash2 } from "lucide-react"
import { formatGuaranies } from "@/lib/utils"
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
  }, [perfilActivo])

  const fetchPresupuestos = async () => {
    if (!perfilActivo) return

    setLoading(true)
    const now = new Date()
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

    // Obtener presupuestos
    const { data: presupuestosData } = await supabase
      .from("presupuesto_categorias")
      .select("*")
      .eq("perfil_id", perfilActivo.id)
      .gte("mes", primerDia)
      .lte("mes", ultimoDia)

    // Obtener gastos reales
    const { data: egresosData } = await supabase
      .from("egresos")
      .select("categoria_varios, categoria_vivienda, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    // Obtener ingresos reales
    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("categoria, monto")
      .eq("perfil_id", perfilActivo.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    // Calcular montos reales por categoría
    const montosReales = new Map<string, number>()

    egresosData?.forEach((egreso) => {
      const cat = egreso.categoria_varios || egreso.categoria_vivienda
      if (cat) {
        montosReales.set(`egreso_${cat}`, (montosReales.get(`egreso_${cat}`) || 0) + Number(egreso.monto))
      }
    })

    ingresosData?.forEach((ingreso) => {
      if (ingreso.categoria) {
        montosReales.set(
          `ingreso_${ingreso.categoria}`,
          (montosReales.get(`ingreso_${ingreso.categoria}`) || 0) + Number(ingreso.monto),
        )
      }
    })

    // Combinar presupuestos con montos reales
    const presupuestosConReal =
      presupuestosData?.map((p) => {
        const key = `${p.tipo_categoria}_${p.categoria}`
        const montoReal = montosReales.get(key) || 0
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

    setPresupuestos(presupuestosConReal)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActivo) return

    const now = new Date()
    const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]

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

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Ingresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600">Presupuestado</p>
              <p className="text-2xl font-bold text-green-600">{formatGuaranies(totalPresupuestadoIngresos)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Real</p>
              <p className="text-2xl font-bold text-green-700">{formatGuaranies(totalRealIngresos)}</p>
            </div>
            <div
              className={`text-sm font-medium ${totalRealIngresos >= totalPresupuestadoIngresos ? "text-green-600" : "text-red-600"}`}
            >
              {totalRealIngresos >= totalPresupuestadoIngresos ? "+" : ""}
              {formatGuaranies(totalRealIngresos - totalPresupuestadoIngresos)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Egresos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600">Presupuestado</p>
              <p className="text-2xl font-bold text-red-600">{formatGuaranies(totalPresupuestadoEgresos)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Real</p>
              <p className="text-2xl font-bold text-red-700">{formatGuaranies(totalRealEgresos)}</p>
            </div>
            <div
              className={`text-sm font-medium ${totalRealEgresos <= totalPresupuestadoEgresos ? "text-green-600" : "text-red-600"}`}
            >
              {totalRealEgresos <= totalPresupuestadoEgresos ? "Ahorraste " : "Excediste "}
              {formatGuaranies(Math.abs(totalPresupuestadoEgresos - totalRealEgresos))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Superávit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-slate-600">Presupuestado</p>
              <p className={`text-2xl font-bold ${superavitPresupuestado >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatGuaranies(superavitPresupuestado)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600">Real</p>
              <p className={`text-2xl font-bold ${superavitReal >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatGuaranies(superavitReal)}
              </p>
            </div>
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
