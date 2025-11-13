import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PresupuestoManager } from "@/components/personal/presupuesto-manager"

export default async function PresupuestoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div>
      <DashboardHeader title="Presupuesto Mensual" description="Planifica y controla tus gastos e ingresos mensuales" />
      <div className="p-6">
        <PresupuestoManager />
      </div>
    </div>
  )
}
