import { DashboardHeader } from "@/components/dashboard-header"
import { AgendamientosManager } from "@/components/crm/agendamientos-manager"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AgendamientosCRMPage() {
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
        title="Agendamientos" 
        description="Programa citas y reuniones con clientes" 
      />
      <div className="p-4 md:p-6">
        <AgendamientosManager 
          userId={user.id} 
          perfilId={perfilCRM?.id || null} 
        />
      </div>
    </div>
  )
}
