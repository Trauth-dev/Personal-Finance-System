import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import { FlujoCajaEmpresarialClient, type FlujoMes } from "@/components/empresarial/flujo-caja-empresarial-client"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"

export const revalidate = 0

export default async function FlujoCajaEmpresarialPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilEmpresarial } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "empresarial")
    .single()

  if (!perfilEmpresarial) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Flujo de Caja" description="Movimiento de dinero de tu negocio" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="p-6">
              <p className="text-amber-800 dark:text-amber-200">
                No se encontró un perfil Empresarial.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const perfilId = perfilEmpresarial.id
  const now = getParaguayDate()

  // Rango de los últimos 6 meses (incluyendo el actual)
  const desde = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0]
  const hasta = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const [{ data: ingresos }, { data: egresos }] = await Promise.all([
    supabase.from("ingresos").select("monto, fecha").eq("perfil_id", perfilId).gte("fecha", desde).lte("fecha", hasta),
    supabase.from("egresos").select("monto, fecha").eq("perfil_id", perfilId).gte("fecha", desde).lte("fecha", hasta),
  ])

  // Construir los 6 buckets mensuales
  const buckets: { key: string; label: string; ingresos: number; egresos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("es-ES", { month: "short" }),
      ingresos: 0,
      egresos: 0,
    })
  }

  const keyOf = (fecha: string) => fecha.slice(0, 7)

  ingresos?.forEach((r) => {
    const b = buckets.find((x) => x.key === keyOf(r.fecha))
    if (b) b.ingresos += Number(r.monto)
  })
  egresos?.forEach((r) => {
    const b = buckets.find((x) => x.key === keyOf(r.fecha))
    if (b) b.egresos += Number(r.monto)
  })

  const data: FlujoMes[] = buckets.map((b) => ({ mes: b.label, ingresos: b.ingresos, egresos: b.egresos }))

  const totalIngresos = data.reduce((s, m) => s + m.ingresos, 0)
  const totalEgresos = data.reduce((s, m) => s + m.egresos, 0)
  const balanceAcumulado = totalIngresos - totalEgresos

  return (
    <div className="min-h-screen space-y-6">
      <DashboardHeader title="Flujo de Caja" description="Movimiento de dinero de tu negocio" />

      {/* Resumen de los 6 meses */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ingresos (6 meses)</p>
              <p className="text-lg font-bold text-foreground">{formatGuaranies(totalIngresos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/15">
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Egresos (6 meses)</p>
              <p className="text-lg font-bold text-foreground">{formatGuaranies(totalEgresos)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
              <Wallet className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Balance acumulado</p>
              <p className={`text-lg font-bold ${balanceAcumulado >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatGuaranies(balanceAcumulado)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <FlujoCajaEmpresarialClient data={data} />
    </div>
  )
}
