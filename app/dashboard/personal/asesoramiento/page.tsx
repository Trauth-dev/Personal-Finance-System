import { Suspense } from "react"
import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AsesoramientoClient } from "@/components/asesoramiento/asesoramiento-client"

export default async function AsesoramientoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader title="Asesoramiento" description="Agendá sesiones con profesionales" />
      <Suspense fallback={<div className="container mx-auto px-4 py-6 text-slate-400">Cargando…</div>}>
        <AsesoramientoClient />
      </Suspense>
    </div>
  )
}
