import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { obtenerAdmin } from "@/lib/admin/auth"
import { getDatosAdmin } from "@/lib/admin/datos"
import { AdminPanel } from "@/components/admin/admin-panel"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Administración | Prospera+",
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const { usuario, autenticado } = await obtenerAdmin()
  if (!autenticado) redirect("/auth/login?next=/admin")
  if (!usuario) redirect("/dashboard")

  const datos = await getDatosAdmin()

  return (
    <main className="min-h-screen bg-background">
      <AdminPanel datos={datos} adminEmail={usuario.email} />
    </main>
  )
}
