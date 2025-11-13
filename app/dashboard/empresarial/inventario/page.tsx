import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InventarioManager } from "@/components/empresarial/inventario-manager"

export default async function InventarioPage() {
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
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-muted-foreground">Gestiona tus productos y stock</p>
      </div>

      <InventarioManager />
    </div>
  )
}
