import { createClient } from "@/lib/supabase/server"
import { GastosCategoriaBarsClient } from "./gastos-categoria-bars-client"
import { getParaguayDate } from "@/lib/utils"

interface GastosCategoriaBarsProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
  cajaId?: string
}

export async function GastosCategoriaBars({ perfilId, fechaInicio, fechaFin, cajaId }: GastosCategoriaBarsProps) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = getParaguayDate()
    primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  let egresosQuery = supabase
    .from("egresos")
    .select(
      `
      monto,
      tipos_categoria_egreso (
        nombre
      )
    `,
    )
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaId) {
    egresosQuery = egresosQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaId)
  }

  const { data: egresos } = await egresosQuery

  const categorias: { [key: string]: number } = {}
  let totalEgresos = 0

  egresos?.forEach((egreso) => {
    const categoria = egreso.tipos_categoria_egreso?.nombre || "Sin categoria"
    const monto = Number(egreso.monto)
    categorias[categoria] = (categorias[categoria] || 0) + monto
    totalEgresos += monto
  })

  const categoriasArray = Object.entries(categorias)
    .map(([nombre, monto]) => ({
      nombre,
      monto,
      porcentaje: totalEgresos > 0 ? (monto / totalEgresos) * 100 : 0,
    }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5)

  const mayorGasto = categoriasArray[0] || { nombre: "Sin datos", monto: 0, porcentaje: 0 }

  return <GastosCategoriaBarsClient categorias={categoriasArray} mayorGasto={mayorGasto} total={totalEgresos} />
}
