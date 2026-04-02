import { DashboardHeader } from "@/components/dashboard-header"
import { PipelineKanban } from "@/components/crm/pipeline-kanban"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function PipelineCRMPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get CRM profile
  const { data: perfilCRM } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  if (!perfilCRM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <DashboardHeader 
          title="Pipeline de Ventas" 
          description="Visualiza y gestiona tus oportunidades de venta" 
        />
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">No se encontro perfil CRM</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <DashboardHeader 
        title="Pipeline de Ventas" 
        description="Visualiza y gestiona tus oportunidades de venta" 
      />
      <div className="p-4 md:p-6">
        <PipelineKanban perfilId={perfilCRM.id} />
      </div>
    </div>
  )
}
