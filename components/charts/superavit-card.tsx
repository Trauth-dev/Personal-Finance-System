import { createClient } from "@/lib/supabase/server"
import { SuperavitCardClient } from "./superavit-card-client"
import { getParaguayDate } from "@/lib/utils"

interface SuperavitCardProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
  cajaId?: string
}

export async function SuperavitCard({ perfilId, fechaInicio, fechaFin, cajaId }: SuperavitCardProps) {
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

  const balance = totalIngresos - totalEgresos

  const fechaInicio_date = new Date(primerDiaMes)
  const primerDiaMesAnterior = new Date(fechaInicio_date.getFullYear(), fechaInicio_date.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0]
  const ultimoDiaMesAnterior = new Date(fechaInicio_date.getFullYear(), fechaInicio_date.getMonth(), 0)
    .toISOString()
    .split("T")[0]

  let ingresosAntQuery = supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  if (cajaId) {
    ingresosAntQuery = ingresosAntQuery.eq("destino_caja_id", cajaId)
  }

  const { data: ingresosMesAnterior } = await ingresosAntQuery
  const totalIngresosMesAnterior = ingresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  let egresosAntQuery = supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMesAnterior)
    .lte("fecha", ultimoDiaMesAnterior)

  if (cajaId) {
    egresosAntQuery = egresosAntQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaId)
  }

  const { data: egresosMesAnterior } = await egresosAntQuery
  const totalEgresosMesAnterior = egresosMesAnterior?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const balanceMesAnterior = totalIngresosMesAnterior - totalEgresosMesAnterior

  const cambioBalance =
    balanceMesAnterior !== 0 ? ((balance - balanceMesAnterior) / Math.abs(balanceMesAnterior)) * 100 : 0

  return <SuperavitCardClient balance={balance} cambioBalance={cambioBalance} />
}
