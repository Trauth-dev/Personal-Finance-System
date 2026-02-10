import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp,
  Calendar,
  Brain,
  Shield,
  Leaf,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  DollarSign,
  PiggyBank,
  TrendingDown,
  Wallet,
  ArrowUpRight,
} from "lucide-react"
import { formatGuaranies } from "@/lib/utils"

export default async function MetasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener perfil personal
  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <DashboardHeader title="Metas y Plan de Acción" description="Sistema Financiero Adaptativo" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <p className="text-amber-800">Por favor, crea un perfil personal primero.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Obtener datos del mes actual
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // Obtener ingresos del mes
  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  // Obtener egresos del mes
  const { data: egresos } = await supabase
    .from("egresos")
    .select("monto, tipo_categoria(nombre, color)")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  // Obtener presupuesto del mes
  const { data: presupuesto } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilPersonal.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .maybeSingle()

  const metaSalario = presupuesto?.meta_salario || 0
  const balance = totalIngresos - totalEgresos
  const tasaAhorro = totalIngresos > 0 ? (balance / totalIngresos) * 100 : 0
  const cumplimientoPresupuesto = metaSalario > 0 ? (totalEgresos / metaSalario) * 100 : 0

  // Calcular días restantes del mes
  const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()

  // Proyección de fin de mes
  const diasTranscurridos = now.getDate()
  const promedioGastoDiario = diasTranscurridos > 0 ? totalEgresos / diasTranscurridos : 0
  const proyeccionFinMes = totalEgresos + promedioGastoDiario * diasRestantes

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <DashboardHeader title="Metas y Plan de Acción" description="Sistema Financiero Adaptativo con Análisis Inteligente" />

      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Resumen General */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Balance Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatGuaranies(balance)}
              </div>
              <p className="text-xs text-slate-600 mt-1">{balance >= 0 ? "Superávit" : "Déficit"} del mes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-blue-600" />
                Tasa de Ahorro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{tasaAhorro.toFixed(1)}%</div>
              <p className="text-xs text-slate-600 mt-1">
                {tasaAhorro >= 20 ? "Excelente progreso" : tasaAhorro >= 10 ? "Buen avance" : "Puedes mejorar"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                Proyección Fin de Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{formatGuaranies(proyeccionFinMes)}</div>
              <p className="text-xs text-slate-600 mt-1">Gasto proyectado total</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Días Restantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{diasRestantes}</div>
              <p className="text-xs text-slate-600 mt-1">días hasta fin de mes</p>
            </CardContent>
          </Card>
        </div>

        {/* Análisis Predictivo */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Análisis Predictivo</CardTitle>
                <CardDescription className="text-slate-600">
                  Proyecciones basadas en tus patrones de gasto
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Promedio Gasto Diario</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{formatGuaranies(promedioGastoDiario)}</p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-xs text-slate-600">Basado en {diasTranscurridos} días transcurridos</p>
              </div>

              <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Cumplimiento Presupuesto</p>
                    <p
                      className={`text-2xl font-bold mt-1 ${cumplimientoPresupuesto <= 100 ? "text-green-600" : "text-red-600"}`}
                    >
                      {cumplimientoPresupuesto.toFixed(1)}%
                    </p>
                  </div>
                  {cumplimientoPresupuesto <= 100 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <Progress value={Math.min(cumplimientoPresupuesto, 100)} className="h-2" />
              </div>
            </div>

            {proyeccionFinMes > metaSalario && metaSalario > 0 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Alerta de Presupuesto</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Si mantienes el ritmo actual, podrías exceder tu presupuesto en{" "}
                      <span className="font-bold">{formatGuaranies(proyeccionFinMes - metaSalario)}</span> para fin de
                      mes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asesoría Financiera Inteligente */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Asesoría Financiera Inteligente</CardTitle>
                <CardDescription className="text-slate-600">
                  Recomendaciones personalizadas según tu comportamiento
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasaAhorro < 10 && (
              <div className="bg-white/60 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <ArrowUpRight className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Aumenta tu tasa de ahorro</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Tu tasa de ahorro actual es del {tasaAhorro.toFixed(1)}%. Los expertos recomiendan ahorrar al
                      menos el 20% de tus ingresos. Intenta reducir gastos variables y aumentar tus ingresos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {cumplimientoPresupuesto > 80 && cumplimientoPresupuesto <= 100 && (
              <div className="bg-white/60 rounded-lg p-4 border border-blue-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">¡Excelente control del presupuesto!</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Estás usando el {cumplimientoPresupuesto.toFixed(1)}% de tu presupuesto. Mantén este ritmo para
                      terminar el mes dentro de tu objetivo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {balance > 0 && tasaAhorro >= 20 && (
              <div className="bg-white/60 rounded-lg p-4 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <PiggyBank className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800">Considera invertir tu ahorro</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Tu tasa de ahorro es excelente ({tasaAhorro.toFixed(1)}%). Considera invertir parte de tus ahorros
                      para generar rendimientos a largo plazo.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {diasRestantes <= 7 && promedioGastoDiario * diasRestantes > balance && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">Atención: Quedan pocos días</p>
                    <p className="text-sm text-amber-800 mt-1">
                      Quedan solo {diasRestantes} días del mes y tu balance actual ({formatGuaranies(balance)}) podría
                      no ser suficiente para mantener tu ritmo de gasto actual. Considera reducir gastos no esenciales.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Control y Reducción de Riesgos */}
        <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Control y Reducción de Riesgos</CardTitle>
                <CardDescription className="text-slate-600">Métricas de seguridad financiera</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/60 rounded-lg p-4 border border-red-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Fondo de Emergencia</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-slate-600">Recomendado (3 meses de gastos)</span>
                    <span className="text-sm font-bold text-slate-800">{formatGuaranies(totalEgresos * 3)}</span>
                  </div>
                  <Progress
                    value={balance > 0 ? Math.min((balance / (totalEgresos * 3)) * 100, 100) : 0}
                    className="h-2"
                  />
                  <p className="text-xs text-slate-600">
                    {balance >= totalEgresos * 3
                      ? "¡Excelente! Tu fondo de emergencia está completo."
                      : balance > 0
                        ? `Te faltan ${formatGuaranies(totalEgresos * 3 - balance)} para completar tu fondo.`
                        : "Comienza a construir tu fondo de emergencia ahorrando mensualmente."}
                  </p>
                </div>
              </div>

              <div className="bg-white/60 rounded-lg p-4 border border-red-200">
                <p className="text-sm font-semibold text-slate-700 mb-2">Ratio de Liquidez</p>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-red-600">
                    {totalEgresos > 0 ? (totalIngresos / totalEgresos).toFixed(2) : "0.00"}
                  </div>
                  <p className="text-xs text-slate-600">
                    {totalIngresos >= totalEgresos * 1.5
                      ? "Excelente capacidad de ahorro"
                      : totalIngresos > totalEgresos
                        ? "Buena situación financiera"
                        : "Necesitas aumentar ingresos o reducir gastos"}
                  </p>
                  <div className="text-xs text-slate-500 mt-2">Ratio ideal: ≥ 1.5 (50% más ingresos que gastos)</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crecimiento del Patrimonio */}
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Crecimiento del Patrimonio</CardTitle>
                <CardDescription className="text-slate-600">Estrategias para aumentar tu riqueza</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-white/60 rounded-lg p-4 border border-violet-200">
              <p className="font-semibold text-slate-800 mb-2">Capacidad de Ahorro Mensual</p>
              <div className="text-2xl font-bold text-violet-600 mb-1">{formatGuaranies(Math.max(0, balance))}</div>
              <p className="text-xs text-slate-600">
                {balance > 0
                  ? `Si ahorras este monto mensualmente, en un año tendrás ${formatGuaranies(balance * 12)}`
                  : "Intenta reducir gastos para empezar a ahorrar este mes"}
              </p>
            </div>

            <div className="bg-white/60 rounded-lg p-4 border border-violet-200">
              <p className="font-semibold text-slate-800 mb-2">Proyección de Ahorro Anual</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">A 1 año</span>
                  <span className="text-sm font-bold text-violet-600">
                    {formatGuaranies(Math.max(0, balance) * 12)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">A 3 años</span>
                  <span className="text-sm font-bold text-violet-600">
                    {formatGuaranies(Math.max(0, balance) * 36)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">A 5 años</span>
                  <span className="text-sm font-bold text-violet-600">
                    {formatGuaranies(Math.max(0, balance) * 60)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sostenibilidad Financiera */}
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Sostenibilidad Financiera</CardTitle>
                <CardDescription className="text-slate-600">Evaluación de tus hábitos saludables</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  {balance >= 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <p className="text-sm font-semibold text-slate-800">Balance Positivo</p>
                </div>
                <p className="text-xs text-slate-600">
                  {balance >= 0
                    ? "¡Excelente! Tus ingresos superan tus gastos."
                    : "Necesitas ajustar tus gastos o aumentar ingresos."}
                </p>
              </div>

              <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  {tasaAhorro >= 15 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <p className="text-sm font-semibold text-slate-800">Tasa de Ahorro Saludable</p>
                </div>
                <p className="text-xs text-slate-600">
                  {tasaAhorro >= 15
                    ? "¡Perfecto! Estás ahorrando adecuadamente."
                    : "Intenta ahorrar al menos el 15% de tus ingresos."}
                </p>
              </div>

              <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  {cumplimientoPresupuesto <= 100 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <p className="text-sm font-semibold text-slate-800">Cumplimiento de Presupuesto</p>
                </div>
                <p className="text-xs text-slate-600">
                  {cumplimientoPresupuesto <= 100
                    ? "¡Genial! Te mantienes dentro de tu presupuesto."
                    : "Has excedido tu presupuesto mensual."}
                </p>
              </div>

              <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  {metaSalario > 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  )}
                  <p className="text-sm font-semibold text-slate-800">Planificación Activa</p>
                </div>
                <p className="text-xs text-slate-600">
                  {metaSalario > 0
                    ? "Tienes un presupuesto definido."
                    : "Define un presupuesto mensual para mejor control."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
