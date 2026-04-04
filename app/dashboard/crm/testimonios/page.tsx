import { DashboardHeader } from "@/components/dashboard-header"
import { TestimoniosManager } from "@/components/crm/testimonios-manager"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

export default async function TestimoniosCRMPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilCRM } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  if (!perfilCRM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
        <DashboardHeader 
          title="Testimonios" 
          description="Registra conformidad y logros de clientes" 
        />
        <div className="p-4 md:p-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <p className="text-amber-800">
                No se encontro un perfil CRM. Por favor, crea un perfil de tipo CRM primero.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <DashboardHeader 
        title="Testimonios" 
        description="Registra conformidad y logros de clientes" 
      />
      <div className="p-4 md:p-6">
        <TestimoniosManager perfilId={perfilCRM.id} />
      </div>
    </div>
  )
}
