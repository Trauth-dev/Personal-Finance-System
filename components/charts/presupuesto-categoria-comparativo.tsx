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

  // Obtener montos exactos desde presupuesto_categorias
  const { data: presupuestoCategorias } = await supabase
    .from("presupuesto_categorias")
    .select("categoria, monto_presupuestado")
    .eq("perfil_id", perfilId)
    .gte("mes", primerDiaMes)
    .lte("mes", ultimoDiaMes)

  // Obtener relación categorias_egreso -> tipos_categoria_egreso
  const { data: categoriasEgreso } = await supabase
    .from("categorias_egreso")
    .select("nombre, tipos_categoria_egreso!inner(nombre)")
    .eq("perfil_id", perfilId)

  // Crear mapa de subcategoría -> tipo principal
  const subcategoriaToTipo: Record<string, string> = {}
  categoriasEgreso?.forEach((ce: any) => {
    subcategoriaToTipo[ce.nombre] = ce.tipos_categoria_egreso?.nombre || ""
  })

  // Sumar montos por tipo de categoría
  const montosPorTipo: Record<string, number> = {}
  presupuestoCategorias?.forEach((pc: any) => {
    const tipoPrincipal = subcategoriaToTipo[pc.categoria]
    if (tipoPrincipal) {
      montosPorTipo[tipoPrincipal] = (montosPorTipo[tipoPrincipal] || 0) + Number(pc.monto_presupuestado || 0)
    }
  })

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

  return <PresupuestoCategoriasComparativoClient presupuesto={presupuesto} egresos={egresos || []} montosPorTipo={montosPorTipo} />
}
