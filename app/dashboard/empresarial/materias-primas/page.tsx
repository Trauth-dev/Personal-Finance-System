import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MateriasPrimasManager } from "@/components/empresarial/materias-primas-manager"

export default async function MateriasPrimasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Materias Primas</h1>
        <p className="text-muted-foreground">Gestiona tu catálogo de materias primas</p>
      </div>

      <MateriasPrimasManager />
    </div>
  )
}
