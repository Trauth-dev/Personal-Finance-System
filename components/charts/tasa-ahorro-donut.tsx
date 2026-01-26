import { createClient } from "@/lib/supabase/server"
import { TasaAhorroDonutClient } from "./tasa-ahorro-donut-client"
import { getParaguayDate } from "@/lib/utils"

interface TasaAhorroDonutProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
}

export async function TasaAhorroDonut({ perfilId, fechaInicio, fechaFin }: TasaAhorroDonutProps) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = getParaguayDate()
    primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresos } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0
  const balance = totalIngresos - totalEgresos

  return <TasaAhorroDonutClient tasaAhorro={tasaAhorro} balance={balance} />
}
