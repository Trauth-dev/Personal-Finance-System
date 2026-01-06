import { createClient } from "@/lib/supabase/server"
import { PresupuestoDetalladoTerciarioClient } from "./presupuesto-detallado-terciario-client"

export async function PresupuestoDetalladoTerciario({
  perfilId,
  fechaInicio,
  fechaFin,
}: {
  perfilId: string
  fechaInicio: string
  fechaFin: string
}) {
  const supabase = await createClient()

  console.log("[v0] Terciario - Buscando presupuesto - perfilId:", perfilId)
  console.log("[v0] Terciario - Rango de fechas:", fechaInicio, "a", fechaFin)

  const { data: presupuestos, error: presupuestoError } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: false })
    .limit(1)

  const presupuesto = presupuestos?.[0] || null

  console.log("[v0] Terciario - Presupuesto encontrado:", presupuesto)
  if (presupuestoError) {
    console.log("[v0] Terciario - Error:", presupuestoError)
  }

  // Obtener egresos del mes con categorías
  const { data: egresos } = await supabase
    .from("egresos")
    .select(`
      monto,
      fecha,
      concepto,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color),
      categoria:categorias_egreso(id, nombre)
    `)
    .eq("perfil_id", perfilId)
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("monto", { ascending: false })

  console.log("[v0] Terciario - Total egresos:", egresos?.length)

  return <PresupuestoDetalladoTerciarioClient presupuesto={presupuesto} egresos={egresos || []} />
}
