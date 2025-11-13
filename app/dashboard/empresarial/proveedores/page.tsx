import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProveedoresManager } from "@/components/empresarial/proveedores-manager"

export default async function ProveedoresPage() {
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
        <h1 className="text-3xl font-bold">Proveedores</h1>
        <p className="text-muted-foreground">Gestiona tus proveedores y contactos</p>
      </div>

      <ProveedoresManager />
    </div>
  )
}
