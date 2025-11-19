import { createClient } from "@/lib/supabase/server"
import { PresupuestoCategoriasComparativoClient } from "./presupuesto-categoria-comparativo-client"

export async function PresupuestoCategoriasComparativo({ perfilId }: { perfilId: string }) {
  const supabase = await createClient()

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  console.log("[v0] Buscando presupuesto - perfilId:", perfilId)
  console.log("[v0] Rango de fechas:", primerDiaMes, "a", ultimoDiaMes)

  const { data: presupuestos, error: presupuestoError } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("fecha", { ascending: false })
    .limit(1)

  const presupuesto = presupuestos?.[0] || null

  console.log("[v0] PresupuestoCategoriasComparativo - Presupuesto:", presupuesto)
  if (presupuestoError) {
    console.log("[v0] Error de presupuesto:", presupuestoError)
  }

  // Obtener egresos del mes agrupados por tipo de categoría
  const { data: egresos } = await supabase
    .from("egresos")
    .select(`
      monto,
      tipo_categoria:tipos_categoria_egreso(id, nombre, color)
    `)
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  console.log("[v0] PresupuestoCategoriasComparativo - Egresos:", egresos)

  if (!presupuesto) {
    console.log("[v0] No hay presupuesto configurado")
  }

  return (
    <PresupuestoCategoriasComparativoClient 
      presupuesto={presupuesto} 
      egresos={egresos || []} 
    />
  )
}
