"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Calendar, Zap, TrendingUp, CheckCircle2, Plus, Save } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { formatGuaranies } from "@/lib/utils"
import { toast } from "sonner"

interface Deuda {
  id: string
  nombre: string
  monto_total: number
  monto_pagado: number
  cuotas_totales: number | null
  cuotas_pagadas: number
  monto_cuota: number | null
  acreedor: string
  estado: string
}

interface CalendarioDeudasProps {
  userId: string
  perfilId: string
}

interface PagoMensual {
  deudaId: string
  mes: string // YYYY-MM
  monto: number
  esExtra: boolean
}

export function CalendarioDeudas({ userId, perfilId }: CalendarioDeudasProps) {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [loading, setLoading] = useState(true)
  const [pagosPersonalizados, setPagosPersonalizados] = useState<Record<string, Record<string, number>>>({})
  const [acelerador, setAcelerador] = useState<number>(0)
  const [guardando, setGuardando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Generar meses del año actual
  const meses = useMemo(() => {
    const hoy = new Date()
    const año = hoy.getFullYear()
    const resultado = []
    
    for (let i = 0; i < 12; i++) {
      const fecha = new Date(año, i, 1)
      resultado.push({
        key: `${año}-${String(i + 1).padStart(2, '0')}`,
        label: fecha.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
        año: año.toString().slice(-2)
      })
    }
    return resultado
  }, [])

  useEffect(() => {
    fetchDeudas()
    fetchPagosPersonalizados()
  }, [])

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from("deudas")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)
        .neq("estado", "pagada")
        .order("created_at", { ascending: true })

      if (error) throw error
      setDeudas(data || [])
    } catch (error) {
      console.error("Error fetching deudas:", error)
      toast.error("Error al cargar las deudas")
    } finally {
      setLoading(false)
    }
  }

  const fetchPagosPersonalizados = async () => {
    try {
      const { data, error } = await supabase
        .from("calendario_pagos_deudas")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)

      if (error && error.code !== 'PGRST116') throw error
      
      if (data) {
        const pagosMap: Record<string, Record<string, number>> = {}
        data.forEach((pago: any) => {
          if (!pagosMap[pago.deuda_id]) {
            pagosMap[pago.deuda_id] = {}
          }
          pagosMap[pago.deuda_id][pago.mes] = pago.monto
        })
        setPagosPersonalizados(pagosMap)
        
        // Cargar acelerador
        const aceleradorData = data.find((p: any) => p.deuda_id === 'acelerador')
        if (aceleradorData) {
          setAcelerador(aceleradorData.monto || 0)
        }
      }
    } catch (error) {
      console.error("Error fetching pagos:", error)
    }
  }

  // Calcular pagos mensuales para cada deuda
  const calcularPagosMensuales = (deuda: Deuda) => {
    const cuotasRestantes = (deuda.cuotas_totales || 12) - deuda.cuotas_pagadas
    const cuotaMensual = deuda.monto_cuota || Math.ceil((deuda.monto_total - deuda.monto_pagado) / Math.max(cuotasRestantes, 1))
    const pendiente = deuda.monto_total - deuda.monto_pagado
    
    const pagos: Record<string, number> = {}
    let saldoRestante = pendiente
    let cuotasPagadas = 0
    
    for (const mes of meses) {
      if (saldoRestante <= 0 || cuotasPagadas >= cuotasRestantes) {
        pagos[mes.key] = 0
        continue
      }
      
      // Usar pago personalizado si existe
      const pagoPersonalizado = pagosPersonalizados[deuda.id]?.[mes.key]
      const pagoDelMes = pagoPersonalizado !== undefined ? pagoPersonalizado : cuotaMensual
      
      const pagoReal = Math.min(pagoDelMes, saldoRestante)
      pagos[mes.key] = pagoReal
      saldoRestante -= pagoReal
      cuotasPagadas++
    }
    
    return { pagos, saldoFinal: Math.max(0, saldoRestante) }
  }

  // Actualizar pago personalizado
  const actualizarPago = (deudaId: string, mes: string, valor: string) => {
    const monto = Number(valor.replace(/\D/g, '')) || 0
    setPagosPersonalizados(prev => ({
      ...prev,
      [deudaId]: {
        ...prev[deudaId],
        [mes]: monto
      }
    }))
  }

  // Guardar cambios
  const guardarCambios = async () => {
    setGuardando(true)
    try {
      // Eliminar pagos anteriores
      await supabase
        .from("calendario_pagos_deudas")
        .delete()
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)

      // Insertar nuevos pagos
      const pagosToInsert: any[] = []
      
      for (const [deudaId, pagosPorMes] of Object.entries(pagosPersonalizados)) {
        for (const [mes, monto] of Object.entries(pagosPorMes)) {
          if (monto > 0) {
            pagosToInsert.push({
              user_id: userId,
              perfil_id: perfilId,
              deuda_id: deudaId,
              mes,
              monto
            })
          }
        }
      }

      if (pagosToInsert.length > 0) {
        const { error } = await supabase
          .from("calendario_pagos_deudas")
          .insert(pagosToInsert)
        
        if (error) throw error
      }

      toast.success("Calendario guardado correctamente")
    } catch (error) {
      console.error("Error guardando:", error)
      toast.error("Error al guardar el calendario")
    } finally {
      setGuardando(false)
    }
  }

  // Calcular totales por mes
  const totalesPorMes = useMemo(() => {
    const totales: Record<string, number> = {}
    
    for (const mes of meses) {
      totales[mes.key] = deudas.reduce((sum, deuda) => {
        const { pagos } = calcularPagosMensuales(deuda)
        return sum + (pagos[mes.key] || 0)
      }, 0) + (acelerador || 0)
    }
    
    return totales
  }, [deudas, meses, pagosPersonalizados, acelerador])

  // Calcular total general
  const totalGeneral = useMemo(() => {
    return deudas.reduce((sum, deuda) => sum + (deuda.monto_total - deuda.monto_pagado), 0)
  }, [deudas])

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
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <Calendar className="w-12 h-12 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">No hay deudas para mostrar en el calendario</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-cyan-600" />
              Calendario de Pagos
            </CardTitle>
            <CardDescription>
              Planifica y visualiza tus pagos mes a mes
            </CardDescription>
          </div>
          <Button onClick={guardarCambios} disabled={guardando} className="gap-2 bg-cyan-600 hover:bg-cyan-700">
            <Save className="w-4 h-4" />
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[1200px]">
              {/* Header de la tabla */}
              <div className="grid grid-cols-[40px_150px_100px_80px_120px_repeat(12,80px)_100px_100px] gap-1 mb-2">
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">N°</div>
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded">Deudas</div>
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">Cuota</div>
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">Cant.</div>
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">Deuda</div>
                {meses.map(mes => (
                  <div key={mes.key} className="bg-blue-500 text-white text-xs font-bold p-2 rounded text-center">
                    {mes.label.charAt(0).toUpperCase() + mes.label.slice(1)} - {mes.año}
                  </div>
                ))}
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">Total</div>
                <div className="bg-orange-500 text-white text-xs font-bold p-2 rounded text-center">Saldo</div>
              </div>

              {/* Filas de deudas */}
              {deudas.map((deuda, index) => {
                const { pagos, saldoFinal } = calcularPagosMensuales(deuda)
                const cuotasRestantes = (deuda.cuotas_totales || 12) - deuda.cuotas_pagadas
                const pendiente = deuda.monto_total - deuda.monto_pagado
                const totalPagado = Object.values(pagos).reduce((a, b) => a + b, 0)
                
                return (
                  <div key={deuda.id} className="grid grid-cols-[40px_150px_100px_80px_120px_repeat(12,80px)_100px_100px] gap-1 mb-1">
                    <div className="bg-slate-100 dark:bg-slate-800 text-xs font-medium p-2 rounded text-center">
                      {index + 1}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-xs font-medium p-2 rounded truncate" title={deuda.nombre}>
                      {deuda.nombre}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-xs p-2 rounded text-right">
                      {formatGuaranies(deuda.monto_cuota || 0).replace('Gs ', '')}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-xs p-2 rounded text-center">
                      {cuotasRestantes}
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 text-xs p-2 rounded text-right font-medium">
                      {formatGuaranies(pendiente).replace('Gs ', '')}
                    </div>
                    {meses.map(mes => {
                      const pago = pagos[mes.key] || 0
                      const tienePago = pago > 0
                      
                      return (
                        <div key={mes.key} className={`text-xs p-1 rounded ${tienePago ? 'bg-green-100 dark:bg-green-900/30' : 'bg-slate-50 dark:bg-slate-900'}`}>
                          <Input
                            type="text"
                            value={pago > 0 ? formatGuaranies(pago).replace('Gs ', '') : ''}
                            onChange={(e) => actualizarPago(deuda.id, mes.key, e.target.value)}
                            className={`h-6 text-xs text-right p-1 border-0 ${tienePago ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-transparent'}`}
                            placeholder="0"
                          />
                        </div>
                      )
                    })}
                    <div className={`text-xs p-2 rounded text-right font-bold ${saldoFinal === 0 ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {formatGuaranies(totalPagado).replace('Gs ', '')}
                    </div>
                    <div className={`text-xs p-2 rounded text-right font-bold ${saldoFinal === 0 ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {saldoFinal === 0 ? '0' : formatGuaranies(saldoFinal).replace('Gs ', '')}
                    </div>
                  </div>
                )
              })}

              {/* Filas vacías para agregar más deudas */}
              {Array.from({ length: Math.max(0, 9 - deudas.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="grid grid-cols-[40px_150px_100px_80px_120px_repeat(12,80px)_100px_100px] gap-1 mb-1">
                  <div className="bg-slate-50 dark:bg-slate-900/50 text-xs p-2 rounded text-center text-slate-400">
                    {deudas.length + i + 1}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded"></div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded"></div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded"></div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded"></div>
                  {meses.map(mes => (
                    <div key={mes.key} className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded"></div>
                  ))}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-right text-xs text-slate-400">0</div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded text-right text-xs text-slate-400">0</div>
                </div>
              ))}

              {/* Fila de totales */}
              <div className="grid grid-cols-[40px_150px_100px_80px_120px_repeat(12,80px)_100px_100px] gap-1 mt-4 mb-1">
                <div className="p-2"></div>
                <div className="p-2"></div>
                <div className="bg-slate-200 dark:bg-slate-700 text-xs font-bold p-2 rounded text-right">
                  {formatGuaranies(deudas.reduce((sum, d) => sum + (d.monto_cuota || 0), 0)).replace('Gs ', '')}
                </div>
                <div className="p-2"></div>
                <div className="bg-slate-200 dark:bg-slate-700 text-xs font-bold p-2 rounded text-right">
                  {formatGuaranies(totalGeneral).replace('Gs ', '')}
                </div>
                {meses.map(mes => (
                  <div key={mes.key} className="bg-green-200 dark:bg-green-900/50 text-xs font-bold p-2 rounded text-right text-green-700 dark:text-green-400">
                    {formatGuaranies(totalesPorMes[mes.key] || 0).replace('Gs ', '')}
                  </div>
                ))}
                <div className="bg-green-500 text-white text-xs font-bold p-2 rounded text-right">
                  {formatGuaranies(Object.values(totalesPorMes).reduce((a, b) => a + b, 0)).replace('Gs ', '')}
                </div>
                <div className="bg-green-500 text-white text-xs font-bold p-2 rounded text-right">
                  0
                </div>
              </div>

              {/* Fila del Acelerador */}
              <div className="grid grid-cols-[40px_150px_100px_80px_120px_repeat(12,80px)_100px_100px] gap-1 mt-2">
                <div className="p-2"></div>
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold p-2 rounded flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Acelerador
                </div>
                <div className="bg-cyan-100 dark:bg-cyan-900/30 p-1 rounded">
                  <Input
                    type="text"
                    value={acelerador > 0 ? formatGuaranies(acelerador).replace('Gs ', '') : ''}
                    onChange={(e) => setAcelerador(Number(e.target.value.replace(/\D/g, '')) || 0)}
                    className="h-6 text-xs text-right p-1 border-0 bg-transparent text-cyan-700 dark:text-cyan-400 font-bold"
                    placeholder="0"
                  />
                </div>
                <div className="p-2"></div>
                <div className="bg-amber-100 dark:bg-amber-900/30 text-xs font-bold p-2 rounded text-right text-amber-700 dark:text-amber-400">
                  {formatGuaranies(deudas.reduce((sum, d) => sum + (d.monto_cuota || 0), 0) + acelerador).replace('Gs ', '')}
                </div>
                {meses.map((mes, i) => (
                  <div key={mes.key} className={`p-2 rounded ${i === 0 ? 'bg-amber-100 dark:bg-amber-900/30' : ''}`}>
                    {i === 0 && acelerador > 0 && (
                      <span className="text-xs font-bold text-amber-600">{formatGuaranies(acelerador).replace('Gs ', '')}</span>
                    )}
                  </div>
                ))}
                <div className="p-2"></div>
                <div className="p-2"></div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 rounded border border-green-300"></div>
          <span className="text-slate-600 dark:text-slate-400">Pago programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-600 dark:text-slate-400">Deuda liquidada</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="text-slate-600 dark:text-slate-400">Acelerador: pago extra mensual para liquidar mas rapido</span>
        </div>
      </div>
    </div>
  )
}
