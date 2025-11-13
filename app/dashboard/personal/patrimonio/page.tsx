import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PatrimonioManager } from "@/components/personal/patrimonio-manager"

export default async function PatrimonioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div>
      <DashboardHeader
        title="Patrimonio Neto"
        description="Gestiona tus activos y pasivos para conocer tu patrimonio neto"
      />
      <div className="p-6">
        <PatrimonioManager />
      </div>
    </div>
  )
}
