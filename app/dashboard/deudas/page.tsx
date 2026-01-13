import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { DeudasManager } from "@/components/personal/deudas-manager"
import { cookies } from "next/headers"

export default async function DeudasPage() {
  const cookieStore = await cookies()
  const perfilId = cookieStore.get("perfil_activo")?.value

  if (!perfilId) {
    redirect("/dashboard/personal")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Verificar que el perfil pertenece al usuario
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", perfilId)
    .eq("user_id", user.id)
    .single()

  if (!perfil) {
    redirect("/dashboard/personal")
  }

  return (
    <div>
      <DashboardHeader title="Gestión de Deudas" description="Administra tus préstamos y tarjetas de crédito" />

      <div className="p-6">
        <DeudasManager userId={user.id} perfilId={perfilId} />
      </div>
    </div>
  )
}
