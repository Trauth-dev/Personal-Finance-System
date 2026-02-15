import { createClient } from "@/lib/supabase/server"
import { TasaAhorroDonutClient } from "./tasa-ahorro-donut-client"
import { getParaguayDate } from "@/lib/utils"

interface TasaAhorroDonutProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
  cajaId?: string
}

export async function TasaAhorroDonut({ perfilId, fechaInicio, fechaFin, cajaId }: TasaAhorroDonutProps) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = getParaguayDate()
    primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  let ingresosQuery = supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaId) {
    ingresosQuery = ingresosQuery.eq("destino_caja_id", cajaId)
  }

  const { data: ingresos } = await ingresosQuery
  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  let egresosQuery = supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaId) {
    egresosQuery = egresosQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaId)
  }

  const { data: egresos } = await egresosQuery
  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0
  const balance = totalIngresos - totalEgresos

  return <TasaAhorroDonutClient tasaAhorro={tasaAhorro} balance={balance} />
}
