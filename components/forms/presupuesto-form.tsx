"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { CheckCircle, AlertCircle, DollarSign, Calendar, Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, Star, TrendingUp, Plus, MoreVertical, Trash2, BarChart3 } from 'lucide-react'
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

const CATEGORIAS_CONFIG = [
  { key: 'pct_donacion', label: 'Donacion', icon: Heart, color: 'text-pink-500', bgColor: 'bg-pink-500/10', borderColor: 'border-pink-500/30' },
  { key: 'pct_ahorro_2025', label: 'Ahorro', icon: PiggyBank, color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
  { key: 'pct_gastos_varios', label: 'Gastos Varios', icon: ShoppingBag, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'pct_gastos_vivienda', label: 'Gastos Vivienda', icon: Home, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'pct_pago_deudas', label: 'Pago Deudas', icon: CreditCard, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { key: 'pct_disfrute', label: 'Disfrute', icon: Smile, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'pct_educacion', label: 'Educacion', icon: GraduationCap, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30' },
  { key: 'pct_suenos', label: 'Suenos', icon: Star, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { key: 'pct_libertad_financiera', label: 'Libertad Financiera', icon: TrendingUp, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
]

// Mapeo de categoría a tipo_categoria nombre
const CATEGORIA_TO_TIPO: Record<string, string> = {
  'pct_donacion': 'Donacion',
  'pct_ahorro_2025': 'Ahorro',
  'pct_gastos_varios': 'Gastos Varios',
  'pct_gastos_vivienda': 'Gastos Vivienda',
  'pct_pago_deudas': 'Pago Deudas',
  'pct_disfrute': 'Disfrute',
  'pct_educacion': 'Educacion',
  'pct_suenos': 'Suenos',
  'pct_libertad_financiera': 'Libertad Financiera',
}

interface SubcategoriaItem {
  id: string
  nombre: string
  monto: number
  categoriaEgresoId?: string // ID en categorias_egreso
  tipoId?: string // ID del tipo_categoria_egreso
}

interface CategoriaData {
  subcategorias: SubcategoriaItem[]
  total: number
  tipoId?: string // ID del tipo en tipos_categoria_egreso
}

export function PresupuestoForm() {
  const { perfilActual } = usePerfil()
  const todayStr = getTodayDate()
  const [presupuesto, setPresupuesto] = useState("")
  const [mesSeleccionado, setMesSeleccionado] = useState(todayStr.slice(5, 7))
  const [anioSeleccionado, setAnioSeleccionado] = useState(todayStr.slice(0, 4))
  const [categoriasData, setCategoriasData] = useState<Record<string, CategoriaData>>({})
  const [tiposCategoriaMap, setTiposCategoriaMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [addingToCategoria, setAddingToCategoria] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Cargar tipos de categoría y subcategorías del usuario
  const loadUserData = useCallback(async () => {
    if (!perfilActual?.id) return

    setIsLoadingData(true)

    try {
      // 1. Cargar tipos de categoría de egreso del usuario
      const { data: tiposData } = await supabase
        .from("tipos_categoria_egreso")
        .select("id, nombre")
        .eq("perfil_id", perfilActual.id)

      // Crear mapa de nombre a ID
      const tiposMap: Record<string, string> = {}
      tiposData?.forEach(tipo => {
        tiposMap[tipo.nombre] = tipo.id
      })
      setTiposCategoriaMap(tiposMap)

      // 2. Cargar categorías de egreso (subcategorías) del usuario
      const { data: categoriasEgreso } = await supabase
        .from("categorias_egreso")
        .select("id, nombre, tipo_categoria_id")
        .eq("perfil_id", perfilActual.id)

      // 3. Cargar presupuesto existente para el mes seleccionado
      const primerDiaMes = `${anioSeleccionado}-${mesSeleccionado}-01`
      const { data: presupuestoExistente } = await supabase
        .from("presupuesto_mensual")
        .select("*")
        .eq("perfil_id", perfilActual.id)
        .eq("fecha", primerDiaMes)
        .single()

      // 4. Cargar items de presupuesto detallado si existe
      const { data: itemsPresupuesto } = await supabase
        .from("presupuesto_categorias")
        .select("*")
        .eq("perfil_id", perfilActual.id)
        .eq("mes", primerDiaMes)

      // Inicializar estructura de datos por categoría
      const initialData: Record<string, CategoriaData> = {}
      
      CATEGORIAS_CONFIG.forEach(cat => {
        const tipoNombre = CATEGORIA_TO_TIPO[cat.key]
        initialData[cat.key] = {
          subcategorias: [],
          total: 0,
          tipoId: tiposMap[tipoNombre]
        }
      })

      // Crear mapa de montos guardados por nombre de categoría
      const montosGuardados: Record<string, number> = {}
      itemsPresupuesto?.forEach(item => {
        montosGuardados[item.categoria] = Number(item.monto_presupuestado) || 0
      })

      // Siempre cargar las subcategorías desde categorias_egreso
      // y aplicar los montos guardados si existen
      categoriasEgreso?.forEach(catEgreso => {
        // Buscar el tipo de categoría
        const tipoId = catEgreso.tipo_categoria_id
        const tipoNombre = tiposData?.find(t => t.id === tipoId)?.nombre

        if (tipoNombre) {
          // Encontrar a qué categoría de presupuesto pertenece
          const categoriaKey = Object.entries(CATEGORIA_TO_TIPO).find(
            ([, nombre]) => nombre === tipoNombre
          )?.[0]

          if (categoriaKey && initialData[categoriaKey]) {
            // Obtener el monto guardado si existe
            const montoGuardado = montosGuardados[catEgreso.nombre] || 0
            
            initialData[categoriaKey].subcategorias.push({
              id: `egreso_${catEgreso.id}`,
              nombre: catEgreso.nombre,
              monto: montoGuardado,
              categoriaEgresoId: catEgreso.id,
              tipoId: tipoId
            })
            initialData[categoriaKey].total += montoGuardado
          }
        }
      })

      setCategoriasData(initialData)

      // Cargar presupuesto total si existe
      if (presupuestoExistente) {
        setPresupuesto(String(presupuestoExistente.meta_salario || ""))
      }

    } catch (err) {
      console.error("Error loading user data:", err)
    } finally {
      setIsLoadingData(false)
    }
  }, [perfilActual?.id, mesSeleccionado, anioSeleccionado, supabase])

  useEffect(() => {
    const hoy = getTodayDate()
    setMesSeleccionado(hoy.slice(5, 7))
    setAnioSeleccionado(hoy.slice(0, 4))
  }, [])

  useEffect(() => {
    if (perfilActual?.id) {
      loadUserData()
    }
  }, [perfilActual?.id, mesSeleccionado, anioSeleccionado, loadUserData])

  // Generar opciones de año (actual y +-2)
  const anioActual = parseInt(todayStr.slice(0, 4))
  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => String(anioActual - 2 + i))

  // Calcular totales
  const totalAsignado = Object.values(categoriasData).reduce((sum, cat) => sum + cat.total, 0)
  const presupuestoNum = Number(presupuesto) || 0
  const porcentajeTotal = presupuestoNum > 0 ? (totalAsignado / presupuestoNum) * 100 : 0

  // Manejar cambio de monto en subcategoría
  const handleMontoChange = (categoriaKey: string, itemId: string, newMonto: string) => {
    const montoNum = Number(newMonto.replace(/[^0-9]/g, "")) || 0
    
    setCategoriasData(prev => {
      const categoria = prev[categoriaKey]
      if (!categoria) return prev

      const updatedSubcategorias = categoria.subcategorias.map(sub => 
        sub.id === itemId ? { ...sub, monto: montoNum } : sub
      )
      
      const newTotal = updatedSubcategorias.reduce((sum, sub) => sum + sub.monto, 0)

      return {
        ...prev,
        [categoriaKey]: {
          ...categoria,
          subcategorias: updatedSubcategorias,
          total: newTotal
        }
      }
    })
  }

  // Agregar nueva subcategoría - también crea en categorias_egreso
  const handleAddSubcategoria = async (categoriaKey: string) => {
    if (!newItemName.trim() || !perfilActual?.id) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tipoNombre = CATEGORIA_TO_TIPO[categoriaKey]
      let tipoId = tiposCategoriaMap[tipoNombre]

      // Si no existe el tipo, crearlo
      if (!tipoId) {
        const { data: newTipo, error: tipoError } = await supabase
          .from("tipos_categoria_egreso")
          .insert({
            user_id: user.id,
            perfil_id: perfilActual.id,
            nombre: tipoNombre,
            color: CATEGORIAS_CONFIG.find(c => c.key === categoriaKey)?.color || 'text-gray-500'
          })
          .select("id")
          .single()
        
        if (tipoError) throw tipoError
        if (newTipo) {
          tipoId = newTipo.id
          setTiposCategoriaMap(prev => ({ ...prev, [tipoNombre]: tipoId }))
        }
      }

      if (!tipoId) return

      // Verificar si ya existe la categoría de egreso con ese nombre
      const { data: existingCat } = await supabase
        .from("categorias_egreso")
        .select("id")
        .eq("perfil_id", perfilActual.id)
        .eq("nombre", newItemName.trim())
        .eq("tipo_categoria_id", tipoId)
        .single()

      let categoriaEgresoId = existingCat?.id

      // Si no existe, crearla
      if (!categoriaEgresoId) {
        const { data: newCat, error: catError } = await supabase
          .from("categorias_egreso")
          .insert({
            user_id: user.id,
            perfil_id: perfilActual.id,
            nombre: newItemName.trim(),
            tipo_categoria_id: tipoId
          })
          .select("id")
          .single()

        if (catError) throw catError
        categoriaEgresoId = newCat?.id
      }

      // Agregar a la UI
      const newId = `new_${Date.now()}`
      
      setCategoriasData(prev => {
        const categoria = prev[categoriaKey]
        if (!categoria) return prev

        return {
          ...prev,
          [categoriaKey]: {
            ...categoria,
            subcategorias: [...categoria.subcategorias, { 
              id: newId, 
              nombre: newItemName.trim(), 
              monto: 0,
              categoriaEgresoId: categoriaEgresoId,
              tipoId: tipoId
            }],
            tipoId: tipoId
          }
        }
      })

      setNewItemName("")
      setAddingToCategoria(null)

    } catch (err) {
      console.error("Error adding subcategoria:", err)
      setError("Error al agregar subcategoría")
    }
  }

  // Eliminar subcategoría - también elimina de categorias_egreso
  const handleDeleteSubcategoria = async (categoriaKey: string, itemId: string) => {
    const categoria = categoriasData[categoriaKey]
    const item = categoria?.subcategorias.find(s => s.id === itemId)

    // Eliminar de categorias_egreso si tiene ID
    if (item?.categoriaEgresoId) {
      try {
        await supabase
          .from("categorias_egreso")
          .delete()
          .eq("id", item.categoriaEgresoId)
      } catch (err) {
        console.error("Error deleting from categorias_egreso:", err)
      }
    }

    // Actualizar UI
    setCategoriasData(prev => {
      const categoria = prev[categoriaKey]
      if (!categoria) return prev

      const updatedSubcategorias = categoria.subcategorias.filter(sub => sub.id !== itemId)
      const newTotal = updatedSubcategorias.reduce((sum, sub) => sum + sub.monto, 0)

      return {
        ...prev,
        [categoriaKey]: {
          ...categoria,
          subcategorias: updatedSubcategorias,
          total: newTotal
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    if (!presupuesto || presupuestoNum <= 0) {
      setError("Ingresa un presupuesto mensual valido.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error("Usuario no autenticado")

      const primerDiaMes = `${anioSeleccionado}-${mesSeleccionado}-01`

      // Calcular porcentajes basados en los montos
      const porcentajes: Record<string, number> = {}
      CATEGORIAS_CONFIG.forEach(cat => {
        const catData = categoriasData[cat.key]
        porcentajes[cat.key] = presupuestoNum > 0 ? catData?.total / presupuestoNum : 0
      })

      // 1. Guardar/actualizar presupuesto mensual
      const { data: existente } = await supabase
        .from("presupuesto_mensual")
        .select("id")
        .eq("perfil_id", perfilActual.id)
        .eq("fecha", primerDiaMes)
        .single()

      const presupuestoData = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        meta_salario: presupuestoNum,
        fecha: primerDiaMes,
        ...porcentajes
      }

      if (existente) {
        const { error: updateError } = await supabase
          .from("presupuesto_mensual")
          .update(presupuestoData)
          .eq("id", existente.id)
        
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("presupuesto_mensual")
          .insert(presupuestoData)
        
        if (insertError) throw insertError
      }

      // 2. Eliminar items de presupuesto anteriores para este mes
      await supabase
        .from("presupuesto_categorias")
        .delete()
        .eq("perfil_id", perfilActual.id)
        .eq("mes", primerDiaMes)

      // 3. Insertar nuevos items de presupuesto detallado
      // Solo insertar items que tengan nombre
      const itemsToInsert: Array<{
        perfil_id: string
        tipo_categoria: string
        categoria: string
        monto_presupuestado: number
        mes: string
      }> = []

      for (const [, data] of Object.entries(categoriasData)) {
        for (const sub of data.subcategorias) {
          if (sub.nombre.trim()) {
            itemsToInsert.push({
              perfil_id: perfilActual.id,
              tipo_categoria: 'egreso', // La tabla solo acepta 'ingreso' o 'egreso'
              categoria: sub.nombre,
              monto_presupuestado: sub.monto,
              mes: primerDiaMes
            })
          }
        }
      }

      if (itemsToInsert.length > 0) {
        const { error: insertItemsError } = await supabase
          .from("presupuesto_categorias")
          .insert(itemsToInsert)

        if (insertItemsError) {
          throw insertItemsError
        }
      }

      setSuccess(true)

      setTimeout(() => {
        router.refresh()
        loadUserData()
      }, 1500)
    } catch (err: unknown) {
      console.error("Error al guardar presupuesto:", err)
      const errorObj = err as { message?: string; details?: string }
      setError(errorObj?.message || errorObj?.details || "Error al registrar presupuesto")
    } finally {
      setIsLoading(false)
    }
  }

  if (!perfilActual) {
    return (
      <Card className="max-w-6xl mx-auto glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-6xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl">Establecer Presupuesto Mensual</CardTitle>
        <CardDescription>Define tu presupuesto mensual y distribuyelo por categorias en {perfilActual.nombre}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Presupuesto y Mes */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="presupuesto" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Presupuesto Mensual (Guaranies)
              </Label>
              <Input
                id="presupuesto"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="15000000"
                value={presupuesto}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setPresupuesto(value)
                }}
                required
                className="bg-background/50"
              />
              {presupuesto && (
                <p className="text-sm text-muted-foreground">{formatGuaranies(presupuestoNum)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mes del Presupuesto
              </Label>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={anio}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Distribución por Categorías */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-lg font-semibold">Distribucion por Categorias</Label>
              <div className={`text-lg font-bold ${Math.abs(porcentajeTotal - 100) < 0.01 ? 'text-green-500' : porcentajeTotal > 100 ? 'text-red-500' : 'text-cyan-500'}`}>
                Total: {formatGuaranies(totalAsignado)} ({porcentajeTotal.toFixed(1)}%)
              </div>
            </div>

            {isLoadingData ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando categorias...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {CATEGORIAS_CONFIG.map((categoria) => {
                  const Icon = categoria.icon
                  const catData = categoriasData[categoria.key] || { subcategorias: [], total: 0 }
                  const porcentajeCategoria = presupuestoNum > 0 ? (catData.total / presupuestoNum) * 100 : 0
                  
                  return (
                    <Card key={categoria.key} className={`${categoria.bgColor} ${categoria.borderColor} border`}>
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${categoria.color}`} />
                            <span className={`font-semibold ${categoria.color}`}>{categoria.label}</span>
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {formatGuaranies(catData.total)} ({porcentajeCategoria.toFixed(1)}%)
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        {/* Lista de subcategorías */}
                        {catData.subcategorias.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="text-sm text-foreground truncate flex-1">{sub.nombre}</span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={sub.monto > 0 ? sub.monto.toLocaleString('es-PY') : ""}
                                onChange={(e) => handleMontoChange(categoria.key, sub.id, e.target.value)}
                                placeholder="0"
                                className="w-28 h-7 text-right text-sm bg-background/50"
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteSubcategoria(categoria.key, sub.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}

                        {/* Agregar nueva subcategoría */}
                        {addingToCategoria === categoria.key ? (
                          <div className="flex items-center gap-2 pt-2">
                            <Input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="Nombre..."
                              className="h-8 text-sm bg-background/50 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddSubcategoria(categoria.key)
                                } else if (e.key === 'Escape') {
                                  setAddingToCategoria(null)
                                  setNewItemName("")
                                }
                              }}
                            />
                            <Button 
                              type="button"
                              size="sm" 
                              variant="secondary"
                              className="h-8"
                              onClick={() => handleAddSubcategoria(categoria.key)}
                            >
                              Agregar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setAddingToCategoria(categoria.key)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {presupuestoNum > 0 && totalAsignado > presupuestoNum && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-500">
                  Has excedido el presupuesto por {formatGuaranies(totalAsignado - presupuestoNum)}
                </p>
              </div>
            )}

            {presupuestoNum > 0 && totalAsignado < presupuestoNum && totalAsignado > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-500">
                  Te faltan {formatGuaranies(presupuestoNum - totalAsignado)} por asignar ({(100 - porcentajeTotal).toFixed(1)}%)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <CheckCircle className="w-4 h-4 text-sky-500" />
              <p className="text-sm text-sky-500">Presupuesto registrado exitosamente</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white" disabled={isLoading || !presupuesto}>
            {isLoading ? "Registrando..." : "Establecer Presupuesto"}
          </Button>

          {/* Botón para ver Presupuesto vs Realidad */}
          <Link href="/dashboard/personal/terciario?tab=presupuesto-vs-realidad" className="block">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-purple-500/50 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-500/10"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Presupuesto vs Realidad
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  )
}
