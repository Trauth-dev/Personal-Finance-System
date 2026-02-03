import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardHeader } from "@/components/dashboard-header"
import { HabitosRecurrentesManager } from "@/components/personal/habitos-recurrentes-manager"

export default async function HabitosRecurrentesPage() {
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
      <DashboardHeader title="Hábitos Recurrentes" description="Gestiona tus hábitos diarios, semanales y mensuales" />
      <HabitosRecurrentesManager />
    </div>
  )
}
