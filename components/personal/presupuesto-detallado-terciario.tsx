import { createClient } from "@/lib/supabase/server"
import { PresupuestoDetalladoTerciarioClient } from "./presupuesto-detallado-terciario-client"

export async function PresupuestoDetalladoTerciario({ perfilId }: { perfilId: string }) {
  const supabase = await createClient()

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  console.log("[v0] Terciario - Buscando presupuesto - perfilId:", perfilId)
  console.log("[v0] Terciario - Rango de fechas:", primerDiaMes, "a", ultimoDiaMes)

  const { data: presupuestos, error: presupuestoError } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
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
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("monto", { ascending: false })

  console.log("[v0] Terciario - Total egresos:", egresos?.length)

  return (
    <PresupuestoDetalladoTerciarioClient 
      presupuesto={presupuesto} 
      egresos={egresos || []} 
    />
  )
}
