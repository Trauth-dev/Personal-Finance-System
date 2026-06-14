"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import {
  Info,
  Wallet,
  Receipt,
  TrendingDown,
  AlertTriangle,
  Scale,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

interface TransaccionDetalle {
  id: string
  fecha: string
  concepto: string
  subcategoria: string
  monto: number
  tipoCategoria: string
}

interface CategoriaComparativa {
  nombre: string
  presupuestado: number
  gastado: number
  diferencia: number
  porcentaje: number
  transacciones?: TransaccionDetalle[]
}

interface Props {
  perfilId: string
}

export function PresupuestoVsRealidad({ perfilId }: Props) {
  const today = getParaguayDate()
  const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<CategoriaComparativa[]>([])
  const [totalPresupuestado, setTotalPresupuestado] = useState(0)
  const [totalGastado, setTotalGastado] = useState(0)
  const [metaSalarioTotal, setMetaSalarioTotal] = useState(0)
  const [showAll, setShowAll] = useState(true)
  const [vistaDetallada, setVistaDetallada] = useState(false)
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [selectedMonth, perfilId])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [year, month] = selectedMonth.split("-").map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDia = new Date(year, month, 0).toISOString().split("T")[0]

    // Fetch presupuesto_mensual
    const { data: presupuestoMensual } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })
      .limit(1)

    const { data: tiposCategorias } = await supabase
      .from("tipos_categoria_egreso")
      .select("id, nombre")
      .eq("perfil_id", perfilId)

    // Obtener montos exactos desde presupuesto_categorias
    const { data: presupuestoCategorias } = await supabase
      .from("presupuesto_categorias")
      .select("categoria, monto_presupuestado")
      .eq("perfil_id", perfilId)
      .gte("mes", primerDia)
      .lte("mes", ultimoDia)

    // Obtener relación categorias_egreso -> tipos_categoria_egreso
    const { data: categoriasEgreso } = await supabase
      .from("categorias_egreso")
      .select("nombre, tipos_categoria_egreso!inner(nombre)")
      .eq("perfil_id", perfilId)

    // Crear mapa de subcategoría -> tipo principal
    const subcategoriaToTipo: Record<string, string> = {}
    categoriasEgreso?.forEach((ce: any) => {
      subcategoriaToTipo[ce.nombre] = ce.tipos_categoria_egreso?.nombre || ""
    })

    // Sumar montos por tipo de categoría desde presupuesto_categorias
    const montosPorTipo: Record<string, number> = {}
    presupuestoCategorias?.forEach((pc: any) => {
      const tipoPrincipal = subcategoriaToTipo[pc.categoria]
      if (tipoPrincipal) {
        montosPorTipo[tipoPrincipal] = (montosPorTipo[tipoPrincipal] || 0) + Number(pc.monto_presupuestado || 0)
      }
    })

    const { data: egresos } = await supabase
      .from("egresos")
      .select("id, monto, fecha, concepto, tipo_categoria_id, tipo_categoria:tipos_categoria_egreso(nombre), categoria_egreso:categorias_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })

    const presupuesto = presupuestoMensual?.[0]
    const metaSalario = Number(presupuesto?.meta_salario || 0)

    // Agrupar gastos y transacciones por categoría
    const gastosMap = new Map<string, number>()
    const transaccionesPorCategoria = new Map<string, TransaccionDetalle[]>()
    
    egresos?.forEach((e: any) => {
      const tipoCategoria = e.tipo_categoria?.nombre || "Sin categoria"
      gastosMap.set(tipoCategoria, (gastosMap.get(tipoCategoria) || 0) + Number(e.monto))
      
      // Agregar transacción al listado
      const transaccion: TransaccionDetalle = {
        id: e.id,
        fecha: e.fecha,
        concepto: e.concepto || "Sin descripción",
        subcategoria: e.categoria_egreso?.nombre || "General",
        monto: Number(e.monto),
        tipoCategoria: tipoCategoria
      }
      
      if (!transaccionesPorCategoria.has(tipoCategoria)) {
        transaccionesPorCategoria.set(tipoCategoria, [])
      }
      transaccionesPorCategoria.get(tipoCategoria)!.push(transaccion)
    })

    const categoriasResult: CategoriaComparativa[] = []
    let sumPresupuestado = 0
    let sumGastado = 0
    const nombresUsados = new Set<string>()

    if (tiposCategorias) {
      for (const tipo of tiposCategorias) {
        // Usar monto exacto desde presupuesto_categorias
        const montoPresupuestado = montosPorTipo[tipo.nombre] || 0
        const montoGastado = gastosMap.get(tipo.nombre) || 0
        const diferencia = montoPresupuestado - montoGastado
        const porcentaje = montoPresupuestado > 0 ? (montoGastado / montoPresupuestado) * 100 : montoGastado > 0 ? 100 : 0

        categoriasResult.push({
          nombre: tipo.nombre,
          presupuestado: montoPresupuestado,
          gastado: montoGastado,
          diferencia,
          porcentaje,
          transacciones: transaccionesPorCategoria.get(tipo.nombre) || [],
        })

        sumPresupuestado += montoPresupuestado
        sumGastado += montoGastado
        nombresUsados.add(tipo.nombre)
      }
    }

    gastosMap.forEach((monto, nombre) => {
      if (!nombresUsados.has(nombre)) {
        categoriasResult.push({
          nombre,
          presupuestado: 0,
          gastado: monto,
          diferencia: -monto,
          porcentaje: 100,
          transacciones: transaccionesPorCategoria.get(nombre) || [],
        })
        sumGastado += monto
      }
    })

    categoriasResult.sort((a, b) => b.presupuestado - a.presupuestado)

    setCategorias(categoriasResult)
    setTotalPresupuestado(sumPresupuestado)
    setTotalGastado(sumGastado)
    setMetaSalarioTotal(metaSalario)
    setLoading(false)
  }

  // Use metaSalarioTotal (actual loaded budget) for the top-level summary
  const presupuestoDisplay = metaSalarioTotal > 0 ? metaSalarioTotal : totalPresupuestado
  const diferencia = presupuestoDisplay - totalGastado
  const porcentajeGeneral = presupuestoDisplay > 0 ? (totalGastado / presupuestoDisplay) * 100 : 0
  const isExceeded = diferencia < 0

  // Filter categories based on showAll toggle
  const filteredCategorias = showAll
    ? categorias
    : categorias.filter((c) => c.gastado > 0 || c.presupuestado > 0)

  const categoriasConMovimiento = categorias.filter((c) => c.gastado > 0)
  const categoriasSinMovimiento = categorias.filter((c) => c.gastado === 0 && c.presupuestado === 0)

  // Find best and worst categories
  const categoriasConPresupuesto = categorias.filter((c) => c.presupuestado > 0)
  const mejorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((best, c) => c.porcentaje < best.porcentaje ? c : best, categoriasConPresupuesto[0])
    : null
  const peorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((worst, c) => c.porcentaje > worst.porcentaje ? c : worst, categoriasConPresupuesto[0])
    : null

  const getStatusInfo = (porcentaje: number) => {
    if (porcentaje <= 80) return { ring: "#14b8a6", label: "CONTROLADO", labelBg: "bg-teal-100 text-teal-700", cardBg: "", barColor: "#14b8a6" }
    if (porcentaje <= 100) return { ring: "#eab308", label: "ATENTO", labelBg: "bg-yellow-100 text-yellow-700", cardBg: "", barColor: "#eab308" }
    return { ring: "#ef4444", label: "EXCEDIDO", labelBg: "bg-red-100 text-red-700", cardBg: "bg-gradient-to-br from-red-50 to-red-100/60 border-red-200", barColor: "#ef4444" }
  }

  const toggleCategoriaExpandida = (nombre: string) => {
    setCategoriasExpandidas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nombre)) {
        newSet.delete(nombre)
      } else {
        newSet.add(nombre)
      }
      return newSet
    })
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha + "T00:00:00")
    return date.toLocaleDateString("es-PY", { day: "2-digit", month: "short" })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Scale className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Presupuesto vs Realidad</h1>
            <p className="text-muted-foreground">Compara lo planificado con lo realmente gastado</p>
          </div>
        </div>
      </div>

      {/* Month selector */}
      <div className="mb-6">
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando comparativo...</p>
          </div>
        </div>
      ) : categorias.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <Scale className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No hay presupuesto configurado</p>
            <p className="text-sm text-muted-foreground">Configura tu presupuesto mensual desde la seccion de Presupuesto para ver la comparacion.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 3 Summary Cards - matching image style */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {/* Presupuesto Total */}
            <Card className="border-0 bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Presupuesto Total</span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(presupuestoDisplay)}</p>
                <p className="text-xs text-slate-300 mt-1">Planificado para el mes</p>
              </CardContent>
            </Card>

            {/* Gasto Real */}
            <Card className="border-0 bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">Gasto Real</span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(totalGastado)}</p>
                <p className="text-xs text-teal-200 mt-1">{porcentajeGeneral.toFixed(1)}% del presupuesto</p>
              </CardContent>
            </Card>

            {/* Diferencia */}
            <Card className={`border-0 shadow-lg text-white ${isExceeded ? "bg-gradient-to-br from-red-600 to-red-800" : "bg-gradient-to-br from-emerald-600 to-emerald-800"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {isExceeded ? "Excedido" : "Disponible"}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    {isExceeded
                      ? <AlertTriangle className="w-5 h-5 text-white" />
                      : <TrendingDown className="w-5 h-5 text-white" />
                    }
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(Math.abs(diferencia))}</p>
                <p className="text-xs opacity-80 mt-1">
                  {isExceeded ? `+${porcentajeGeneral.toFixed(1)}% del presupuesto` : "Todavia puedes gastar"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and View toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-all"
                checked={showAll}
                onCheckedChange={(checked) => setShowAll(checked === true)}
              />
              <Label htmlFor="show-all" className="text-sm text-muted-foreground cursor-pointer select-none">
                Mostrar categorias sin movimientos ({categoriasSinMovimiento.length})
              </Label>
            </div>
            
            {/* Toggle Resumido / Detallado */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button
                variant={!vistaDetallada ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaDetallada(false)}
                className={`h-8 px-3 ${!vistaDetallada ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50"}`}
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Resumido
              </Button>
              <Button
                variant={vistaDetallada ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaDetallada(true)}
                className={`h-8 px-3 ${vistaDetallada ? "bg-white dark:bg-slate-700 shadow-sm" : "hover:bg-white/50"}`}
              >
                <List className="w-4 h-4 mr-1.5" />
                Detallado
              </Button>
            </div>
          </div>

          {/* Vista Resumido (Cards Grid) */}
          {!vistaDetallada && (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCategorias.map((cat) => {
                const status = getStatusInfo(cat.porcentaje)
                const usedPct = Math.min(cat.porcentaje, 100)
                const remainPct = 100 - usedPct
                const exceeded = cat.porcentaje > 100
                const hasNoActivity = cat.gastado === 0 && cat.presupuestado === 0

                const donutData = [
                  { name: "Usado", value: usedPct || 0.01 },
                  { name: "Restante", value: remainPct },
                ]

                return (
                  <Card
                    key={cat.nombre}
                    className={`border transition-all hover:shadow-md ${
                      exceeded
                        ? "bg-gradient-to-br from-red-50 to-red-100/60 border-red-200"
                        : hasNoActivity
                          ? "bg-white dark:bg-slate-100 border-slate-200 opacity-60"
                          : "bg-white dark:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-start gap-4">
                        {/* Donut Chart */}
                        <div className="relative w-[72px] h-[72px] flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={24}
                                outerRadius={34}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                              >
                                <Cell fill={exceeded ? "#ef4444" : "#14b8a6"} />
                                <Cell fill="#e5e7eb" />
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-[11px] font-bold ${exceeded ? "text-red-600" : "text-teal-600"}`}>
                              {cat.porcentaje > 999 ? "+999%" : `${cat.porcentaje.toFixed(0)}%`}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {/* Title + Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-slate-900 truncate">{getNombreCategoriaDisplay(cat.nombre)}</h3>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${status.labelBg}`}>
                              {status.label}
                            </span>
                          </div>

                          {/* Data rows */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Presup.</span>
                              <span className="font-semibold text-slate-800">{formatGuaranies(cat.presupuestado)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Gastado</span>
                              <span className={`font-bold ${exceeded ? "text-red-600" : "text-slate-800"}`}>
                                {formatGuaranies(cat.gastado)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">{cat.diferencia >= 0 ? "Disponible" : "Excedido"}</span>
                            <span className={`font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                              {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2.5 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(cat.porcentaje, 100)}%`,
                              backgroundColor: status.barColor,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
              })}
            </div>
          )}

          {/* Vista Detallada (Lista expandible) */}
          {vistaDetallada && (
            <div className="space-y-3">
              {filteredCategorias.map((cat) => {
                const status = getStatusInfo(cat.porcentaje)
                const exceeded = cat.porcentaje > 100
                const isExpanded = categoriasExpandidas.has(cat.nombre)
                const hasTransactions = cat.transacciones && cat.transacciones.length > 0

                return (
                  <Collapsible
                    key={cat.nombre}
                    open={isExpanded}
                    onOpenChange={() => toggleCategoriaExpandida(cat.nombre)}
                  >
                    <Card className={`border transition-all ${
                      exceeded
                        ? "bg-gradient-to-br from-red-50 to-red-100/60 border-red-200"
                        : "bg-white dark:bg-slate-50 border-slate-200"
                    }`}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {hasTransactions ? (
                                isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                )
                              ) : (
                                <div className="w-5 h-5" />
                              )}
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.ring }} />
                              <h3 className="text-sm font-bold text-slate-900">{getNombreCategoriaDisplay(cat.nombre)}</h3>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.labelBg}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-xs">
                              <div className="text-right">
                                <span className="text-slate-500">Presup.</span>
                                <span className="ml-2 font-semibold text-slate-800">{formatGuaranies(cat.presupuestado)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500">Gastado</span>
                                <span className={`ml-2 font-bold ${exceeded ? "text-red-600" : "text-slate-800"}`}>
                                  {formatGuaranies(cat.gastado)}
                                </span>
                              </div>
                              <div className="text-right min-w-[100px]">
                                <span className="text-slate-500">{cat.diferencia >= 0 ? "Disponible" : "Excedido"}</span>
                                <span className={`ml-2 font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                  {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                                </span>
                              </div>
                              <div className="w-16 text-right">
                                <span className={`font-bold ${exceeded ? "text-red-600" : "text-teal-600"}`}>
                                  {cat.porcentaje.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {hasTransactions && (
                          <div className="border-t border-slate-200">
                            <div className="px-6 py-2 bg-slate-50/80">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase">
                                <div className="col-span-2">Fecha</div>
                                <div className="col-span-4">Concepto</div>
                                <div className="col-span-3">Subcategoría</div>
                                <div className="col-span-3 text-right">Monto</div>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {cat.transacciones!.map((trans) => (
                                <div key={trans.id} className="px-6 py-2.5 hover:bg-slate-50/50 transition-colors">
                                  <div className="grid grid-cols-12 gap-2 text-xs">
                                    <div className="col-span-2 text-slate-600">{formatFecha(trans.fecha)}</div>
                                    <div className="col-span-4 text-slate-800 font-medium truncate">{trans.concepto}</div>
                                    <div className="col-span-3 text-slate-500 truncate">{trans.subcategoria}</div>
                                    <div className="col-span-3 text-right font-semibold text-slate-800">
                                      {formatGuaranies(trans.monto)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="px-6 py-2 bg-slate-100/80 border-t border-slate-200">
                              <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-9 font-bold text-slate-700">Total {getNombreCategoriaDisplay(cat.nombre)}</div>
                                <div className="col-span-3 text-right font-bold text-slate-900">
                                  {formatGuaranies(cat.gastado)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!hasTransactions && (
                          <div className="px-6 py-4 border-t border-slate-200 text-center">
                            <p className="text-sm text-slate-500">No hay transacciones en esta categoría</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          )}

          {/* Summary Table with Expandable Rows */}
          <Card className="border bg-white dark:bg-slate-50 border-slate-200">
            <CardContent className="pt-5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Resumen por Categoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 w-8"></th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Categoria</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Presupuestado</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Gastado</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Diferencia</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">% Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategorias.map((cat) => {
                      const status = getStatusInfo(cat.porcentaje)
                      const isExpanded = categoriasExpandidas.has(`resumen_${cat.nombre}`)
                      const hasTransactions = cat.transacciones && cat.transacciones.length > 0
                      
                      return (
                        <React.Fragment key={cat.nombre}>
                          <tr 
                            className={`border-b border-slate-100 last:border-0 ${hasTransactions ? "cursor-pointer hover:bg-slate-50" : ""}`}
                            onClick={() => hasTransactions && toggleCategoriaExpandida(`resumen_${cat.nombre}`)}
                          >
                            <td className="py-2.5 px-2">
                              {hasTransactions && (
                                isExpanded 
                                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                                  : <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.ring }} />
                                <span className="font-medium text-slate-800">{getNombreCategoriaDisplay(cat.nombre)}</span>
                                {hasTransactions && (
                                  <span className="text-[10px] text-slate-400">({cat.transacciones!.length})</span>
                                )}
                              </div>
                            </td>
                            <td className="text-right py-2.5 px-2 text-slate-700 font-medium">{formatGuaranies(cat.presupuestado)}</td>
                            <td className="text-right py-2.5 px-2 text-slate-700 font-medium">{formatGuaranies(cat.gastado)}</td>
                            <td className={`text-right py-2.5 px-2 font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                              {cat.diferencia >= 0 ? "+" : ""}{formatGuaranies(cat.diferencia)}
                            </td>
                            <td className={`text-right py-2.5 px-2 font-bold ${cat.porcentaje > 100 ? "text-red-600" : "text-teal-600"}`}>
                              {cat.porcentaje.toFixed(1)}%
                            </td>
                          </tr>
                          {/* Expanded Transactions */}
                          {isExpanded && hasTransactions && (
                            <>
                              <tr className="bg-slate-50/80">
                                <td></td>
                                <td colSpan={5} className="py-1 px-2">
                                  <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase pl-4">
                                    <div className="col-span-2">Fecha</div>
                                    <div className="col-span-4">Concepto</div>
                                    <div className="col-span-3">Subcategoría</div>
                                    <div className="col-span-3 text-right">Monto</div>
                                  </div>
                                </td>
                              </tr>
                              {cat.transacciones!.map((trans) => (
                                <tr key={trans.id} className="bg-slate-50/50 border-b border-slate-100">
                                  <td></td>
                                  <td colSpan={5} className="py-1.5 px-2">
                                    <div className="grid grid-cols-12 gap-2 text-xs pl-4">
                                      <div className="col-span-2 text-slate-500">{formatFecha(trans.fecha)}</div>
                                      <div className="col-span-4 text-slate-700 truncate">{trans.concepto}</div>
                                      <div className="col-span-3 text-slate-500 truncate">{trans.subcategoria}</div>
                                      <div className="col-span-3 text-right font-medium text-slate-800">
                                        {formatGuaranies(trans.monto)}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      )
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td></td>
                      <td className="py-2.5 px-2 font-bold text-slate-900">TOTAL</td>
                      <td className="text-right py-2.5 px-2 font-bold text-slate-900">{formatGuaranies(presupuestoDisplay)}</td>
                      <td className="text-right py-2.5 px-2 font-bold text-slate-900">{formatGuaranies(totalGastado)}</td>
                      <td className={`text-right py-2.5 px-2 font-bold ${diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                        {diferencia >= 0 ? "+" : ""}{formatGuaranies(diferencia)}
                      </td>
                      <td className={`text-right py-2.5 px-2 font-bold ${porcentajeGeneral > 100 ? "text-red-600" : "text-teal-600"}`}>
                        {porcentajeGeneral.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Insight Card */}
          {mejorCategoria && peorCategoria && (
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Insight del Mes</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Tu categoria mas controlada es <span className="font-bold text-teal-600">{getNombreCategoriaDisplay(mejorCategoria.nombre)}</span> ({mejorCategoria.porcentaje.toFixed(1)}% usado).
                      {peorCategoria.nombre !== mejorCategoria.nombre && (
                        <>
                          {" "}Tu categoria {peorCategoria.porcentaje > 100 ? "mas excedida" : "con mayor uso"} es{" "}
                          <span className={`font-bold ${peorCategoria.porcentaje > 100 ? "text-red-600" : "text-yellow-600"}`}>
                            {getNombreCategoriaDisplay(peorCategoria.nombre)}
                          </span>{" "}
                          ({peorCategoria.porcentaje.toFixed(1)}%).
                        </>
                      )}
                      {diferencia >= 0
                        ? ` En general, estas dentro del presupuesto con ${formatGuaranies(diferencia)} disponibles.`
                        : ` Atencion: has excedido el presupuesto general por ${formatGuaranies(Math.abs(diferencia))}.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
