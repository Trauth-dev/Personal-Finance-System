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
import { CheckCircle, AlertCircle, DollarSign, Calendar, Settings, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import Link from "next/link"
import { usePerfil } from "@/lib/contexts/perfil-context"

export function IngresoForm() {
  const { perfilActual } = usePerfil()
  const [tipoIngreso, setTipoIngreso] = useState("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string }>>([])
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [isExpanded, setIsExpanded] = useState(true)
  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
    if (perfilActual?.id) {
      loadCategorias()
    }
  }, [perfilActual])

  const loadCategorias = async () => {
    if (!perfilActual?.id) {
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data, error: fetchError } = await supabase
        .from("categorias_ingresos")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .order("nombre")

      if (!fetchError && data) {
        setCategorias(data)
      }
    } catch (error) {
      setCategorias([])
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

      const ingresoData = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        tipo_ingreso: tipoIngreso,
        monto: Number.parseFloat(monto),
        fecha: fecha,
      }

      const { error: insertError } = await supabase.from("ingresos").insert(ingresoData).select()

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      setTipoIngreso("")
      setMonto("")
      setFecha(getTodayDate())

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
    <Card className="max-w-2xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Registrar Ingreso</CardTitle>
            <CardDescription>Completa los datos de tu ingreso para {perfilActual.nombre}</CardDescription>
          </div>
          <Link href="/dashboard/configuracion">
            <Button variant="outline" size="sm" className="gap-2 bg-transparent">
              <Settings className="w-4 h-4" />
              Gestionar Categorías
            </Button>
          </Link>
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
                {categorias.length > 0 ? (
                  <RadioGroup value={tipoIngreso} onValueChange={setTipoIngreso} className="space-y-2">
                    {categorias.map((cat) => (
                      <div
                        key={cat.id}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-green-500/5 transition-colors"
                      >
                        <RadioGroupItem value={cat.nombre} id={cat.id} className="border-green-500" />
                        <Label htmlFor={cat.id} className="flex-1 cursor-pointer font-normal">
                          {cat.nombre}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tienes categorías. Agrega tu primera categoría abajo.
                  </p>
                )}

                {!showNewCategory ? (
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
  )
}
