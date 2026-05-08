import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { PlanBolaNieve } from "@/components/personal/plan-bola-nieve"

export const revalidate = 0

export default async function PlanAntiDeudasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id, tipo, nombre")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    redirect("/dashboard/personal")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <DashboardHeader
        title="Plan Anti-Deudas"
        description="Sistema Bola de Nieve - Tu camino hacia la libertad financiera"
      />

      <div className="p-4 md:p-6">
        <PlanBolaNieve userId={user.id} perfilId={perfilPersonal.id} />
      </div>
    </div>
  )
}
