import { redirect } from "next/navigation"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { DashboardHeader } from "@/components/dashboard-header"
import { MetasObjetivosManager } from "@/components/personal/metas-objetivos-manager"

export default async function PersonalMetasPage() {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }
  
  // Obtener perfil personal del usuario
  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .maybeSingle()
  
  if (!perfilPersonal) {
    redirect("/dashboard")
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Metas y Objetivos</h1>
          <p className="text-muted-foreground">
            Establece metas, crea hábitos y da seguimiento a tu progreso personal
          </p>
        </div>
        
        <MetasObjetivosManager perfilId={perfilPersonal.id} />
      </main>
    </div>
  )
}
