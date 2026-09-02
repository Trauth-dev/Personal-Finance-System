import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ComprasManager } from "@/components/empresarial/compras-manager"

export default async function ComprasPage() {
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
        <h1 className="text-3xl font-bold">Compras</h1>
        <p className="text-muted-foreground">Registra tus compras a proveedores y controla tus costos</p>
      </div>

      <ComprasManager />
    </div>
  )
}
