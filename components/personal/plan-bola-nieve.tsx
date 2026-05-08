"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Target,
  TrendingDown,
  Calendar,
  DollarSign,
  Zap,
  Trophy,
  ArrowRight,
  Snowflake,
  Mountain,
  Calculator,
  Clock,
  CheckCircle2,
  AlertCircle,
  Flame,
  PartyPopper,
  ChevronDown,
  ChevronUp,
  Info,
  Wallet
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { formatGuaranies } from "@/lib/utils"
import { toast } from "sonner"
import confetti from "canvas-confetti"

interface Deuda {
  id: string
  nombre: string
  monto_total: number
  monto_pagado: number
  tasa_interes: number
  cuotas_totales: number | null
  cuotas_pagadas: number
  monto_cuota: number | null
  acreedor: string
  estado: string
  tipo_deuda: string
}

interface PlanBolaNieveProps {
  userId: string
  perfilId: string
}

interface ProyeccionDeuda {
  deuda: Deuda
  mesLiberacion: number
  fechaLiberacion: Date
  interesAhorrado: number
  ordenAtaque: number
}

export function PlanBolaNieve({ userId, perfilId }: PlanBolaNieveProps) {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [loading, setLoading] = useState(true)
  const [metodo, setMetodo] = useState<"bola_nieve" | "avalancha">("bola_nieve")
  const [pagoMensualDisponible, setPagoMensualDisponible] = useState<number>(0)
  const [pagoMensualInput, setPagoMensualInput] = useState<string>("")
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [expandedDeuda, setExpandedDeuda] = useState<string | null>(null)
  const [simuladorExtra, setSimuladorExtra] = useState<string>("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchDeudas()
    fetchConfiguracion()
  }, [])

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from("deudas")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)
        .neq("estado", "pagada")
        .order("monto_total", { ascending: true })

      if (error) throw error
      setDeudas(data || [])
    } catch (error) {
      console.error("Error fetching deudas:", error)
      toast.error("Error al cargar las deudas")
    } finally {
      setLoading(false)
    }
  }

  const fetchConfiguracion = async () => {
    try {
      const { data } = await supabase
        .from("configuracion_usuario")
        .select("pago_mensual_deudas, metodo_pago_deudas")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)
        .single()

      if (data) {
        setPagoMensualDisponible(data.pago_mensual_deudas || 0)
        setPagoMensualInput(data.pago_mensual_deudas?.toString() || "")
        setMetodo(data.metodo_pago_deudas || "bola_nieve")
      }
    } catch (error) {
      // Si no existe configuracion, mostrar dialog
      if (deudas.length > 0) {
        setShowConfigDialog(true)
      }
    }
  }

  const guardarConfiguracion = async () => {
    const monto = Number(pagoMensualInput.replace(/\D/g, ""))
    if (!monto || monto <= 0) {
      toast.error("Ingresa un monto válido")
      return
    }

    try {
      const { error } = await supabase
        .from("configuracion_usuario")
        .upsert({
          user_id: userId,
          perfil_id: perfilId,
          pago_mensual_deudas: monto,
          metodo_pago_deudas: metodo
        }, {
          onConflict: "user_id,perfil_id"
        })

      if (error) throw error

      setPagoMensualDisponible(monto)
      setShowConfigDialog(false)
      toast.success("Configuración guardada")
    } catch (error) {
      console.error("Error guardando configuracion:", error)
      toast.error("Error al guardar la configuración")
    }
  }

  // Calcular deuda pendiente de cada deuda
  const getDeudaPendiente = (deuda: Deuda) => {
    return deuda.monto_total - deuda.monto_pagado
  }

  // Calcular pago minimo de cada deuda
  const getPagoMinimo = (deuda: Deuda) => {
    if (deuda.monto_cuota) return deuda.monto_cuota
    // Si no tiene cuota definida, estimar como 5% del saldo
    return Math.max(getDeudaPendiente(deuda) * 0.05, 100000)
  }

  // Ordenar deudas segun metodo
  const deudasOrdenadas = useMemo(() => {
    const activas = deudas.filter(d => getDeudaPendiente(d) > 0)
    
    if (metodo === "bola_nieve") {
      // Ordenar de menor a mayor saldo pendiente
      return [...activas].sort((a, b) => getDeudaPendiente(a) - getDeudaPendiente(b))
    } else {
      // Ordenar de mayor a menor tasa de interes
      return [...activas].sort((a, b) => (b.tasa_interes || 0) - (a.tasa_interes || 0))
    }
  }, [deudas, metodo])

  // Calcular totales
  const totales = useMemo(() => {
    const deudaTotal = deudas.reduce((sum, d) => sum + getDeudaPendiente(d), 0)
    const pagosMinimos = deudas.reduce((sum, d) => sum + getPagoMinimo(d), 0)
    const excedente = Math.max(0, pagoMensualDisponible - pagosMinimos)
    
    return {
      deudaTotal,
      pagosMinimos,
      excedente,
      cantidadDeudas: deudas.filter(d => getDeudaPendiente(d) > 0).length
    }
  }, [deudas, pagoMensualDisponible])

  // Calcular proyeccion de pago
  const proyeccion = useMemo((): ProyeccionDeuda[] => {
    if (pagoMensualDisponible <= 0 || deudasOrdenadas.length === 0) return []

    const resultado: ProyeccionDeuda[] = []
    let deudasSimuladas = deudasOrdenadas.map(d => ({
      ...d,
      saldoPendiente: getDeudaPendiente(d),
      pagoMinimo: getPagoMinimo(d)
    }))
    
    let mesActual = 0
    let excedente = totales.excedente
    let interesAhorradoTotal = 0

    while (deudasSimuladas.some(d => d.saldoPendiente > 0) && mesActual < 360) {
      mesActual++
      
      // Aplicar pagos minimos a todas
      for (const deuda of deudasSimuladas) {
        if (deuda.saldoPendiente > 0) {
          const pago = Math.min(deuda.pagoMinimo, deuda.saldoPendiente)
          deuda.saldoPendiente -= pago
        }
      }

      // Aplicar excedente a la primera deuda activa (segun metodo)
      const deudaObjetivo = deudasSimuladas.find(d => d.saldoPendiente > 0)
      if (deudaObjetivo && excedente > 0) {
        const pagoExtra = Math.min(excedente, deudaObjetivo.saldoPendiente)
        deudaObjetivo.saldoPendiente -= pagoExtra
        
        // Calcular interes ahorrado (simplificado)
        if (deudaObjetivo.tasa_interes) {
          interesAhorradoTotal += pagoExtra * (deudaObjetivo.tasa_interes / 100 / 12)
        }
      }

      // Verificar si alguna deuda fue liquidada
      for (const deuda of deudasSimuladas) {
        if (deuda.saldoPendiente <= 0 && !resultado.find(r => r.deuda.id === deuda.id)) {
          const fechaLiberacion = new Date()
          fechaLiberacion.setMonth(fechaLiberacion.getMonth() + mesActual)
          
          resultado.push({
            deuda: deuda,
            mesLiberacion: mesActual,
            fechaLiberacion,
            interesAhorrado: interesAhorradoTotal,
            ordenAtaque: resultado.length + 1
          })

          // Al liquidar, el pago de esta deuda se suma al excedente
          excedente += deuda.pagoMinimo
        }
      }
    }

    return resultado
  }, [deudasOrdenadas, pagoMensualDisponible, totales.excedente])

  // Fecha de libertad financiera
  const fechaLibertad = useMemo(() => {
    if (proyeccion.length === 0) return null
    const ultima = proyeccion[proyeccion.length - 1]
    return ultima?.fechaLiberacion
  }, [proyeccion])

  // Calcular ahorro con pago extra del simulador
  const simulacionExtra = useMemo(() => {
    const extra = Number(simuladorExtra.replace(/\D/g, "")) || 0
    if (extra <= 0 || !fechaLibertad) return null

    const nuevoTotal = pagoMensualDisponible + extra
    // Simplificacion: reducir meses proporcionalmente
    const mesesActuales = proyeccion[proyeccion.length - 1]?.mesLiberacion || 0
    const reduccion = Math.floor(mesesActuales * (extra / nuevoTotal))
    const nuevaFecha = new Date()
    nuevaFecha.setMonth(nuevaFecha.getMonth() + mesesActuales - reduccion)

    return {
      mesesReducidos: reduccion,
      nuevaFecha,
      ahorroIntereses: reduccion * (totales.deudaTotal * 0.015) // Estimacion
    }
  }, [simuladorExtra, pagoMensualDisponible, proyeccion, totales.deudaTotal, fechaLibertad])

  // Celebrar cuando se paga una deuda
  const celebrarPago = () => {
    setShowCelebration(true)
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
    setTimeout(() => setShowCelebration(false), 3000)
  }

  const formatFecha = (fecha: Date) => {
    return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
        </div>
      </Card>
    )
  }

  if (deudas.length === 0) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-green-700 dark:text-green-400">¡Felicitaciones!</h3>
          <p className="text-green-600 dark:text-green-300">No tienes deudas registradas. ¡Sigue así!</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.href = "/dashboard/personal/deudas"}>
            Ir a Gestión de Deudas
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con titulo y metodo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            {metodo === "bola_nieve" ? (
              <Snowflake className="w-7 h-7 text-cyan-500" />
            ) : (
              <Mountain className="w-7 h-7 text-orange-500" />
            )}
            Plan de Libertad Financiera
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Método {metodo === "bola_nieve" ? "Bola de Nieve" : "Avalancha"} - Salí de tus deudas paso a paso
          </p>
        </div>
        <Button onClick={() => setShowConfigDialog(true)} variant="outline" className="gap-2">
          <Calculator className="w-4 h-4" />
          Configurar Plan
        </Button>
      </div>

      {/* Resumen Principal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Deuda Total</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatGuaranies(totales.deudaTotal)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-red-500 mt-2">{totales.cantidadDeudas} deuda(s) activa(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Pago Mensual</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatGuaranies(pagoMensualDisponible)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">Disponible para deudas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Excedente Ataque</p>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatGuaranies(totales.excedente)}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-amber-500 mt-2">Para atacar la deuda objetivo</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Libre de Deudas</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {fechaLibertad ? formatFecha(fechaLibertad) : "---"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-green-500 mt-2">Meta de libertad financiera</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta si no hay configuracion */}
      {pagoMensualDisponible <= 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-amber-600" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">Configura tu plan</p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Indica cuánto dinero podes destinar mensualmente al pago de deudas para ver tu proyección.
                </p>
              </div>
              <Button onClick={() => setShowConfigDialog(true)} className="bg-amber-600 hover:bg-amber-700">
                Configurar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Deudas - Plan de Ataque */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-cyan-600" />
            Plan de Ataque
          </CardTitle>
          <CardDescription>
            {metodo === "bola_nieve" 
              ? "Atacando primero las deudas más pequeñas para victorias rápidas"
              : "Atacando primero las deudas con mayor tasa de interés para ahorrar más"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deudasOrdenadas.map((deuda, index) => {
            const pendiente = getDeudaPendiente(deuda)
            const pagoMinimo = getPagoMinimo(deuda)
            const progreso = ((deuda.monto_pagado / deuda.monto_total) * 100)
            const proyeccionDeuda = proyeccion.find(p => p.deuda.id === deuda.id)
            const esObjetivo = index === 0
            const isExpanded = expandedDeuda === deuda.id

            return (
              <div
                key={deuda.id}
                className={`p-4 rounded-xl border-2 transition-all ${
                  esObjetivo 
                    ? "border-cyan-400 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 shadow-lg" 
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Numero de orden */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    esObjetivo 
                      ? "bg-cyan-500 text-white" 
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}>
                    {index + 1}
                  </div>

                  {/* Info de la deuda */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-800 dark:text-white truncate">{deuda.nombre}</h4>
                      {esObjetivo && (
                        <Badge className="bg-cyan-500 text-white gap-1">
                          <Flame className="w-3 h-3" />
                          ATACANDO
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{deuda.acreedor}</p>
                    
                    {/* Barra de progreso */}
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={progreso} className="flex-1 h-2" />
                      <span className="text-xs text-slate-500">{progreso.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Monto pendiente */}
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatGuaranies(pendiente)}</p>
                    <p className="text-xs text-slate-500">pendiente</p>
                  </div>

                  {/* Pago asignado */}
                  <div className="text-right">
                    <p className={`text-lg font-bold ${esObjetivo ? "text-cyan-600" : "text-slate-600 dark:text-slate-300"}`}>
                      {formatGuaranies(esObjetivo ? pagoMinimo + totales.excedente : pagoMinimo)}
                    </p>
                    <p className="text-xs text-slate-500">/mes</p>
                  </div>

                  {/* Fecha liberacion */}
                  <div className="text-right hidden md:block">
                    {proyeccionDeuda ? (
                      <>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatFecha(proyeccionDeuda.fechaLiberacion)}
                        </p>
                        <p className="text-xs text-slate-500">Libre en {proyeccionDeuda.mesLiberacion} meses</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">---</p>
                    )}
                  </div>

                  {/* Expand button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedDeuda(isExpanded ? null : deuda.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Detalles expandidos */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Monto Original</p>
                      <p className="font-medium">{formatGuaranies(deuda.monto_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Ya Pagado</p>
                      <p className="font-medium text-green-600">{formatGuaranies(deuda.monto_pagado)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Tasa de Interés</p>
                      <p className="font-medium">{deuda.tasa_interes || 0}% anual</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Tipo</p>
                      <p className="font-medium capitalize">{deuda.tipo_deuda?.replace("_", " ") || "Préstamo"}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Proyeccion Timeline */}
      {proyeccion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Proyección de Liberación
            </CardTitle>
            <CardDescription>
              Siguiendo el plan, así irás liquidando tus deudas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Linea de tiempo */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-green-500"></div>
              
              <div className="space-y-6">
                {proyeccion.map((item, index) => (
                  <div key={item.deuda.id} className="relative pl-10">
                    {/* Punto en la linea */}
                    <div className={`absolute left-2 w-5 h-5 rounded-full border-2 ${
                      index === proyeccion.length - 1 
                        ? "bg-green-500 border-green-300" 
                        : "bg-cyan-500 border-cyan-300"
                    }`}>
                      {index === proyeccion.length - 1 && (
                        <Trophy className="w-3 h-3 text-white absolute top-0.5 left-0.5" />
                      )}
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">{item.deuda.nombre}</p>
                          <p className="text-sm text-slate-500">{item.deuda.acreedor}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatFecha(item.fechaLiberacion)}</p>
                          <p className="text-xs text-slate-500">En {item.mesLiberacion} meses</p>
                        </div>
                      </div>
                      {index === proyeccion.length - 1 && (
                        <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                          <p className="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                            <PartyPopper className="w-4 h-4" />
                            ¡Libertad Financiera Alcanzada!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulador */}
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            Simulador: ¿Qué pasa si pago más?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="flex-1">
              <Label>Si agrego mensualmente:</Label>
              <Input
                type="text"
                placeholder="500.000"
                value={simuladorExtra}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setSimuladorExtra(value ? Number(value).toLocaleString("es-PY") : "")
                }}
                className="mt-2"
              />
            </div>
            {simulacionExtra && (
              <div className="flex-1 p-4 bg-white dark:bg-slate-800 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Te liberarías</p>
                    <p className="text-lg font-bold text-purple-600">{simulacionExtra.mesesReducidos} meses antes</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Nueva fecha de libertad</p>
                    <p className="text-lg font-bold text-green-600">{formatFecha(simulacionExtra.nuevaFecha)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Configuracion */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-600" />
              Configura tu Plan Anti-Deudas
            </DialogTitle>
            <DialogDescription>
              Define cuánto podés destinar mensualmente y elige tu método de pago
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Monto mensual */}
            <div className="space-y-2">
              <Label>¿Cuánto podés pagar mensualmente para todas tus deudas?</Label>
              <Input
                type="text"
                placeholder="2.500.000"
                value={pagoMensualInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "")
                  setPagoMensualInput(value ? Number(value).toLocaleString("es-PY") : "")
                }}
              />
              {pagoMensualInput && (
                <p className="text-sm text-slate-500">
                  {formatGuaranies(Number(pagoMensualInput.replace(/\D/g, "")))}
                </p>
              )}
              <p className="text-xs text-slate-400">
                Incluye todos los pagos mínimos + lo extra que puedas aportar
              </p>
            </div>

            {/* Metodo */}
            <div className="space-y-4">
              <Label>Método de Pago</Label>
              
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  metodo === "bola_nieve" 
                    ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30" 
                    : "border-slate-200 dark:border-slate-700"
                }`}
                onClick={() => setMetodo("bola_nieve")}
              >
                <div className="flex items-center gap-3">
                  <Snowflake className={`w-6 h-6 ${metodo === "bola_nieve" ? "text-cyan-600" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className="font-semibold">Bola de Nieve</p>
                    <p className="text-sm text-slate-500">Pagar primero las deudas más pequeñas</p>
                  </div>
                  <Badge variant="outline" className="text-xs">Recomendado</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Victorias rápidas que te motivan a seguir. Ideal si necesitas ver progreso.
                </p>
              </div>

              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  metodo === "avalancha" 
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-950/30" 
                    : "border-slate-200 dark:border-slate-700"
                }`}
                onClick={() => setMetodo("avalancha")}
              >
                <div className="flex items-center gap-3">
                  <Mountain className={`w-6 h-6 ${metodo === "avalancha" ? "text-orange-600" : "text-slate-400"}`} />
                  <div className="flex-1">
                    <p className="font-semibold">Avalancha</p>
                    <p className="text-sm text-slate-500">Pagar primero las de mayor interés</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Ahorrás más dinero en intereses a largo plazo. Ideal si sos disciplinado.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarConfiguracion} className="bg-cyan-600 hover:bg-cyan-700">
              Guardar Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Celebracion */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl animate-bounce">
            <div className="flex flex-col items-center gap-4">
              <PartyPopper className="w-16 h-16 text-yellow-500" />
              <h3 className="text-2xl font-bold text-green-600">¡Deuda Liquidada!</h3>
              <p className="text-slate-600">Seguí así, estás más cerca de tu libertad financiera</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
