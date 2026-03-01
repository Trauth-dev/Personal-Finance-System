"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import {
  Info,
  Wallet,
  Receipt,
  TrendingDown,
  AlertTriangle,
  Scale,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

interface CategoriaComparativa {
  nombre: string
  presupuestado: number
  gastado: number
  diferencia: number
  porcentaje: number
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

  useEffect(() => {
    loadData()
  }, [selectedMonth, perfilId])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [year, month] = selectedMonth.split("-").map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDia = new Date(year, month, 0).toISOString().split("T")[0]

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

    const { data: egresos } = await supabase
      .from("egresos")
      .select("monto, tipo_categoria_id, tipo_categoria:tipos_categoria_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    const presupuesto = presupuestoMensual?.[0]
    const metaSalario = Number(presupuesto?.meta_salario || 0)

    const categoriasPctMap: Record<string, string> = {
      "Ahorro 2025": "pct_ahorro_2025",
      "Gastos Varios": "pct_gastos_varios",
      "Gastos Vivienda": "pct_gastos_vivienda",
      "Pago Deudas": "pct_pago_deudas",
      "Disfrute": "pct_disfrute",
    }

    const gastosMap = new Map<string, number>()
    egresos?.forEach((e: any) => {
      const nombre = e.tipo_categoria?.nombre || "Sin categoria"
      gastosMap.set(nombre, (gastosMap.get(nombre) || 0) + Number(e.monto))
    })

    const categoriasResult: CategoriaComparativa[] = []
    let sumPresupuestado = 0
    let sumGastado = 0
    const nombresUsados = new Set<string>()

    if (tiposCategorias) {
      for (const tipo of tiposCategorias) {
        const pctField = categoriasPctMap[tipo.nombre]
        const porcentajeAsignado = presupuesto && pctField ? Number((presupuesto as any)[pctField] || 0) : 0
        const montoPresupuestado = metaSalario > 0 ? (metaSalario * porcentajeAsignado) / 100 : 0
        const montoGastado = gastosMap.get(tipo.nombre) || 0
        const diferencia = montoPresupuestado - montoGastado
        const porcentaje = montoPresupuestado > 0 ? (montoGastado / montoPresupuestado) * 100 : montoGastado > 0 ? 100 : 0

        categoriasResult.push({
          nombre: tipo.nombre,
          presupuestado: montoPresupuestado,
          gastado: montoGastado,
          diferencia,
          porcentaje,
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

          {/* Filter toggle */}
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

          {/* Category Cards Grid */}
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
                          <h3 className="text-sm font-bold text-slate-900 truncate">{cat.nombre}</h3>
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

          {/* Summary Table */}
          <Card className="border bg-white dark:bg-slate-50 border-slate-200">
            <CardContent className="pt-5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Resumen por Categoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
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
                      return (
                        <tr key={cat.nombre} className="border-b border-slate-100 last:border-0">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.ring }} />
                              <span className="font-medium text-slate-800">{cat.nombre}</span>
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
                      )
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
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
                      Tu categoria mas controlada es <span className="font-bold text-teal-600">{mejorCategoria.nombre}</span> ({mejorCategoria.porcentaje.toFixed(1)}% usado).
                      {peorCategoria.nombre !== mejorCategoria.nombre && (
                        <>
                          {" "}Tu categoria {peorCategoria.porcentaje > 100 ? "mas excedida" : "con mayor uso"} es{" "}
                          <span className={`font-bold ${peorCategoria.porcentaje > 100 ? "text-red-600" : "text-yellow-600"}`}>
                            {peorCategoria.nombre}
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
