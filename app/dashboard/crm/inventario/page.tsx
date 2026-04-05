import { DashboardHeader } from "@/components/dashboard-header"
import { InventarioCRMManager } from "@/components/crm/inventario-crm-manager"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function InventarioCRMPage() {
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

  if (!perfilCRM) {
    redirect("/dashboard/perfiles")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <DashboardHeader 
        title="Inventario" 
        description="Control de stock y productos disponibles para venta" 
      />
      <div className="p-4 md:p-6">
        <InventarioCRMManager perfilId={perfilCRM.id} />
      </div>
    </div>
  )
}
