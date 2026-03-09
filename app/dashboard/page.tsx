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

  // Redirigir a la pagina de carga inteligente post-login
  // Esta pagina permite carga por voz y acceso rapido al dashboard
  redirect("/inicio")
}
