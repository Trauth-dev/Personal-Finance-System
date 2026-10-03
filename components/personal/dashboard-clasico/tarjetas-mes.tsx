import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { AlertTriangle, CheckCircle2, Target, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { Variacion } from "./variacion"

interface TarjetaProps {
  titulo: string
  icono: LucideIcon
  fondo: string
  iconoFondo: string
  children: React.ReactNode
}

function Tarjeta({ titulo, icono: Icono, fondo, iconoFondo, children }: TarjetaProps) {
  return (
    <Card className={`border-2 bg-gradient-to-br ${fondo}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">{titulo}</CardTitle>
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-md ${iconoFondo}`}>
            <Icono className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

const SinDato = () => <p className="text-sm font-medium text-slate-500">No pudimos cargar este dato</p>

export function TarjetasMes({ data }: { data: PersonalDashboardData }) {
  const { movimientos, presupuesto, moneda } = data
  const m = movimientos.ok ? movimientos.data : null
  const p = presupuesto.ok ? presupuesto.data : null
  const consumo = p?.configurado && p.total > 0 ? p.utilizado / p.total : null

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-4">
      <Tarjeta titulo="Ingresos del Mes" icono={TrendingUp} fondo="from-green-50 to-emerald-50 border-green-200" iconoFondo="bg-green-500">
        {m ? (
          <>
            <div className="text-xl font-bold text-green-600 md:text-2xl">{formatMoney(m.resumen.ingresos, moneda)}</div>
            <Variacion valor={m.variacionIngresos} parcial={m.comparacionParcial} />
          </>
        ) : (
          <SinDato />
        )}
      </Tarjeta>

      <Tarjeta titulo="Egresos del Mes" icono={TrendingDown} fondo="from-red-50 to-rose-50 border-red-200" iconoFondo="bg-red-500">
        {m ? (
          <>
            <div className="text-xl font-bold text-red-600 md:text-2xl">{formatMoney(m.resumen.gastos, moneda)}</div>
            <Variacion valor={m.variacionGastos} parcial={m.comparacionParcial} subirEsBueno={false} />
          </>
        ) : (
          <SinDato />
        )}
      </Tarjeta>

      <Tarjeta titulo="Saldo del Mes" icono={Wallet} fondo="from-blue-50 to-cyan-50 border-blue-200" iconoFondo="bg-blue-500">
        {m ? (
          <>
            <div className={`text-xl font-bold md:text-2xl ${m.resumen.resultado >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatMoney(m.resumen.resultado, moneda)}
            </div>
            <p className="mt-1 text-xs font-medium text-slate-600">
              {m.resumen.cantidadIngresos + m.resumen.cantidadGastos === 0
                ? "Sin movimientos en el mes"
                : `${m.resumen.resultado >= 0 ? "Superávit" : "Déficit"} del mes`}
            </p>
          </>
        ) : (
          <SinDato />
        )}
      </Tarjeta>

      <Tarjeta titulo="Presupuesto vs Gasto" icono={Target} fondo="from-purple-50 to-violet-50 border-purple-200" iconoFondo="bg-purple-500">
        {!p ? (
          <SinDato />
        ) : (
          <>
            <div className="text-xl font-bold text-purple-600 md:text-2xl">
              {p.configurado ? formatMoney(p.total, moneda) : "No definido"}
            </div>
            <div className="mt-1 flex items-center gap-1">
              {consumo !== null ? (
                <>
                  {consumo <= 1 ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-red-600" aria-hidden="true" />
                  )}
                  <p className={`text-xs font-medium ${consumo <= 1 ? "text-green-600" : "text-red-600"}`}>
                    {(consumo * 100).toFixed(1)}% gastado
                  </p>
                </>
              ) : (
                <Link href="/dashboard/personal/presupuesto" className="text-xs font-medium text-amber-600 hover:underline">
                  Define tu presupuesto mensual
                </Link>
              )}
            </div>
          </>
        )}
      </Tarjeta>
    </div>
  )
}
