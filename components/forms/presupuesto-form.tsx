"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { CheckCircle, AlertCircle, DollarSign, Calendar } from "lucide-react"
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

export function PresupuestoForm() {
  const { perfilActual } = usePerfil()
  const [metaSalario, setMetaSalario] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { error: insertError } = await supabase.from("presupuesto_mensual").insert({
        user_id: user.id,
        perfil_id: perfilActual.id,
        meta_salario: Number.parseFloat(metaSalario),
        fecha: fecha,
      })

      if (insertError) throw insertError

      setSuccess(true)
      setMetaSalario("")
      setFecha(getTodayDate())

      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar presupuesto")
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
        <CardTitle className="text-2xl">Establecer Presupuesto Mensual</CardTitle>
        <CardDescription>Define tu meta de salario para el mes en {perfilActual.nombre}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="meta-salario" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Meta de Salario (Guaraníes)
            </Label>
            <Input
              id="meta-salario"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="15000000"
              value={metaSalario}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                setMetaSalario(value)
              }}
              required
              className="bg-background/50"
            />
            {metaSalario && (
              <p className="text-sm text-muted-foreground">{formatGuaranies(Number.parseFloat(metaSalario) || 0)}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha (Mes)
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
            <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <CheckCircle className="w-4 h-4 text-sky-500" />
              <p className="text-sm text-sky-500">Presupuesto registrado exitosamente</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white" disabled={isLoading}>
            {isLoading ? "Registrando..." : "Establecer Presupuesto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
