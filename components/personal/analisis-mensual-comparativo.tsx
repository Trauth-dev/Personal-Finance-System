"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { TrendingUp, TrendingDown, DollarSign, Target, AlertCircle } from "lucide-react"

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

      {/* Gráfico de Barras Comparativo por Categoría */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800">Gastos por Categoría - Comparativo</CardTitle>
          <CardDescription>Comparación del mes actual vs mes anterior</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="categoria" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fill: '#475569', fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
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
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
              />
              <Bar dataKey="Mes Anterior" fill="#94a3b8" radius={[8, 8, 0, 0]} />
              <Bar dataKey="Mes Actual" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

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
