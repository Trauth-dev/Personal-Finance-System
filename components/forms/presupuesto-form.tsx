"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from 'next/navigation'
import { CheckCircle, AlertCircle, DollarSign, Calendar, Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, Star, TrendingUp } from 'lucide-react'
import { getTodayDate, formatGuaranies } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"

const CATEGORIAS_CONFIG = [
  { key: 'pct_donacion', label: 'Donación', icon: Heart, color: 'text-pink-600', default: 0 },
  { key: 'pct_ahorro_2025', label: 'Ahorro 2025', icon: PiggyBank, color: 'text-green-600', default: 10 },
  { key: 'pct_gastos_varios', label: 'Gastos Varios', icon: ShoppingBag, color: 'text-blue-600', default: 20 },
  { key: 'pct_gastos_vivienda', label: 'Gastos Vivienda', icon: Home, color: 'text-orange-600', default: 30 },
  { key: 'pct_pago_deudas', label: 'Pago Deudas', icon: CreditCard, color: 'text-red-600', default: 20 },
  { key: 'pct_disfrute', label: 'Disfrute', icon: Smile, color: 'text-yellow-600', default: 20 },
  { key: 'pct_educacion', label: 'Educación', icon: GraduationCap, color: 'text-indigo-600', default: 0 },
  { key: 'pct_suenos', label: 'Sueños', icon: Star, color: 'text-purple-600', default: 0 },
  { key: 'pct_libertad_financiera', label: 'Libertad Financiera', icon: TrendingUp, color: 'text-cyan-600', default: 0 },
]

export function PresupuestoForm() {
  const { perfilActual } = usePerfil()
  const [presupuesto, setPresupuesto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [porcentajes, setPorcentajes] = useState<Record<string, number>>(
    CATEGORIAS_CONFIG.reduce((acc, cat) => ({ ...acc, [cat.key]: cat.default }), {})
  )
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
  }, [])

  const totalPorcentajes = Object.values(porcentajes).reduce((sum, val) => sum + val, 0)

  const handlePorcentajeChange = (key: string, value: string) => {
    const num = parseFloat(value) || 0
    if (num >= 0 && num <= 100) {
      setPorcentajes(prev => ({ ...prev, [key]: num }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    if (Math.abs(totalPorcentajes - 100) > 0.01) {
      setError(`El total de porcentajes debe sumar 100% (actual: ${totalPorcentajes.toFixed(1)}%)`)
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    const supabase = createClient()

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error("Usuario no autenticado")

      const porcentajesDecimales = Object.fromEntries(
        Object.entries(porcentajes).map(([key, value]) => [key, value / 100])
      )

      // Normalizar fecha al primer día del mes para que haya un solo registro por mes
      const fechaObj = new Date(fecha + "T00:00:00")
      const primerDiaMes = new Date(fechaObj.getFullYear(), fechaObj.getMonth(), 1).toISOString().split("T")[0]

      const dataToUpsert = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        meta_salario: Number.parseFloat(presupuesto),
        fecha: primerDiaMes,
        ...porcentajesDecimales
      }

      // Primero buscar si ya existe un presupuesto para este mes
      const { data: existente } = await supabase
        .from("presupuesto_mensual")
        .select("id")
        .eq("perfil_id", perfilActual.id)
        .gte("fecha", primerDiaMes)
        .lte("fecha", new Date(fechaObj.getFullYear(), fechaObj.getMonth() + 1, 0).toISOString().split("T")[0])
        .limit(1)

      let data, upsertError
      if (existente && existente.length > 0) {
        // Actualizar el registro existente
        const result = await supabase
          .from("presupuesto_mensual")
          .update({
            meta_salario: Number.parseFloat(presupuesto),
            fecha: primerDiaMes,
            ...porcentajesDecimales
          })
          .eq("id", existente[0].id)
          .select()
        data = result.data
        upsertError = result.error
      } else {
        // Insertar nuevo registro
        const result = await supabase
          .from("presupuesto_mensual")
          .insert(dataToUpsert)
          .select()
        data = result.data
        upsertError = result.error
      }

      if (upsertError) throw upsertError

      setSuccess(true)
      setPresupuesto("")
      setFecha(getTodayDate())
      setPorcentajes(CATEGORIAS_CONFIG.reduce((acc, cat) => ({ ...acc, [cat.key]: cat.default }), {}))

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
      <Card className="max-w-4xl mx-auto glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl">Establecer Presupuesto Mensual</CardTitle>
        <CardDescription>Define tu presupuesto mensual y distribúyelo por categorías en {perfilActual.nombre}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="presupuesto" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Presupuesto Mensual (Guaraníes)
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
                <p className="text-sm text-muted-foreground">{formatGuaranies(Number.parseFloat(presupuesto) || 0)}</p>
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
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-lg font-semibold">Distribución por Categorías</Label>
              <div className={`text-lg font-bold ${Math.abs(totalPorcentajes - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalPorcentajes.toFixed(1)}%
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              {CATEGORIAS_CONFIG.map((categoria) => {
                const Icon = categoria.icon
                const montoAsignado = presupuesto ? (Number.parseFloat(presupuesto) * porcentajes[categoria.key] / 100) : 0
                
                return (
                  <div key={categoria.key} className="space-y-2 p-3 rounded-lg border bg-card">
                    <Label className={`flex items-center gap-2 ${categoria.color}`}>
                      <Icon className="w-4 h-4" />
                      {categoria.label}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={porcentajes[categoria.key]}
                        onChange={(e) => handlePorcentajeChange(categoria.key, e.target.value)}
                        className="text-right"
                      />
                      <span className="text-sm font-medium">%</span>
                    </div>
                    {presupuesto && porcentajes[categoria.key] > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatGuaranies(montoAsignado)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {Math.abs(totalPorcentajes - 100) > 0.01 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  El total debe sumar exactamente 100%. {totalPorcentajes < 100 ? `Faltan ${(100 - totalPorcentajes).toFixed(1)}%` : `Sobran ${(totalPorcentajes - 100).toFixed(1)}%`}
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

          <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white" disabled={isLoading || Math.abs(totalPorcentajes - 100) > 0.01}>
            {isLoading ? "Registrando..." : "Establecer Presupuesto"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
