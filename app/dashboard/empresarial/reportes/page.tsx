import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ReportesEmpresariales } from "@/components/empresarial/reportes-empresariales"

export default async function ReportesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <ReportesEmpresariales userId={user.id} />
}
