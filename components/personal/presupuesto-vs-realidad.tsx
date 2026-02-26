"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { Card, CardContent } from "@/components/ui/card"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import {
  Info,
  Wallet,
  Receipt,
  TrendingUp,
  TrendingDown,
  Minus,
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

  useEffect(() => {
    loadData()
  }, [selectedMonth, perfilId])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [year, month] = selectedMonth.split("-").map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDia = new Date(year, month, 0).toISOString().split("T")[0]

    // Get presupuesto_mensual for the month (has percentage allocations and meta_salario)
    const { data: presupuestoMensual } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })
      .limit(1)

    // Get tipos_categoria_egreso for this perfil
    const { data: tiposCategorias } = await supabase
      .from("tipos_categoria_egreso")
      .select("id, nombre")
      .eq("perfil_id", perfilId)

    // Get egresos for the month with tipo_categoria
    const { data: egresos } = await supabase
      .from("egresos")
      .select("monto, tipo_categoria_id, tipo_categoria:tipos_categoria_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    const presupuesto = presupuestoMensual?.[0]
    const metaSalario = Number(presupuesto?.meta_salario || 0)

    // Map category names to their percentage field
    const categoriasPctMap: Record<string, string> = {
      "Ahorro 2025": "pct_ahorro_2025",
      "Gastos Varios": "pct_gastos_varios",
      "Gastos Vivienda": "pct_gastos_vivienda",
      "Pago Deudas": "pct_pago_deudas",
      "Disfrute": "pct_disfrute",
    }

    // Build gastos por tipo_categoria
    const gastosMap = new Map<string, number>()
    egresos?.forEach((e: any) => {
      const nombre = e.tipo_categoria?.nombre || "Sin categoria"
      gastosMap.set(nombre, (gastosMap.get(nombre) || 0) + Number(e.monto))
    })

    // Build categories comparison
    const categoriasResult: CategoriaComparativa[] = []
    let sumPresupuestado = 0
    let sumGastado = 0

    // Use tiposCategorias to build list
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

    // Add any categories from gastos not in tiposCategorias
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

    // Sort by presupuestado descending
    categoriasResult.sort((a, b) => b.presupuestado - a.presupuestado)

    setCategorias(categoriasResult)
    setTotalPresupuestado(sumPresupuestado)
    setTotalGastado(sumGastado)
    setLoading(false)
  }

  const diferencia = totalPresupuestado - totalGastado
  const porcentajeGeneral = totalPresupuestado > 0 ? (totalGastado / totalPresupuestado) * 100 : 0

  // Find best and worst categories
  const categoriasConPresupuesto = categorias.filter((c) => c.presupuestado > 0)
  const mejorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((best, c) => c.porcentaje < best.porcentaje ? c : best, categoriasConPresupuesto[0])
    : null
  const peorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((worst, c) => c.porcentaje > worst.porcentaje ? c : worst, categoriasConPresupuesto[0])
    : null

  const getStatusColor = (porcentaje: number) => {
    if (porcentaje <= 60) return { ring: "#22c55e", bg: "bg-green-50 border-green-200", text: "text-green-600", label: "Controlado" }
    if (porcentaje <= 80) return { ring: "#22c55e", bg: "bg-green-50 border-green-200", text: "text-green-600", label: "Bien" }
    if (porcentaje <= 100) return { ring: "#eab308", bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-600", label: "Atento" }
    return { ring: "#ef4444", bg: "bg-red-50 border-red-200", text: "text-red-600", label: "Excedido" }
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
          {/* 3 Summary Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {/* Presupuesto Total */}
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">Presupuesto Total</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-700">{formatGuaranies(totalPresupuestado)}</p>
                <p className="text-xs text-muted-foreground mt-1">Planificado para el mes</p>
              </CardContent>
            </Card>

            {/* Gasto Real */}
            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Gasto Real</span>
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-red-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-red-700">{formatGuaranies(totalGastado)}</p>
                <p className="text-xs text-muted-foreground mt-1">{porcentajeGeneral.toFixed(1)}% del presupuesto</p>
              </CardContent>
            </Card>

            {/* Diferencia */}
            <Card className={`border-2 ${diferencia >= 0 ? "border-green-200 bg-gradient-to-br from-green-50/50 to-emerald-50/50" : "border-red-200 bg-gradient-to-br from-red-50/50 to-orange-50/50"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${diferencia >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {diferencia >= 0 ? "Disponible" : "Excedido"}
                  </span>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${diferencia >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                    {diferencia >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                  </div>
                </div>
                <p className={`text-2xl font-bold ${diferencia >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatGuaranies(Math.abs(diferencia))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {diferencia >= 0 ? "Todavia puedes gastar" : "Por encima del presupuesto"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Cards with Donut rings */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {categorias.map((cat) => {
              const status = getStatusColor(cat.porcentaje)
              const usedPct = Math.min(cat.porcentaje, 100)
              const remainPct = 100 - usedPct
              const isExceeded = cat.porcentaje > 100

              const donutData = [
                { name: "Usado", value: usedPct },
                { name: "Restante", value: remainPct },
              ]

              return (
                <Card key={cat.nombre} className={`border-2 ${status.bg} transition-all hover:shadow-md`}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start gap-4">
                      {/* Donut Chart */}
                      <div className="relative w-20 h-20 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={26}
                              outerRadius={36}
                              startAngle={90}
                              endAngle={-270}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              <Cell fill={status.ring} />
                              <Cell fill="#e5e7eb" />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-bold ${status.text}`}>
                            {cat.porcentaje > 999 ? "+999" : cat.porcentaje.toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-foreground truncate">{cat.nombre}</h3>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isExceeded
                              ? "bg-red-100 text-red-700"
                              : cat.porcentaje <= 80
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Presup.</span>
                            <span className="font-semibold text-foreground">{formatGuaranies(cat.presupuestado)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Gastado</span>
                            <span className={`font-semibold ${isExceeded ? "text-red-600" : "text-foreground"}`}>{formatGuaranies(cat.gastado)}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-current/10">
                            <span className="text-muted-foreground">{cat.diferencia >= 0 ? "Disponible" : "Excedido"}</span>
                            <span className={`font-bold ${cat.diferencia >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                            </span>
                          </div>
                        </div>

                        {/* Mini progress bar */}
                        <div className="mt-2 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.min(cat.porcentaje, 100)}%`,
                              backgroundColor: status.ring,
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
          <Card className="border">
            <CardContent className="pt-5 pb-3">
              <h3 className="text-sm font-bold text-foreground mb-3">Resumen por Categoria</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Categoria</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Presupuestado</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Gastado</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Diferencia</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">% Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((cat) => {
                      const status = getStatusColor(cat.porcentaje)
                      return (
                        <tr key={cat.nombre} className="border-b border-border/50 last:border-0">
                          <td className="py-2.5 px-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.ring }} />
                              <span className="font-medium text-foreground">{cat.nombre}</span>
                            </div>
                          </td>
                          <td className="text-right py-2.5 px-2 text-foreground font-medium">{formatGuaranies(cat.presupuestado)}</td>
                          <td className="text-right py-2.5 px-2 text-foreground font-medium">{formatGuaranies(cat.gastado)}</td>
                          <td className={`text-right py-2.5 px-2 font-bold ${cat.diferencia >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {cat.diferencia >= 0 ? "+" : ""}{formatGuaranies(cat.diferencia)}
                          </td>
                          <td className={`text-right py-2.5 px-2 font-bold ${status.text}`}>
                            {cat.porcentaje.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    <tr className="border-t-2 border-foreground/20 bg-muted/30">
                      <td className="py-2.5 px-2 font-bold text-foreground">TOTAL</td>
                      <td className="text-right py-2.5 px-2 font-bold text-foreground">{formatGuaranies(totalPresupuestado)}</td>
                      <td className="text-right py-2.5 px-2 font-bold text-foreground">{formatGuaranies(totalGastado)}</td>
                      <td className={`text-right py-2.5 px-2 font-bold ${diferencia >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {diferencia >= 0 ? "+" : ""}{formatGuaranies(diferencia)}
                      </td>
                      <td className={`text-right py-2.5 px-2 font-bold ${getStatusColor(porcentajeGeneral).text}`}>
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
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50/30 to-indigo-50/30">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">Insight del Mes</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Tu categoria mas controlada es <span className="font-bold text-green-600">{mejorCategoria.nombre}</span> ({mejorCategoria.porcentaje.toFixed(1)}% usado).
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
