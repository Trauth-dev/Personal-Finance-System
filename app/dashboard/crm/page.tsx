import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, CalendarClock, ShoppingCart, Clock, Kanban } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CRMMetricsDashboard } from "@/components/crm/crm-metrics-dashboard"

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
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <DashboardHeader title="Dashboard CRM" description="Gestion de clientes y seguimiento de ventas" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-6">
              <p className="text-amber-800 dark:text-amber-200">
                No se encontro un perfil CRM. Por favor, crea un perfil de tipo CRM para acceder a este dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <DashboardHeader title="Dashboard CRM" description="Metricas y KPIs de tu gestion comercial" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Accesos rapidos */}
        <Card className="border-2 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <a 
                href="/dashboard/crm/pipeline" 
                className="flex flex-col items-center p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border-2 border-slate-200 dark:border-slate-600"
              >
                <Kanban className="w-7 h-7 text-slate-600 dark:text-slate-300 mb-2" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 text-center">Pipeline</span>
              </a>
              <a 
                href="/dashboard/crm/clientes" 
                className="flex flex-col items-center p-4 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/30 dark:hover:bg-cyan-900/50 transition-colors border-2 border-cyan-200 dark:border-cyan-700"
              >
                <UserPlus className="w-7 h-7 text-cyan-600 dark:text-cyan-400 mb-2" />
                <span className="text-xs font-medium text-cyan-800 dark:text-cyan-200 text-center">Nuevo Cliente</span>
              </a>
              <a 
                href="/dashboard/crm/agendamientos" 
                className="flex flex-col items-center p-4 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 transition-colors border-2 border-purple-200 dark:border-purple-700"
              >
                <CalendarClock className="w-7 h-7 text-purple-600 dark:text-purple-400 mb-2" />
                <span className="text-xs font-medium text-purple-800 dark:text-purple-200 text-center">Agendar Cita</span>
              </a>
              <a 
                href="/dashboard/crm/ventas" 
                className="flex flex-col items-center p-4 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 transition-colors border-2 border-green-200 dark:border-green-700"
              >
                <ShoppingCart className="w-7 h-7 text-green-600 dark:text-green-400 mb-2" />
                <span className="text-xs font-medium text-green-800 dark:text-green-200 text-center">Nueva Venta</span>
              </a>
              <a 
                href="/dashboard/crm/seguimientos" 
                className="flex flex-col items-center p-4 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 transition-colors border-2 border-amber-200 dark:border-amber-700"
              >
                <Clock className="w-7 h-7 text-amber-600 dark:text-amber-400 mb-2" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-200 text-center">Seguimientos</span>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard de Metricas Completo */}
        <CRMMetricsDashboard perfilId={perfilCRM.id} />
      </div>
    </div>
  )
}
