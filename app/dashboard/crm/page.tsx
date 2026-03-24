import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, CalendarClock, ShoppingCart, TrendingUp, Clock, CheckCircle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies } from "@/lib/utils"

export default async function DashboardCRMPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener perfil CRM
  const { data: perfilCRM } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  if (!perfilCRM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
        <DashboardHeader title="Dashboard CRM" description="Gestion de clientes y seguimiento de ventas" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <p className="text-amber-800">
                No se encontro un perfil CRM. Por favor, crea un perfil de tipo CRM para acceder a este dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Obtener estadisticas
  const { count: totalClientes } = await supabase
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const { count: seguimientosPendientes } = await supabase
    .from("crm_seguimientos")
    .select("*", { count: "exact", head: true })
    .eq("perfil_id", perfilCRM.id)
    .eq("completado", false)
    .lte("fecha_recordatorio", new Date().toISOString().split("T")[0])

  const { count: agendamientosHoy } = await supabase
    .from("crm_agendamientos")
    .select("*", { count: "exact", head: true })
    .eq("perfil_id", perfilCRM.id)
    .eq("estado", "programado")
    .gte("fecha_hora", new Date().toISOString().split("T")[0])
    .lt("fecha_hora", new Date(Date.now() + 86400000).toISOString().split("T")[0])

  // Ventas del mes
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: ventasMes } = await supabase
    .from("crm_ventas")
    .select("monto_total, estado")
    .eq("perfil_id", perfilCRM.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const ventasCerradas = ventasMes?.filter(v => v.estado === "completada") || []
  const totalVentasMes = ventasCerradas.reduce((sum, v) => sum + Number(v.monto_total), 0)
  const ventasPendientes = ventasMes?.filter(v => v.estado === "pendiente").length || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <DashboardHeader title="Dashboard CRM" description="Gestion de clientes y seguimiento de ventas" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Metricas principales */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-cyan-50 to-teal-50 border-2 border-cyan-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Total Clientes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-cyan-500 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-cyan-600">{totalClientes || 0}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Clientes registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Seguimientos Pendientes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-amber-600">{seguimientosPendientes || 0}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Requieren atencion</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Citas Hoy</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-md">
                <CalendarClock className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-purple-600">{agendamientosHoy || 0}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Agendadas para hoy</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Ventas del Mes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-green-600">{formatGuaranies(totalVentasMes)}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">{ventasCerradas.length} ventas cerradas</p>
            </CardContent>
          </Card>
        </div>

        {/* Segunda fila de metricas */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Ventas Pendientes</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <ShoppingCart className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">{ventasPendientes}</div>
              <p className="text-xs text-slate-600 mt-1">En proceso de cierre</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Tasa de Conversion</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-600">
                {ventasMes && ventasMes.length > 0 
                  ? ((ventasCerradas.length / ventasMes.length) * 100).toFixed(1) 
                  : 0}%
              </div>
              <p className="text-xs text-slate-600 mt-1">Este mes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Nuevos Clientes</CardTitle>
              <div className="w-8 h-8 rounded-lg bg-rose-500 flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-rose-600">0</div>
              <p className="text-xs text-slate-600 mt-1">Este mes</p>
            </CardContent>
          </Card>
        </div>

        {/* Accesos rapidos */}
        <Card className="border-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="/dashboard/crm/clientes" className="flex flex-col items-center p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 transition-colors border-2 border-cyan-200">
                <UserPlus className="w-8 h-8 text-cyan-600 mb-2" />
                <span className="text-sm font-medium text-cyan-800">Nuevo Cliente</span>
              </a>
              <a href="/dashboard/crm/agendamientos" className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors border-2 border-purple-200">
                <CalendarClock className="w-8 h-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-purple-800">Agendar Cita</span>
              </a>
              <a href="/dashboard/crm/ventas" className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 transition-colors border-2 border-green-200">
                <ShoppingCart className="w-8 h-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-green-800">Nueva Venta</span>
              </a>
              <a href="/dashboard/crm/seguimientos" className="flex flex-col items-center p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border-2 border-amber-200">
                <Clock className="w-8 h-8 text-amber-600 mb-2" />
                <span className="text-sm font-medium text-amber-800">Seguimientos</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
