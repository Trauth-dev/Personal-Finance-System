"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, Area, AreaChart, PieChart, Pie } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle, Wallet, PiggyBank, CreditCard } from "lucide-react"

interface AnalisisData {
  mesActual: {
    mes: string
    ingresos: number
    egresos: number
    presupuesto: number
    ahorro: number
  }
  mesAnterior: {
    mes: string
    ingresos: number
    egresos: number
    presupuesto: number
    ahorro: number
  }
  categorias: Array<{
    nombre: string
    mesActual: number
    mesAnterior: number
    cambio: number
  }>
  evolucion?: Array<{
    mes: string
    ingresos: number
    egresos: number
    balance: number
  }>
}

interface Props {
  data: AnalisisData
}

export function AnalisisMensualComparativo({ data }: Props) {
  const { mesActual, mesAnterior, categorias } = data

  // Datos para el gráfico de barras comparativo
  const chartData = categorias.map((cat) => ({
    categoria: cat.nombre,
    "Mes Anterior": cat.mesAnterior,
    "Mes Actual": cat.mesActual,
  }))

  // Calcular cambios porcentuales
  const cambioIngresos = mesAnterior.ingresos > 0 
    ? ((mesActual.ingresos - mesAnterior.ingresos) / mesAnterior.ingresos) * 100 
    : 0
  const cambioEgresos = mesAnterior.egresos > 0 
    ? ((mesActual.egresos - mesAnterior.egresos) / mesAnterior.egresos) * 100 
    : 0
  const cambioAhorro = mesAnterior.ahorro > 0 
    ? ((mesActual.ahorro - mesAnterior.ahorro) / mesAnterior.ahorro) * 100 
    : 0

  // Salud financiera
  const tasaAhorro = mesActual.ingresos > 0 ? (mesActual.ahorro / mesActual.ingresos) * 100 : 0
  const cumplimientoPresupuesto = mesActual.presupuesto > 0 ? (mesActual.egresos / mesActual.presupuesto) * 100 : 0
  
  // Métricas adicionales
  const capacidadAhorro = mesActual.ingresos - mesActual.egresos
  const promedioGastoDiario = mesActual.egresos / 30
  const eficienciaFinanciera = mesActual.presupuesto > 0 ? ((mesActual.presupuesto - mesActual.egresos) / mesActual.presupuesto) * 100 : 0

  const getSaludColor = (tasa: number) => {
    if (tasa >= 20) return "text-green-600"
    if (tasa >= 10) return "text-yellow-600"
    return "text-red-600"
  }

  const getSaludBg = (tasa: number) => {
    if (tasa >= 20) return "bg-green-50 border-green-200"
    if (tasa >= 10) return "bg-yellow-50 border-yellow-200"
    return "bg-red-50 border-red-200"
  }

  return (
    <div className="space-y-6">
      {/* Resumen Comparativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ingresos */}
        <Card className={`border-2 ${cambioIngresos >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Ingresos</span>
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">{formatGuaranies(mesActual.ingresos)}</p>
              <div className="flex items-center gap-2">
                {cambioIngresos >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${cambioIngresos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cambioIngresos >= 0 ? '+' : ''}{cambioIngresos.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-600">vs {formatGuaranies(mesAnterior.ingresos)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Egresos */}
        <Card className={`border-2 ${cambioEgresos <= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Egresos</span>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">{formatGuaranies(mesActual.egresos)}</p>
              <div className="flex items-center gap-2">
                {cambioEgresos <= 0 ? (
                  <TrendingDown className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${cambioEgresos <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cambioEgresos >= 0 ? '+' : ''}{cambioEgresos.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-600">vs {formatGuaranies(mesAnterior.egresos)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Ahorro */}
        <Card className={`border-2 ${cambioAhorro >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Ahorro</span>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-slate-900">{formatGuaranies(mesActual.ahorro)}</p>
              <div className="flex items-center gap-2">
                {cambioAhorro >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-semibold ${cambioAhorro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cambioAhorro >= 0 ? '+' : ''}{cambioAhorro.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-slate-600">vs {formatGuaranies(mesAnterior.ahorro)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Capacidad de Ahorro</span>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatGuaranies(capacidadAhorro)}</p>
            <p className="text-xs text-slate-600 mt-2">Disponible para ahorrar</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Gasto Diario Promedio</span>
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatGuaranies(promedioGastoDiario)}</p>
            <p className="text-xs text-slate-600 mt-2">Aprox. por día</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-teal-200 bg-teal-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Eficiencia Financiera</span>
              <PiggyBank className="w-5 h-5 text-teal-600" />
            </div>
            <p className={`text-2xl font-bold ${eficienciaFinanciera >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
              {eficienciaFinanciera.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {eficienciaFinanciera >= 0 ? 'Bajo presupuesto' : 'Sobre presupuesto'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores de Salud Financiera */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`border-2 ${getSaludBg(tasaAhorro)}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Tasa de Ahorro</h3>
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <p className={`text-3xl font-bold ${getSaludColor(tasaAhorro)}`}>
              {tasaAhorro.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {tasaAhorro >= 20 && "Excelente! Estás ahorrando muy bien"}
              {tasaAhorro >= 10 && tasaAhorro < 20 && "Bien, puedes mejorar un poco más"}
              {tasaAhorro < 10 && "Necesitas aumentar tus ahorros"}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${cumplimientoPresupuesto <= 100 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Cumplimiento Presupuesto</h3>
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <p className={`text-3xl font-bold ${cumplimientoPresupuesto <= 100 ? 'text-green-600' : 'text-red-600'}`}>
              {cumplimientoPresupuesto.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {cumplimientoPresupuesto <= 90 && "Excelente control de gastos"}
              {cumplimientoPresupuesto > 90 && cumplimientoPresupuesto <= 100 && "Bien, estás dentro del presupuesto"}
              {cumplimientoPresupuesto > 100 && "Cuidado! Estás excediendo tu presupuesto"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolución Financiera (últimos meses) */}
      {data.evolucion && data.evolucion.length > 0 && (
        <Card className="border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Evolución Financiera</CardTitle>
            <CardDescription>Tendencia de ingresos, egresos y balance neto en los últimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={data.evolucion} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fill: '#475569', fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis 
                  tickFormatter={(value) => {
                    const absValue = Math.abs(value)
                    if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                    if (absValue >= 1000) return `${(value / 1000).toFixed(0)}K`
                    return value.toString()
                  }}
                  tick={{ fill: '#475569', fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: number) => formatGuaranies(value)}
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorIngresos)" 
                  name="Ingresos"
                />
                <Area 
                  type="monotone" 
                  dataKey="egresos" 
                  stroke="#ef4444" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorEgresos)" 
                  name="Egresos"
                />
                <Area 
                  type="monotone" 
                  dataKey="balance" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorBalance)" 
                  name="Balance Neto"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráficos: Anillo + Barras Horizontales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico de Anillo - Distribución de Gastos */}
        {(() => {
          const DONUT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]
          const totalGastos = categorias.reduce((sum, cat) => sum + cat.mesActual, 0)
          const donutData = categorias
            .filter((cat) => cat.mesActual > 0)
            .map((cat) => ({
              name: cat.nombre,
              value: cat.mesActual,
              porcentaje: totalGastos > 0 ? ((cat.mesActual / totalGastos) * 100).toFixed(1) : "0",
            }))
            .sort((a, b) => b.value - a.value)

          return (
            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-slate-800">Distribucion de Gastos</CardTitle>
                <CardDescription>Proporcion por categoria - {mesActual.mes}</CardDescription>
              </CardHeader>
              <CardContent>
                {donutData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={donutData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {donutData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatGuaranies(value)}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '10px 14px',
                            color: '#f8fafc',
                          }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Leyenda personalizada */}
                    <div className="w-full space-y-2 mt-2">
                      {donutData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                            />
                            <span className="text-sm text-foreground">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">{item.porcentaje}%</span>
                            <span className="text-sm font-semibold text-foreground">{formatGuaranies(item.value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[280px]">
                    <p className="text-muted-foreground text-sm">Sin gastos registrados</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })()}

        {/* Gráfico de Barras Horizontales - Comparativo profesional */}
        <Card className="border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800">Comparativo por Categoria</CardTitle>
            <CardDescription>Mes actual vs mes anterior</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 70 + 60)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 40, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
                      return value.toString()
                    }}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="categoria"
                    width={110}
                    tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => formatGuaranies(value)}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      color: '#f8fafc',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '16px' }}
                    iconType="circle"
                    iconSize={10}
                  />
                  <Bar
                    dataKey="Mes Anterior"
                    fill="#475569"
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                  />
                  <Bar
                    dataKey="Mes Actual"
                    fill="#3b82f6"
                    radius={[0, 6, 6, 0]}
                    barSize={14}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px]">
                <p className="text-muted-foreground text-sm">Sin datos para comparar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Cambios por Categoría */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Análisis Detallado por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categorias.map((cat) => (
              <div key={cat.nombre} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{cat.nombre}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-slate-600">
                      Anterior: {formatGuaranies(cat.mesAnterior)}
                    </span>
                    <span className="text-sm text-slate-600">
                      Actual: {formatGuaranies(cat.mesActual)}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  cat.cambio <= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {cat.cambio <= 0 ? (
                    <TrendingDown className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-bold ${cat.cambio <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {cat.cambio >= 0 ? '+' : ''}{cat.cambio.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
