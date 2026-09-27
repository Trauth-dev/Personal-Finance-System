import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard-header"
import { createClient } from "@/lib/supabase/server"
import { getPersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { nombreMes } from "@/lib/dashboard/fechas"
import { IndicadoresPrincipales } from "@/components/personal/dashboard/indicadores-principales"
import { PresupuestoCategorias } from "@/components/personal/dashboard/presupuesto-categorias"
import { EvolucionMensual } from "@/components/personal/dashboard/evolucion-mensual"
import { DistribucionGastos, PrincipalesGastos } from "@/components/personal/dashboard/analisis-gastos"
import { AvisosYLogros } from "@/components/personal/dashboard/avisos-logros"
import { ErrorDeCarga, Panel } from "@/components/personal/dashboard/indicador"
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
      <DashboardHeader title="Dashboard Personal" description={`Tus finanzas de ${nombreMes(data.mes)}`} />

      <DashboardPersonalClient
        mes={data.claveMes}
        cajaId={data.cajaId}
        moneda={data.moneda}
        cuentas={data.cuentas.ok ? data.cuentas.data : []}
      >
        <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-6">
          <IndicadoresPrincipales data={data} />

          <PresupuestoCategorias data={data} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel titulo="Evolución de los últimos 6 meses" className="lg:col-span-2">
              {data.movimientos.ok ? (
                <EvolucionMensual puntos={data.movimientos.data.evolucion} moneda={data.moneda} />
              ) : (
                <ErrorDeCarga />
              )}
            </Panel>
            <DistribucionGastos data={data} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <PrincipalesGastos data={data} />
            <div className="lg:col-span-2">
              <AvisosYLogros data={data} />
            </div>
          </div>
        </div>
      </DashboardPersonalClient>
    </div>
  )
}
