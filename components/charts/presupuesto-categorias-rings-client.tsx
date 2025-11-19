"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, Star, TrendingUp } from 'lucide-react'
import { formatGuaranies } from "@/lib/utils"

interface Categoria {
  nombre: string
  porcentaje: number
  gastado: number
}

interface PresupuestoCategoriasRingsClientProps {
  categorias: Categoria[]
  presupuestoTotal: number
}

const ICONOS_MAP: Record<string, any> = {
  'Donación': Heart,
  'Ahorro 2025': PiggyBank,
  'Gastos Varios': ShoppingBag,
  'Gastos Vivienda': Home,
  'Pago Deudas': CreditCard,
  'Disfrute': Smile,
  'Educación': GraduationCap,
  'Sueños': Star,
  'Libertad Financiera': TrendingUp,
}

const COLORES_BASE: Record<string, string> = {
  'Donación': '#ec4899',
  'Ahorro 2025': '#10b981',
  'Gastos Varios': '#3b82f6',
  'Gastos Vivienda': '#f97316',
  'Pago Deudas': '#ef4444',
  'Disfrute': '#eab308',
  'Educación': '#6366f1',
  'Sueños': '#a855f7',
  'Libertad Financiera': '#06b6d4',
}

export function PresupuestoCategoriasRingsClient({
  categorias,
  presupuestoTotal,
}: PresupuestoCategoriasRingsClientProps) {
  if (categorias.length === 0) {
    return null
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Presupuesto por Categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categorias.map((categoria) => {
            const presupuestoAsignado = (presupuestoTotal * categoria.porcentaje) / 100
            const porcentajeUsado = presupuestoAsignado > 0 ? (categoria.gastado / presupuestoAsignado) * 100 : 0
            
            // Determinar color según el uso
            let colorEstado: string
            if (porcentajeUsado >= 100) {
              colorEstado = '#ef4444' // Rojo - excedido
            } else if (porcentajeUsado >= 80) {
              colorEstado = '#eab308' // Amarillo - advertencia
            } else {
              colorEstado = '#10b981' // Verde - bien
            }

            const Icon = ICONOS_MAP[categoria.nombre]
            const colorBase = COLORES_BASE[categoria.nombre]

            // Datos para el gráfico donut
            const chartData = [
              { value: Math.min(porcentajeUsado, 100) },
              { value: Math.max(0, 100 - porcentajeUsado) },
            ]

            return (
              <div key={categoria.nombre} className="flex flex-col items-center space-y-2">
                <div className="relative w-20 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={28}
                        outerRadius={36}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        <Cell fill={colorEstado} />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center">
                      <Icon className="w-5 h-5" style={{ color: colorBase }} />
                      <span className="text-xs font-bold" style={{ color: colorEstado }}>
                        {porcentajeUsado.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-800">{categoria.nombre}</p>
                  <p className="text-xs text-slate-600">{formatGuaranies(categoria.gastado)}</p>
                  <p className="text-xs text-slate-500">de {formatGuaranies(presupuestoAsignado)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
