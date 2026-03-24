import { DashboardHeader } from "@/components/dashboard-header"
import { HistorialCRMManager } from "@/components/crm/historial-crm-manager"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function HistorialCRMPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilCRM } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <DashboardHeader 
        title="Historial CRM" 
        description="Registro completo de actividades con clientes" 
      />
      <div className="p-4 md:p-6">
        <HistorialCRMManager 
          userId={user.id} 
          perfilId={perfilCRM?.id || null} 
        />
      </div>
    </div>
  )
}
