import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AnalisisFinancieroClient } from "./page-client"

export default async function PersonalAnalysisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener perfil personal del usuario
  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    redirect("/dashboard/perfiles")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Presupuesto vs Realidad" description="Análisis detallado de tus finanzas" />
      <AnalisisFinancieroClient perfilId={perfilPersonal.id} />
    </div>
  )
}
