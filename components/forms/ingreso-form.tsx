"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CheckCircle, AlertCircle, DollarSign, Calendar, Plus, ChevronDown, ChevronUp, Building2, Wallet, Landmark, Smartphone, PiggyBank, ArrowRight, Banknote, Pencil, Trash2, X, Check } from "lucide-react"
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { usePlanTier } from "@/hooks/use-plan-tier"
import { CATEGORIAS_INGRESO_BASICO } from "@/lib/plans/plan-features"
import { getCache, setCache } from "@/lib/cache/carga-cache"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type CajaDestino = {
  id: string
  nombre: string
  monto_actual: number
  tipo_cuenta: string | null
  banco: string | null
  moneda: string | null
  color: string | null
}

export function IngresoForm() {
  const { perfilActual } = usePerfil()
  const { features, isLoading: isLoadingPlan } = usePlanTier()
  const ingresoFeatures = features.ingreso
  const [tipoIngreso, setTipoIngreso] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([])
  // Evita mostrar "No tienes categorías" mientras aún se cargan los datos.
  const [isLoadingCategorias, setIsLoadingCategorias] = useState(true)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const [cajasDestino, setCajasDestino] = useState<CajaDestino[]>([])
  const [destinoCajaId, setDestinoCajaId] = useState<string>("")
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; nombre: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
    if (perfilActual?.id) {
      loadCategorias()
      if (ingresoFeatures.destinoIngreso) {
        loadCajasDestino()
      }
    }
  }, [perfilActual, ingresoFeatures.categoriasPersonalizadas, ingresoFeatures.destinoIngreso])

  const loadCategorias = async () => {
    if (!perfilActual?.id) {
      return
    }

    // Plan basico / usuarios nuevos: categorias fijas predeterminadas (sin personalizar).
    if (!ingresoFeatures.categoriasPersonalizadas) {
      setCategorias(
        ingresoFeatures.categoriasFijas.map((nombre) => ({ id: nombre, nombre })),
      )
      setIsLoadingCategorias(false)
      return
    }

    // Mostrar de inmediato lo que haya en caché (sin esperar al servidor) y
    // luego revalidar en segundo plano. Así no hay esqueleto al volver a entrar.
    const cacheKey = `ingresos:${perfilActual.id}`
    const cached = getCache<Array<{ id: string; nombre: string }>>(cacheKey)
    if (cached) {
      setCategorias(cached)
      setIsLoadingCategorias(false)
    }

    try {
      const supabase = createClient()
      // Usamos el user_id ya disponible en el perfil (en memoria) en lugar de
      // supabase.auth.getUser(), que hace una ida y vuelta a la red en cada carga.
      // La seguridad la garantiza igualmente RLS en la base de datos.
      const userId = perfilActual.user_id

      const { data, error: fetchError } = await supabase
        .from("categorias_ingresos")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilActual.id)
        .order("nombre")

      if (!fetchError && data) {
        // Ordenar respetando el orden predeterminado (Salario, Emprendimiento, Ingresos
        // Extras) primero; el resto de categorias personalizadas van despues alfabeticamente.
        const ordenadas = [...data].sort((a, b) => {
          const ia = CATEGORIAS_INGRESO_BASICO.indexOf(a.nombre)
          const ib = CATEGORIAS_INGRESO_BASICO.indexOf(b.nombre)
          if (ia !== -1 && ib !== -1) return ia - ib
          if (ia !== -1) return -1
          if (ib !== -1) return 1
          return a.nombre.localeCompare(b.nombre)
        })
        setCategorias(ordenadas)
        setCache(cacheKey, ordenadas)
      }
    } catch (error) {
      if (!cached) setCategorias([])
    } finally {
      setIsLoadingCategorias(false)
    }
  }

  const loadCajasDestino = async () => {
    if (!perfilActual?.id) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from("cajas_ahorro")
        .select("id, nombre, monto_actual, tipo_cuenta, banco, moneda, color")
        .eq("perfil_id", perfilActual.id)
        .eq("activa", true)
        .order("nombre")
      if (data) setCajasDestino(data)
    } catch {
      setCajasDestino([])
    }
  }

  const handleAddQuickCategory = async () => {
    if (!newCategoryName.trim() || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error: insertError } = await supabase.from("categorias_ingresos").insert({
        user_id: user.id,
        perfil_id: perfilActual.id,
        nombre: newCategoryName.trim(),
      })

      if (!insertError) {
        await loadCategorias()
        setTipoIngreso(newCategoryName.trim())
        setNewCategoryName("")
        setShowNewCategory(false)
      }
    } catch (error) {
      // Manejar error silenciosamente
    }
  }

  const handleEditCategory = async (categoryId: string) => {
    if (!editingCategoryName.trim() || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const categoria = categorias.find(c => c.id === categoryId)
      const oldName = categoria?.nombre

      // Actualizar el nombre de la categoría
      const { error: updateError } = await supabase
        .from("categorias_ingresos")
        .update({ nombre: editingCategoryName.trim() })
        .eq("id", categoryId)
        .eq("user_id", user.id)

      if (!updateError) {
        // Actualizar también los ingresos que usan esta categoría
        if (oldName) {
          await supabase
            .from("ingresos")
            .update({ tipo_ingreso: editingCategoryName.trim() })
            .eq("tipo_ingreso", oldName)
            .eq("user_id", user.id)
            .eq("perfil_id", perfilActual.id)
        }

        // Si el tipo seleccionado era el anterior, actualizar al nuevo
        if (tipoIngreso === oldName) {
          setTipoIngreso(editingCategoryName.trim())
        }

        await loadCategorias()
        setEditingCategoryId(null)
        setEditingCategoryName("")
      }
    } catch (error) {
      // Manejar error silenciosamente
    }
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Eliminar la categoría
      const { error: deleteError } = await supabase
        .from("categorias_ingresos")
        .delete()
        .eq("id", categoryToDelete.id)
        .eq("user_id", user.id)

      if (!deleteError) {
        // Si el tipo seleccionado era la categoría eliminada, limpiar selección
        if (tipoIngreso === categoryToDelete.nombre) {
          setTipoIngreso("")
        }

        await loadCategorias()
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
      }
    } catch (error) {
      // Manejar error silenciosamente
    }
  }

  const startEditCategory = (category: { id: string; nombre: string }) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.nombre)
  }

  const cancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName("")
  }

  const openDeleteDialog = (category: { id: string; nombre: string }) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      const montoNumerico = Number.parseFloat(monto)

      const ingresoData: any = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        tipo_ingreso: tipoIngreso,
        monto: montoNumerico,
        fecha: fecha,
        destino_caja_id: destinoCajaId || null,
      }

      const { error: insertError } = await supabase.from("ingresos").insert(ingresoData).select()

      if (insertError) {
        throw insertError
      }

      // Depositar automaticamente en la caja de ahorro destino
      if (destinoCajaId) {
        const cajaDestino = cajasDestino.find((c) => c.id === destinoCajaId)
        if (cajaDestino) {
          const nuevoMonto = Number(cajaDestino.monto_actual) + montoNumerico

          await supabase
            .from("cajas_ahorro")
            .update({ monto_actual: nuevoMonto })
            .eq("id", destinoCajaId)

          // Registrar movimiento de deposito
          await supabase.from("movimientos_caja").insert({
            caja_id: destinoCajaId,
            perfil_id: perfilActual.id,
            user_id: user.id,
            tipo: "deposito",
            monto: montoNumerico,
            descripcion: `Ingreso: ${tipoIngreso}`,
            fecha: fecha,
          })
        }
      }

      setSuccess(true)
      setMonto("")
      setFecha(getTodayDate())
      setDestinoCajaId("")

      // Recargar cajas para reflejar el nuevo saldo inmediatamente
      await loadCajasDestino()

      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar ingreso")
    } finally {
      setIsLoading(false)
    }
  }

  if (!perfilActual) {
    return (
      <Card className="max-w-2xl mx-auto glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="max-w-2xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <div>
          <CardTitle className="text-2xl">Registrar Ingreso</CardTitle>
          <CardDescription>Completa los datos de tu ingreso para {perfilActual.nombre}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Tipo de Ingreso</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 gap-1"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isExpanded ? "Contraer" : "Expandir"}
              </Button>
            </div>

            {isExpanded && (
              <div className="space-y-3 p-4 rounded-lg bg-background/30 border border-green-500/20">
                {isLoadingPlan || isLoadingCategorias ? (
                  <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-10 rounded-md bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : categorias.length > 0 ? (
                  <RadioGroup value={tipoIngreso} onValueChange={setTipoIngreso} className="space-y-2">
                    {categorias.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-green-500/5 transition-colors group"
                      >
                        <RadioGroupItem value={cat.nombre} id={cat.id} className="border-green-500" />
                        
                        {editingCategoryId === cat.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="h-8 bg-background/50 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault()
                                  handleEditCategory(cat.id)
                                } else if (e.key === "Escape") {
                                  cancelEditCategory()
                                }
                              }}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleEditCategory(cat.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={cancelEditCategory}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Label htmlFor={cat.id} className="flex-1 cursor-pointer font-normal">
                              {cat.nombre}
                            </Label>
                            {ingresoFeatures.categoriasPersonalizadas && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEditCategory(cat)
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openDeleteDialog(cat)
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tienes categorías. Agrega tu primera categoría abajo.
                  </p>
                )}

                {ingresoFeatures.categoriasPersonalizadas && (
                  !showNewCategory ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewCategory(true)}
                      className="w-full gap-2 border-green-500/30 hover:bg-green-500/10 mt-3"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar nueva categoría
                    </Button>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Nombre de la nueva categoría..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleAddQuickCategory()
                          }
                        }}
                        className="bg-background/50"
                        autoFocus
                      />
                      <Button type="button" onClick={handleAddQuickCategory} className="bg-green-500 hover:bg-green-600">
                        Agregar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false)
                          setNewCategoryName("")
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}

            {!isExpanded && tipoIngreso && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm">
                  <span className="text-muted-foreground">Seleccionado:</span>{" "}
                  <span className="font-medium text-green-500">{tipoIngreso}</span>
                </p>
              </div>
            )}
          </div>

          {/* Selector de Caja Destino */}
          {!isLoadingPlan && ingresoFeatures.destinoIngreso && tipoIngreso && (
            <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/30">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-blue-500/20">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <Label className="text-base font-semibold text-blue-400">Destino del Ingreso</Label>
                  <p className="text-xs text-muted-foreground">Selecciona donde se depositara el dinero (opcional)</p>
                </div>
              </div>

              {cajasDestino.length > 0 ? (
                <div className="space-y-2">
                  {/* Opcion sin destino */}
                  <button
                    type="button"
                    onClick={() => setDestinoCajaId("")}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      !destinoCajaId
                        ? "border-blue-400 bg-blue-500/20"
                        : "border-border/30 hover:border-border/60 bg-background/50"
                    }`}
                  >
                    <div className="p-2 rounded-full bg-muted">
                      <Banknote className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Sin especificar destino</p>
                      <p className="text-xs text-muted-foreground">No vincular a ninguna caja</p>
                    </div>
                  </button>

                  {/* Cajas de ahorro disponibles */}
                  {cajasDestino.map((caja) => {
                    const isSelected = destinoCajaId === caja.id
                    const getTipoCuentaIcon = () => {
                      switch (caja.tipo_cuenta) {
                        case "cuenta_bancaria": return <Landmark className="w-4 h-4 text-blue-400" />
                        case "billetera_digital": return <Smartphone className="w-4 h-4 text-cyan-400" />
                        case "ahorro_personal": return <Wallet className="w-4 h-4 text-green-400" />
                        default: return <PiggyBank className="w-4 h-4 text-amber-400" />
                      }
                    }
                    return (
                      <button
                        key={caja.id}
                        type="button"
                        onClick={() => setDestinoCajaId(caja.id)}
                        className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? "border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/10"
                            : "border-border/30 hover:border-border/60 bg-background/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-blue-500/20">
                            {getTipoCuentaIcon()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{caja.nombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {caja.banco || (caja.tipo_cuenta === "ahorro_personal" ? "Efectivo" : caja.tipo_cuenta?.replace("_", " ") || "")}
                              {caja.moneda && caja.moneda !== "PYG" ? ` - ${caja.moneda}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-emerald-400">
                            {formatGuaranies(Number(caja.monto_actual))}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Saldo actual</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg border border-border/50">
                  No tienes cajas de ahorro activas. Crea una desde la seccion Cajas de Ahorro para vincular tus ingresos.
                </p>
              )}

              {/* Resumen del destino seleccionado */}
              {destinoCajaId && monto && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <ArrowRight className="w-4 h-4 text-blue-400" />
                  <p className="text-sm text-blue-400">
                    Se depositara <span className="font-bold">{formatGuaranies(Number(monto))}</span> en{" "}
                    <span className="font-bold">
                      {cajasDestino.find((c) => c.id === destinoCajaId)?.nombre}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monto" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monto (Guaranies)
            </Label>
            <Input
              id="monto"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="15000000"
              value={monto}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                setMonto(value)
              }}
              required
              className="bg-background/50"
            />
            {monto && <p className="text-sm text-muted-foreground">{formatGuaranies(Number.parseFloat(monto) || 0)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="bg-background/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-500">Ingreso registrado exitosamente</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading || !tipoIngreso}
          >
            {isLoading ? "Registrando..." : "Registrar Ingreso"}
          </Button>
        </form>
      </CardContent>
    </Card>

      {/* Dialog de confirmación para eliminar categoría */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoria</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estas seguro de eliminar la categoria &quot;{categoryToDelete?.nombre}&quot;? 
              Los ingresos registrados con esta categoria no seran eliminados, pero la categoria ya no estara disponible para nuevos registros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
