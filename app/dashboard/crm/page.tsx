import { DashboardHeader } from "@/components/dashboard-header"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { UserPlus, CalendarClock, ShoppingCart, Clock, Kanban } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { CRMMetricsDashboard } from "@/components/crm/crm-metrics-dashboard"
import { CalendarioUnificadoCRM } from "@/components/crm/calendario-unificado-crm"

const ACCIONES = [
  { href: "/dashboard/crm/clientes", titulo: "Nuevo cliente", ayuda: "Anotá a una persona nueva", icono: UserPlus, color: "bg-primary" },
  { href: "/dashboard/crm/agendamientos", titulo: "Agendar cita", ayuda: "Reservá un día y hora", icono: CalendarClock, color: "bg-sky-400" },
  { href: "/dashboard/crm/seguimientos", titulo: "Seguimientos", ayuda: "A quién llamar o escribir", icono: Clock, color: "bg-amber-400" },
  { href: "/dashboard/crm/ventas", titulo: "Nueva venta", ayuda: "Registrá lo que vendiste", icono: ShoppingCart, color: "bg-emerald-400" },
  { href: "/dashboard/crm/pipeline", titulo: "Pipeline", ayuda: "Ver tus negocios en curso", icono: Kanban, color: "bg-slate-300" },
]

export default async function DashboardCRMPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener perfil CRM
  const { data: perfilCRM } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "crm")
    .single()

  if (!perfilCRM) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Dashboard CRM" description="Gestion de clientes y seguimiento de ventas" />
        <div className="p-6">
          <Card className="border-amber-400/40 bg-amber-400/10">
            <CardContent className="p-6">
              <p className="text-foreground">
                No se encontro un perfil CRM. Por favor, crea un perfil de tipo CRM para acceder a este dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Dashboard CRM" description="Tu agenda, tus clientes y tus ventas en un solo lugar" />

      <div className="flex flex-col gap-6 p-4 md:p-6">
        {/* Calendario Unificado CRM - Vista principal de la agenda */}
        <CalendarioUnificadoCRM perfilId={perfilCRM.id} />

        <section aria-labelledby="acciones-crm" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="acciones-crm" className="text-lg font-semibold text-foreground">¿Qué querés hacer?</h2>
            <p className="text-sm text-muted-foreground">Elegí una acción para empezar.</p>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {ACCIONES.map((a) => (
              <li key={a.href}>
                <Link
                  href={a.href}
                  className="group flex h-full items-center gap-3 rounded-lg border border-border bg-secondary/60 p-4 transition-colors hover:border-primary hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex-col lg:items-start"
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${a.color}`}>
                    <a.icono className="size-5 text-slate-950" aria-hidden="true" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{a.titulo}</span>
                    <span className="text-sm leading-snug text-muted-foreground">{a.ayuda}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Dashboard de Metricas Completo */}
        <CRMMetricsDashboard perfilId={perfilCRM.id} />
      </div>
    </div>
  )
}
