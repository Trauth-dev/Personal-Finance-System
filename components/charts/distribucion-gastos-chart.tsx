import { createClient } from "@/lib/supabase/server"
import { DistribucionGastosChartClient } from "./distribucion-gastos-chart-client"

export async function DistribucionGastosChart({ perfilId }: { perfilId: string }) {
  const supabase = await createClient()

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: egresos } = await supabase
    .from("egresos")
    .select(`
      monto,
      tipos_categoria_egreso!inner(nombre)
    `)
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const categorias = new Map<string, number>()

  egresos?.forEach((egreso: any) => {
    const categoria = egreso.tipos_categoria_egreso?.nombre || "Sin categoría"
    const monto = Number(egreso.monto)
    categorias.set(categoria, (categorias.get(categoria) || 0) + monto)
  })

  const data = Array.from(categorias.entries()).map(([name, value]) => ({
    name,
    value,
  }))

  return <DistribucionGastosChartClient data={data} />
}
