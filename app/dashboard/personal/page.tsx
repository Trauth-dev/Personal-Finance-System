import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  PiggyBank,
  Landmark,
  Banknote,
  CreditCard,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import { AlertasFinancieras } from "@/components/personal/alertas-financieras"
import { LogrosFinancieros } from "@/components/personal/logros-financieros"
import { TasaAhorroDonut } from "@/components/charts/tasa-ahorro-donut"
import { GastosCategoriaBars } from "@/components/charts/gastos-categoria-bars"
import { SuperavitCard } from "@/components/charts/superavit-card"
import { ReportesExpandibles } from "@/components/personal/reportes-expandibles"
import { PresupuestoCategoriasComparativo } from "@/components/charts/presupuesto-categoria-comparativo"
import { DashboardPersonalClient } from "./page-client"

export const revalidate = 0

export default async function DashboardPersonalPage({
  searchParams,
}: {
  searchParams: { month?: string; caja?: string }
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <DashboardHeader title="Dashboard Personal" description="Resumen de tus finanzas personales" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <p className="text-amber-800">
                Por favor, ejecuta los scripts de migración para activar el sistema de perfiles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Cargar cajas de ahorro activas
  const { data: cajasData } = await supabase
    .from("cajas_ahorro")
    .select("id, nombre, tipo, banco, monto_actual, color, icono")
    .eq("perfil_id", perfilPersonal.id)
    .eq("activa", true)
    .order("nombre")

  const cajas = cajasData || []
  const cajaSeleccionada = searchParams.caja || null

  // Validar que la caja seleccionada exista
  const cajaValida = cajaSeleccionada && cajas.some((c) => c.id === cajaSeleccionada) ? cajaSeleccionada : null

  const now = getParaguayDate()
  let selectedYear = now.getFullYear()
  let selectedMonth = now.getMonth()

  if (searchParams.month) {
    const [year, month] = searchParams.month.split("-").map(Number)
    selectedYear = year
    selectedMonth = month - 1
  }

  const primerDiaMes = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0]

  const currentMonthValue = `${selectedYear}-${(selectedMonth + 1).toString().padStart(2, "0")}`

  // --- Queries con filtro por caja ---
  let ingresosQuery = supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaValida) {
    ingresosQuery = ingresosQuery.eq("destino_caja_id", cajaValida)
  }

  const { data: ingresos } = await ingresosQuery
  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  let egresosQuery = supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaValida) {
    egresosQuery = egresosQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaValida)
  }

  const { data: egresos } = await egresosQuery
  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const balance = totalIngresos - totalEgresos

  const { data: presupuestos } = await supabase
    .from("presupuesto_mensual")
    .select("meta_salario")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("fecha", { ascending: false })
    .limit(1)

  const presupuesto = presupuestos?.[0] || null
  const metaSalario = presupuesto?.meta_salario || 0

  // --- Mes anterior con filtro por caja ---
  const primerDiaMesAnterior = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0]
  const ultimoDiaMesAnterior = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0]

  let ingresosAntQuery = supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  if (cajaValida) {
    ingresosAntQuery = ingresosAntQuery.eq("destino_caja_id", cajaValida)
  }

  const { data: ingresosMesAnterior } = await ingresosAntQuery
  const totalIngresosMesAnterior = ingresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const cambioIngresos =
    totalIngresosMesAnterior > 0 ? ((totalIngresos - totalIngresosMesAnterior) / totalIngresosMesAnterior) * 100 : 0

  let egresosAntQuery = supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  if (cajaValida) {
    egresosAntQuery = egresosAntQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaValida)
  }

  const { data: egresosMesAnterior } = await egresosAntQuery
  const totalEgresosMesAnterior = egresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const cambioEgresos =
    totalEgresosMesAnterior > 0 ? ((totalEgresos - totalEgresosMesAnterior) / totalEgresosMesAnterior) * 100 : 0

  // --- Total Historico (Todos los ingresos - Todos los egresos) ---
  const { data: ingresosHistoricos } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)

  const totalIngresosHistoricos = ingresosHistoricos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresosHistoricos } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)

  const totalEgresosHistoricos = egresosHistoricos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const patrimonioTotal = totalIngresosHistoricos - totalEgresosHistoricos

  // Total en cajas de ahorro
  const totalEnCajas = cajas.reduce((sum, c) => sum + Number(c.monto_actual), 0)

  // Nombre de la caja seleccionada
  const cajaNombre = cajaValida ? cajas.find((c) => c.id === cajaValida)?.nombre : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <DashboardHeader title="Dashboard Personal" description="Resumen de tus finanzas personales" />

      <DashboardPersonalClient initialMonth={currentMonthValue} cajas={cajas}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Indicador de filtro activo */}
          {cajaNombre && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <PiggyBank className="w-4 h-4 text-cyan-500" />
              <p className="text-sm text-cyan-400 font-medium">
                Mostrando datos filtrados por: <span className="font-bold">{cajaNombre}</span>
              </p>
            </div>
          )}

          {/* Patrimonio Total - Resumen Acumulado */}
          <Card className="border-2 border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
            <CardContent className="p-4 md:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Total Historico Ingresos */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Total Ingresos Acumulados</p>
                    <p className="text-lg font-bold text-green-400">{formatGuaranies(totalIngresosHistoricos)}</p>
                  </div>
                </div>

                {/* Total Historico Egresos */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Total Egresos Acumulados</p>
                    <p className="text-lg font-bold text-red-400">{formatGuaranies(totalEgresosHistoricos)}</p>
                  </div>
                </div>

                {/* Patrimonio Neto */}
                <div className="flex items-center gap-3 sm:justify-end">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Landmark className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Patrimonio Neto Total</p>
                    <p className={`text-xl font-bold ${patrimonioTotal >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                      {formatGuaranies(patrimonioTotal)}
                    </p>
                    {totalEnCajas > 0 && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        En cajas de ahorro: {formatGuaranies(totalEnCajas)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700">Ingresos del Mes</CardTitle>
                  <div className="w-9 h-9 rounded-lg bg-green-500 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-green-600">{formatGuaranies(totalIngresos)}</div>
                <div className="flex items-center gap-1 mt-1">
                  {cambioIngresos >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-600" />
                  )}
                  <p className={`text-xs font-medium ${cambioIngresos >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {Math.abs(cambioIngresos).toFixed(1)}% vs mes anterior
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700">Egresos del Mes</CardTitle>
                  <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center shadow-md">
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-red-600">{formatGuaranies(totalEgresos)}</div>
                <div className="flex items-center gap-1 mt-1">
                  {cambioEgresos >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-red-600" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-green-600" />
                  )}
                  <p className={`text-xs font-medium ${cambioEgresos >= 0 ? "text-red-600" : "text-green-600"}`}>
                    {Math.abs(cambioEgresos).toFixed(1)}% vs mes anterior
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700">Balance Actual</CardTitle>
                  <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-xl md:text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatGuaranies(balance)}
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  {balance >= 0 ? "Superavit" : "Deficit"} del mes
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-700">Presupuesto vs Gasto</CardTitle>
                  <div className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center shadow-md">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl md:text-2xl font-bold text-purple-600">
                  {metaSalario > 0 ? formatGuaranies(Number(metaSalario)) : "No definido"}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {metaSalario > 0 ? (
                    <>
                      {totalEgresos / Number(metaSalario) <= 1 ? (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                      )}
                      <p
                        className={`text-xs font-medium ${totalEgresos / Number(metaSalario) <= 1 ? "text-green-600" : "text-red-600"}`}
                      >
                        {((totalEgresos / Number(metaSalario)) * 100).toFixed(1)}% gastado
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-medium text-amber-600">Define tu presupuesto mensual</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <PresupuestoCategoriasComparativo
            perfilId={perfilPersonal.id}
            fechaInicio={primerDiaMes}
            fechaFin={ultimoDiaMes}
            cajaId={cajaValida || undefined}
          />

          <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
            <SuperavitCard perfilId={perfilPersonal.id} fechaInicio={primerDiaMes} fechaFin={ultimoDiaMes} cajaId={cajaValida || undefined} />
            <TasaAhorroDonut perfilId={perfilPersonal.id} fechaInicio={primerDiaMes} fechaFin={ultimoDiaMes} cajaId={cajaValida || undefined} />
            <GastosCategoriaBars perfilId={perfilPersonal.id} fechaInicio={primerDiaMes} fechaFin={ultimoDiaMes} cajaId={cajaValida || undefined} />
          </div>

          <ReportesExpandibles perfilId={perfilPersonal.id} fechaInicio={primerDiaMes} fechaFin={ultimoDiaMes} cajaId={cajaValida || undefined} />

          <LogrosFinancieros />
        </div>
      </DashboardPersonalClient>

      <AlertasFinancieras />
    </div>
  )
}
