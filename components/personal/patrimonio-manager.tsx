"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createBrowserClient } from "@supabase/ssr"
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Edit2,
  Trash2,
  Home,
  Car,
  Wallet,
  CreditCard,
  Building2,
  Coins,
} from "lucide-react"
import { formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

interface PatrimonioItem {
  id: string
  tipo: "activo" | "pasivo"
  categoria: string
  nombre: string
  valor: number
  descripcion: string
  fecha_valuacion: string
}

const CATEGORIAS_ACTIVOS = [
  { value: "efectivo", label: "Efectivo y Bancos", icon: Wallet },
  { value: "inversiones", label: "Inversiones", icon: TrendingUp },
  { value: "inmuebles", label: "Inmuebles", icon: Home },
  { value: "vehiculos", label: "Vehículos", icon: Car },
  { value: "otros", label: "Otros Activos", icon: Coins },
]

const CATEGORIAS_PASIVOS = [
  { value: "prestamos", label: "Préstamos", icon: Building2 },
  { value: "tarjetas", label: "Tarjetas de Crédito", icon: CreditCard },
  { value: "hipotecas", label: "Hipotecas", icon: Home },
  { value: "otros", label: "Otros Pasivos", icon: TrendingDown },
]

export function PatrimonioManager() {
  const { perfilActual: perfilActivo } = usePerfil()
  const [items, setItems] = useState<PatrimonioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    tipo: "activo" as "activo" | "pasivo",
    categoria: "",
    nombre: "",
    valor: "",
    descripcion: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    if (perfilActivo) {
      fetchPatrimonio()
    }
  }, [perfilActivo])

  const fetchPatrimonio = async () => {
    if (!perfilActivo) return

    setLoading(true)
    const { data } = await supabase
      .from("patrimonio")
      .select("*")
      .eq("perfil_id", perfilActivo.id)
      .order("created_at", { ascending: false })

    setItems(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActivo) return

    const dataToSave = {
      perfil_id: perfilActivo.id,
      tipo: formData.tipo,
      categoria: formData.categoria,
      nombre: formData.nombre,
      valor: Number.parseFloat(formData.valor),
      descripcion: formData.descripcion,
      fecha_valuacion: new Date().toISOString().split("T")[0],
    }

    if (editingId) {
      await supabase.from("patrimonio").update(dataToSave).eq("id", editingId)
    } else {
      await supabase.from("patrimonio").insert(dataToSave)
    }

    setFormData({ tipo: "activo", categoria: "", nombre: "", valor: "", descripcion: "" })
    setShowForm(false)
    setEditingId(null)
    fetchPatrimonio()
  }

  const handleEdit = (item: PatrimonioItem) => {
    setFormData({
      tipo: item.tipo,
      categoria: item.categoria,
      nombre: item.nombre,
      valor: item.valor.toString(),
      descripcion: item.descripcion,
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de eliminar este elemento?")) {
      await supabase.from("patrimonio").delete().eq("id", id)
      fetchPatrimonio()
    }
  }

  const totalActivos = items.filter((i) => i.tipo === "activo").reduce((sum, i) => sum + Number(i.valor), 0)
  const totalPasivos = items.filter((i) => i.tipo === "pasivo").reduce((sum, i) => sum + Number(i.valor), 0)
  const patrimonioNeto = totalActivos - totalPasivos

  const activosPorCategoria = items
    .filter((i) => i.tipo === "activo")
    .reduce(
      (acc, item) => {
        acc[item.categoria] = (acc[item.categoria] || 0) + Number(item.valor)
        return acc
      },
      {} as Record<string, number>,
    )

  const pasivosPorCategoria = items
    .filter((i) => i.tipo === "pasivo")
    .reduce(
      (acc, item) => {
        acc[item.categoria] = (acc[item.categoria] || 0) + Number(item.valor)
        return acc
      },
      {} as Record<string, number>,
    )

  if (loading) {
    return <div className="text-center py-8">Cargando patrimonio...</div>
  }

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Total Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatGuaranies(totalActivos)}</p>
            <p className="text-xs text-slate-600 mt-1">Bienes y recursos que posees</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Total Pasivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatGuaranies(totalPasivos)}</p>
            <p className="text-xs text-slate-600 mt-1">Deudas y obligaciones</p>
          </CardContent>
        </Card>

        <Card
          className={`bg-gradient-to-br border-2 ${patrimonioNeto >= 0 ? "from-blue-50 to-cyan-50 border-blue-200" : "from-orange-50 to-red-50 border-orange-200"}`}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Patrimonio Neto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${patrimonioNeto >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatGuaranies(patrimonioNeto)}
            </p>
            <p className="text-xs text-slate-600 mt-1">Activos - Pasivos</p>
          </CardContent>
        </Card>
      </div>

      {/* Botón Agregar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancelar" : "Agregar Elemento"}
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle>{editingId ? "Editar" : "Nuevo"} Elemento de Patrimonio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.tipo}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo: e.target.value as "activo" | "pasivo", categoria: "" })
                    }
                  >
                    <option value="activo">Activo</option>
                    <option value="pasivo">Pasivo</option>
                  </select>
                </div>
                <div>
                  <Label>Categoría</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {(formData.tipo === "activo" ? CATEGORIAS_ACTIVOS : CATEGORIAS_PASIVOS).map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Casa, Auto, Préstamo Banco X"
                    required
                  />
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <Label>Descripción (opcional)</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Detalles adicionales..."
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Actualizar" : "Guardar"} Elemento
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Listas de Activos y Pasivos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Activos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              Activos
            </CardTitle>
            <CardDescription>Bienes y recursos que posees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CATEGORIAS_ACTIVOS.map((categoria) => {
              const itemsCategoria = items.filter((i) => i.tipo === "activo" && i.categoria === categoria.value)
              const totalCategoria = activosPorCategoria[categoria.value] || 0

              if (itemsCategoria.length === 0) return null

              const Icon = categoria.icon

              return (
                <div key={categoria.value} className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Icon className="w-4 h-4 text-green-600" />
                    <h4 className="font-semibold text-sm">{categoria.label}</h4>
                    <span className="ml-auto text-sm font-bold text-green-600">{formatGuaranies(totalCategoria)}</span>
                  </div>
                  {itemsCategoria.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        {item.descripcion && <p className="text-xs text-slate-600 mt-1">{item.descripcion}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">{formatGuaranies(Number(item.valor))}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
            {items.filter((i) => i.tipo === "activo").length === 0 && (
              <p className="text-center text-slate-600 py-8">No hay activos registrados</p>
            )}
          </CardContent>
        </Card>

        {/* Pasivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <TrendingDown className="w-5 h-5" />
              Pasivos
            </CardTitle>
            <CardDescription>Deudas y obligaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CATEGORIAS_PASIVOS.map((categoria) => {
              const itemsCategoria = items.filter((i) => i.tipo === "pasivo" && i.categoria === categoria.value)
              const totalCategoria = pasivosPorCategoria[categoria.value] || 0

              if (itemsCategoria.length === 0) return null

              const Icon = categoria.icon

              return (
                <div key={categoria.value} className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Icon className="w-4 h-4 text-red-600" />
                    <h4 className="font-semibold text-sm">{categoria.label}</h4>
                    <span className="ml-auto text-sm font-bold text-red-600">{formatGuaranies(totalCategoria)}</span>
                  </div>
                  {itemsCategoria.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.nombre}</p>
                        {item.descripcion && <p className="text-xs text-slate-600 mt-1">{item.descripcion}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">{formatGuaranies(Number(item.valor))}</span>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="w-3 h-3 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
            {items.filter((i) => i.tipo === "pasivo").length === 0 && (
              <p className="text-center text-slate-600 py-8">No hay pasivos registrados</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
