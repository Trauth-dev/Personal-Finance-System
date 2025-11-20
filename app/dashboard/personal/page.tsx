import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, Target, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertTriangle } from 'lucide-react'
import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { formatGuaranies } from "@/lib/utils"
import { AlertasFinancieras } from "@/components/personal/alertas-financieras"
import { LogrosFinancieros } from "@/components/personal/logros-financieros"
import { TasaAhorroDonut } from "@/components/charts/tasa-ahorro-donut"
import { GastosCategoriaBars } from "@/components/charts/gastos-categoria-bars"
import { SuperavitCard } from "@/components/charts/superavit-card"
import { ReportesExpandibles } from "@/components/personal/reportes-expandibles"
import { PresupuestoCategoriasComparativo } from "@/components/charts/presupuesto-categoria-comparativo"

export const revalidate = 0

export default async function DashboardPersonalPage() {
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

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresos } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const balance = totalIngresos - totalEgresos

  const { data: presupuesto } = await supabase
    .from("presupuesto_mensual")
    .select("meta_salario")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .maybeSingle()

  const metaSalario = presupuesto?.meta_salario || 0
  const porcentajeCompletado = metaSalario > 0 ? (totalIngresos / Number(metaSalario)) * 100 : 0

  const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0]
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0]

  const { data: ingresosMesAnterior } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  const totalIngresosMesAnterior = ingresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const cambioIngresos =
    totalIngresosMesAnterior > 0 ? ((totalIngresos - totalIngresosMesAnterior) / totalIngresosMesAnterior) * 100 : 0

  const { data: egresosMesAnterior } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  const totalEgresosMesAnterior = egresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const cambioEgresos =
    totalEgresosMesAnterior > 0 ? ((totalEgresos - totalEgresosMesAnterior) / totalEgresosMesAnterior) * 100 : 0

  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0

  const diasTranscurridos = now.getDate()
  const promedioDiarioGastos = diasTranscurridos > 0 ? totalEgresos / diasTranscurridos : 0
  const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - diasTranscurridos
  const proyeccionGastosMes = totalEgresos + promedioDiarioGastos * diasRestantes

  const totalTransacciones = (ingresos?.length || 0) + (egresos?.length || 0)
  const promedioTransaccion = totalTransacciones > 0 ? (totalIngresos + totalEgresos) / totalTransacciones : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <DashboardHeader title="Dashboard Personal" description="Resumen de tus finanzas personales" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
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
                {balance >= 0 ? "Superávit" : "Déficit"} del mes
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
                {formatGuaranies(Number(metaSalario))}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {totalEgresos / Number(metaSalario) <= 1 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                )}
                <p className={`text-xs font-medium ${totalEgresos / Number(metaSalario) <= 1 ? "text-green-600" : "text-red-600"}`}>
                  {Number(metaSalario) > 0 ? ((totalEgresos / Number(metaSalario)) * 100).toFixed(1) : 0}% gastado
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <PresupuestoCategoriasComparativo perfilId={perfilPersonal.id} />

        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
          <SuperavitCard perfilId={perfilPersonal.id} />
          <TasaAhorroDonut perfilId={perfilPersonal.id} />
          <GastosCategoriaBars perfilId={perfilPersonal.id} />
        </div>

        <ReportesExpandibles perfilId={perfilPersonal.id} />

        <LogrosFinancieros />
      </div>

      <AlertasFinancieras />
    </div>
  )
}
