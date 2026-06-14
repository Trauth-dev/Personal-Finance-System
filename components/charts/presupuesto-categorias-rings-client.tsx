"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, TrendingUp, ShoppingCart, Car, Stethoscope, User } from 'lucide-react'
import { formatGuaranies } from "@/lib/utils"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"

interface Categoria {
  nombre: string
  porcentaje: number
  monto: number
  gastado: number
}

interface PresupuestoCategoriasRingsClientProps {
  categorias: Categoria[]
  presupuestoTotal: number
}

const ICONOS_MAP: Record<string, any> = {
  'Donacion': Heart,
  'Donación': Heart,
  'Ahorro': PiggyBank,
  'Ahorro 2025': PiggyBank,
  'Gastos Varios': ShoppingBag,
  'Gastos Vivienda': Home,
  'Gastos Personales': User,
  'Supermercado': ShoppingCart,
  'Salud': Stethoscope,
  'Transportes': Car,
  'Pago Deudas': CreditCard,
  'Disfrute': Smile,
  'Educacion': GraduationCap,
  'Educación': GraduationCap,
  'Libertad Financiera': TrendingUp,
}

const COLORES_BASE: Record<string, string> = {
  'Donacion': '#10b981',
  'Donación': '#10b981',
  'Ahorro': '#3b82f6',
  'Ahorro 2025': '#3b82f6',
  'Gastos Varios': '#a855f7',
  'Gastos Vivienda': '#ef4444',
  'Gastos Personales': '#8b5cf6',
  'Supermercado': '#84cc16',
  'Salud': '#f43f5e',
  'Transportes': '#0ea5e9',
  'Pago Deudas': '#f97316',
  'Disfrute': '#ec4899',
  'Educacion': '#06b6d4',
  'Educación': '#06b6d4',
  'Libertad Financiera': '#10b981',
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
            // Usar monto exacto directamente, no calcular con porcentaje
            const presupuestoAsignado = categoria.monto
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

            const Icon = ICONOS_MAP[categoria.nombre] || ShoppingBag
            const colorBase = COLORES_BASE[categoria.nombre] || '#6b7280'

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
                  <p className="text-xs font-semibold text-slate-800">{getNombreCategoriaDisplay(categoria.nombre)}</p>
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
