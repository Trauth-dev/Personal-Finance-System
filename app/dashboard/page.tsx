import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Determinar el nivel de plan del usuario
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .maybeSingle()

  // Usuarios de plan basico (y nuevos sin perfil aun) inician en Carga de Datos.
  // Solo los usuarios con plan 'completo' inician en la Carga por Voz IA.
  if (profile?.plan_tier === "completo") {
    redirect("/inicio")
  }

  redirect("/dashboard/carga")
}
