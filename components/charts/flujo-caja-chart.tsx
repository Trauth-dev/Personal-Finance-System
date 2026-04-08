import { createClient } from "@/lib/supabase/server"
import { FlujoCajaChartClient } from "./flujo-caja-chart-client"

export async function FlujoCajaChart({ perfilId }: { perfilId: string }) {
  const supabase = await createClient()

  const meses = []
  const now = new Date()

  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1)
  const primerDiaActual = mesActual.toISOString().split("T")[0]
  const ultimoDiaActual = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: ingresosActual } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaActual)
    .lte("fecha", ultimoDiaActual)

  const { data: egresosActual } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaActual)
    .lte("fecha", ultimoDiaActual)

  const totalIngresosActual = ingresosActual?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const totalEgresosActual = egresosActual?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  meses.push({
    mes: mesActual.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
    ingresos: totalIngresosActual,
    egresos: totalEgresosActual,
  })

  const promedioIngresos = totalIngresosActual
  const promedioEgresos = totalEgresosActual

  for (let i = 1; i <= 5; i++) {
    const fecha = new Date(now.getFullYear(), now.getMonth() + i, 1)
    meses.push({
      mes: fecha.toLocaleDateString("es-ES", { month: "short", year: "numeric" }),
      ingresos: promedioIngresos,
      egresos: promedioEgresos,
    })
  }

  return <FlujoCajaChartClient data={meses} />
}
