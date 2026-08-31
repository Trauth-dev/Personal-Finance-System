import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CuentasManager } from "@/components/empresarial/cuentas-manager"

export default async function CuentasPage() {
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
        <h1 className="text-3xl font-bold">Cuentas por Cobrar y Pagar</h1>
        <p className="text-muted-foreground">Controlá tus ventas a crédito y tus deudas con proveedores</p>
      </div>

      <CuentasManager />
    </div>
  )
}
