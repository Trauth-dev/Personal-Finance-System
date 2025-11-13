import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { VentasManager } from "@/components/empresarial/ventas-manager"

export default async function VentasPage() {
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
        <h1 className="text-3xl font-bold">Ventas</h1>
        <p className="text-muted-foreground">Registra y gestiona tus ventas</p>
      </div>

      <VentasManager />
    </div>
  )
}
