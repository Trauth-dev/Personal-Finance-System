import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DeudasManager } from "@/components/personal/deudas-manager"

export default async function DeudasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "Personal")
    .single()

  if (!perfilPersonal) {
    return <div>No se encontró perfil personal</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <DashboardHeader
        title="Gestión de Deudas"
        description="Controla y da seguimiento a tus deudas de forma efectiva"
      />

      <div className="p-4 md:p-6">
        <DeudasManager userId={user.id} perfilId={perfilPersonal.id} />
      </div>
    </div>
  )
}
