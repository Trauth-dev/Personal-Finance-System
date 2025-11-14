"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, DollarSign, Calendar, Plus, Heart, Coins, Package, Home, CreditCard, Smile, GraduationCap, Sparkles, TrendingUp } from 'lucide-react'
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

interface TipoCategoria {
  id: string
  nombre: string
  color: string
}

interface Categoria {
  id: string
  nombre: string
  tipo_categoria_id: string
}

const ICONOS_CATEGORIAS: Record<string, React.ElementType> = {
  "Donación": Heart,
  "Ahorro 2025": Coins,
  "Gastos Varios": Package,
  "Gastos Fijos": Home,
  "Pago Deudas": CreditCard,
  "Disfrute": Smile,
  "Educación": GraduationCap,
  "Sueños": Sparkles,
  "Libertad Financiera": TrendingUp,
}

export function EgresoForm() {
  const { perfilActual } = usePerfil()
  const [tiposCategorias, setTiposCategorias] = useState<TipoCategoria[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedTipo, setSelectedTipo] = useState<string>("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [concepto, setConcepto] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // const [showNewTipo, setShowNewTipo] = useState(false)
  // const [newTipoNombre, setNewTipoNombre] = useState("")
  // const [newTipoColor, setNewTipoColor] = useState("#3b82f6")

  const [showNewCategoria, setShowNewCategoria] = useState(false)
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("")

  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
    if (perfilActual?.id) {
      loadTiposCategorias()
    }
  }, [perfilActual])

  useEffect(() => {
    if (selectedTipo) {
      loadCategorias(selectedTipo)
    } else {
      setCategorias([])
      setSelectedCategoria("")
    }
  }, [selectedTipo])

  const loadTiposCategorias = async () => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data, error: fetchError } = await supabase
        .from("tipos_categoria_egreso")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .order("nombre")

      if (!fetchError && data) {
        setTiposCategorias(data)
      }
    } catch (error) {
      setTiposCategorias([])
    }
  }

  const loadCategorias = async (tipoId: string) => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from("categorias_egreso")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .eq("tipo_categoria_id", tipoId)
        .order("nombre")

      if (!fetchError && data) {
        setCategorias(data)
      }
    } catch (error) {
      setCategorias([])
    }
  }

  /*
  const handleAddTipoCategoria = async () => {
    if (!newTipoNombre.trim() || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: insertError } = await supabase
        .from("tipos_categoria_egreso")
        .insert({
          user_id: user.id,
          perfil_id: perfilActual.id,
          nombre: newTipoNombre.trim(),
          color: newTipoColor,
        })
        .select()

      if (!insertError && data && data[0]) {
        await loadTiposCategorias()
        setSelectedTipo(data[0].id)
        setNewTipoNombre("")
        setNewTipoColor("#3b82f6")
        setShowNewTipo(false)
      } else if (insertError) {
        setError("Error al agregar tipo de categoría")
      }
    } catch (error) {
      setError("Error al agregar tipo de categoría")
    }
  }
  */

  const handleAddCategoria = async () => {
    if (!newCategoriaNombre.trim() || !selectedTipo || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: insertError } = await supabase
        .from("categorias_egreso")
        .insert({
          user_id: user.id,
          perfil_id: perfilActual.id,
          tipo_categoria_id: selectedTipo,
          nombre: newCategoriaNombre.trim(),
        })
        .select()

      if (!insertError && data && data[0]) {
        await loadCategorias(selectedTipo)
        setSelectedCategoria(data[0].id)
        setNewCategoriaNombre("")
        setShowNewCategoria(false)
      } else if (insertError) {
        setError("Error al agregar descripción")
      }
    } catch (error) {
      setError("Error al agregar descripción")
    }
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

      if (!selectedTipo || !selectedCategoria) {
        throw new Error("Debes seleccionar un tipo de categoría y una descripción")
      }

      const egresoData = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        tipo_categoria_id: selectedTipo,
        categoria_id: selectedCategoria,
        monto: Number.parseFloat(monto),
        fecha: fecha,
        concepto: concepto || null,
      }

      const { error: insertError } = await supabase.from("egresos").insert(egresoData).select()

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      setSelectedTipo("")
      setSelectedCategoria("")
      setMonto("")
      setFecha(getTodayDate())
      setConcepto("")

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar egreso")
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

  const selectedTipoData = tiposCategorias.find((t) => t.id === selectedTipo)

  return (
    <Card className="max-w-2xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Registrar Egreso</CardTitle>
            <CardDescription>Completa los datos de tu egreso para {perfilActual.nombre}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Categoría</Label>

            {tiposCategorias.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {tiposCategorias.map((tipo) => {
                  const Icon = ICONOS_CATEGORIAS[tipo.nombre] || Package
                  const isSelected = selectedTipo === tipo.id
                  
                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setSelectedTipo(tipo.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-white scale-105 shadow-lg"
                          : "border-border/30 hover:border-border/60"
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${tipo.color}20` : "transparent",
                      }}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div
                          className="p-3 rounded-full"
                          style={{ backgroundColor: `${tipo.color}30` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: tipo.color }} />
                        </div>
                        <span className="text-sm font-medium">{tipo.nombre}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center bg-background/30 rounded-lg border border-border/50">
                No tienes tipos de categoría. Por favor contacta al administrador.
              </p>
            )}

            {/* 
            {!showNewTipo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewTipo(true)}
                className="w-full gap-2 border-border/50 hover:bg-accent"
              >
                <Plus className="w-4 h-4" />
                Crear nuevo tipo de categoría
              </Button>
            ) : (
              ...formulario de crear tipo...
            )}
            */}
          </div>

          {selectedTipo && (
            <div className="space-y-3">
              <Label>Descripción</Label>

              {categorias.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((cat) => {
                    const isSelected = selectedCategoria === cat.id
                    
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoria(cat.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          isSelected
                            ? "border-white"
                            : "border-border/30 hover:border-border/60"
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${selectedTipoData?.color}20` : "transparent",
                          color: isSelected ? selectedTipoData?.color : "inherit",
                        }}
                      >
                        {cat.nombre}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground p-4 text-center rounded-lg border"
                  style={{
                    backgroundColor: `${selectedTipoData?.color}10`,
                    borderColor: `${selectedTipoData?.color}40`,
                  }}
                >
                  No hay descripciones en este tipo. Agrega una abajo.
                </p>
              )}

              {!showNewCategoria ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategoria(true)}
                  className="w-full gap-2"
                  style={{
                    borderColor: `${selectedTipoData?.color}40`,
                    color: selectedTipoData?.color,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Agregar descripción a {selectedTipoData?.nombre}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la descripción..."
                    value={newCategoriaNombre}
                    onChange={(e) => setNewCategoriaNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddCategoria()
                      }
                    }}
                    className="bg-background/50"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={handleAddCategoria}
                    style={{ backgroundColor: selectedTipoData?.color }}
                  >
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewCategoria(false)
                      setNewCategoriaNombre("")
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monto" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monto (Guaraníes)
            </Label>
            <Input
              id="monto"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="500000"
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

          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto (Opcional)</Label>
            <Textarea
              id="concepto"
              placeholder="Descripción adicional del egreso"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="bg-background/50"
              rows={3}
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
              <p className="text-sm text-green-500">Egreso registrado exitosamente</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full text-white"
            style={{ backgroundColor: selectedTipoData?.color || "#ef4444" }}
            disabled={isLoading || !selectedTipo || !selectedCategoria}
          >
            {isLoading ? "Registrando..." : "Registrar Egreso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
