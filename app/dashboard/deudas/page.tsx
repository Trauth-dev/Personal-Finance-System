import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DeudasManager } from "@/components/personal/deudas-manager"

export const revalidate = 0

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
    .select("id, tipo, nombre")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    redirect("/dashboard/personal")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <DashboardHeader title="Gestión de Deudas" description="Administra tus préstamos y tarjetas de crédito" />

      <div className="p-4 md:p-6">
        <DeudasManager userId={user.id} perfilId={perfilPersonal.id} />
      </div>
    </div>
  )
}
