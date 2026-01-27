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

  // Obtener perfil activo del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("perfil_activo_id")
    .eq("id", user.id)
    .single()

  if (!profile?.perfil_activo_id) {
    redirect("/dashboard/perfiles")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <AnalisisFinancieroClient perfilId={profile.perfil_activo_id} />
    </div>
  )
}
