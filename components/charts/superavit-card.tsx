import { createClient } from "@/lib/supabase/server"
import { SuperavitCardClient } from "./superavit-card-client"

interface SuperavitCardProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
}

export async function SuperavitCard({ perfilId, fechaInicio, fechaFin }: SuperavitCardProps) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = new Date()
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

  const balance = totalIngresos - totalEgresos

  const fechaInicio_date = new Date(primerDiaMes)
  const primerDiaMesAnterior = new Date(fechaInicio_date.getFullYear(), fechaInicio_date.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0]
  const ultimoDiaMesAnterior = new Date(fechaInicio_date.getFullYear(), fechaInicio_date.getMonth(), 0)
    .toISOString()
    .split("T")[0]

  const { data: ingresosMesAnterior } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  const totalIngresosMesAnterior = ingresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresosMesAnterior } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  const totalEgresosMesAnterior = egresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const balanceMesAnterior = totalIngresosMesAnterior - totalEgresosMesAnterior

  const cambioBalance =
    balanceMesAnterior !== 0 ? ((balance - balanceMesAnterior) / Math.abs(balanceMesAnterior)) * 100 : 0

  return <SuperavitCardClient balance={balance} cambioBalance={cambioBalance} />
}
