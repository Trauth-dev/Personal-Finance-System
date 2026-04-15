import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import CobranzasManager from "@/components/crm/cobranzas-manager"

export default async function CobranzasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener perfil CRM del usuario
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  if (!perfil) {
    redirect("/dashboard")
  }

  // Obtener perfil empresarial para registrar ingresos
  const { data: perfilEmpresarial } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "empresarial")
    .single()

  return (
    <div className="flex flex-col gap-6 p-6">
      <CobranzasManager 
        perfilId={perfil.id} 
        perfilEmpresarialId={perfilEmpresarial?.id || null}
        userId={user.id}
      />
    </div>
  )
}
