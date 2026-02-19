import { createClient } from "@/lib/supabase/server"
import { PresupuestoCategoriasComparativoClient } from "./presupuesto-categoria-comparativo-client"
import { getParaguayDate } from "@/lib/utils"

export async function PresupuestoCategoriasComparativo({
  perfilId,
  fechaInicio,
  fechaFin,
  cajaId,
}: {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
  cajaId?: string
}) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = getParaguayDate()
    primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  const { data: presupuestos } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("fecha", { ascending: false })
    .limit(1)

  const presupuesto = presupuestos?.[0] || null

  // Obtener egresos del mes agrupados por tipo de categoría
  let egresosQuery = supabase
    .from("egresos")
    .select(`
      monto,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color)
    `)
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  if (cajaId) {
    egresosQuery = egresosQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaId)
  }

  const { data: egresos } = await egresosQuery

  return <PresupuestoCategoriasComparativoClient presupuesto={presupuesto} egresos={egresos || []} />
}
