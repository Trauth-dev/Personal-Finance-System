import { redirect } from "next/navigation"
import { PiggyBank } from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { getPersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { nombreMes } from "@/lib/dashboard/fechas"
import { Panel } from "@/components/personal/dashboard/indicador"
import { BannerPatrimonio } from "@/components/personal/dashboard-clasico/banner-patrimonio"
import { TarjetasMes } from "@/components/personal/dashboard-clasico/tarjetas-mes"
import { PresupuestoCategoriasClasico } from "@/components/personal/dashboard-clasico/presupuesto-categorias-clasico"
import {
  GastosCategoriaClasico,
  SuperavitClasico,
  TasaAhorroTarjeta,
} from "@/components/personal/dashboard-clasico/analisis-clasico"
import { ReportesClasico } from "@/components/personal/dashboard-clasico/reportes-clasico"
import { AlertasFlotantes } from "@/components/personal/dashboard-clasico/alertas-flotantes"
import { LogrosFinancieros } from "@/components/personal/logros-financieros"
import { DashboardPersonalClient } from "./page-client"

export const dynamic = "force-dynamic"

export default async function DashboardPersonalPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; caja?: string }>
}) {
  const { month, caja } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .maybeSingle()

  if (!perfilPersonal) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Dashboard Personal" description="Resumen de tus finanzas personales" />
        <div className="p-6">
          <Panel titulo="Perfil personal no encontrado">
            <p className="text-sm text-muted-foreground">
              No encontramos tu perfil personal. Volvé a seleccionar el perfil desde el inicio.
            </p>
          </Panel>
        </div>
      </div>
    )
  }

  const data = await getPersonalDashboardData({
    supabase,
    userId: user.id,
    perfilId: perfilPersonal.id,
    mesSolicitado: month,
    cajaSolicitada: caja,
  })

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Dashboard Personal" description={`Resumen de tus finanzas · ${nombreMes(data.mes)}`} />

      <DashboardPersonalClient mes={data.claveMes} cajaId={data.cajaId} cuentas={data.cuentas.ok ? data.cuentas.data : []}>
        <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
          {data.cajaNombre && (
            <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2">
              <PiggyBank className="h-4 w-4 text-cyan-500" aria-hidden="true" />
              <p className="text-sm font-medium text-cyan-400">
                Mostrando datos filtrados por: <span className="font-bold">{data.cajaNombre}</span>
              </p>
            </div>
          )}

          <BannerPatrimonio data={data} />
          <TarjetasMes data={data} />
          <PresupuestoCategoriasClasico data={data} />

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
            <SuperavitClasico data={data} />
            <TasaAhorroTarjeta data={data} />
            <GastosCategoriaClasico data={data} />
          </div>

          <ReportesClasico data={data} />
          <LogrosFinancieros />
        </div>
      </DashboardPersonalClient>

      <AlertasFlotantes avisos={data.avisos} moneda={data.moneda} />
    </div>
  )
}
