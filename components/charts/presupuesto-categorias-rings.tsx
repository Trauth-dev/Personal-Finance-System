import { createClient } from "@/lib/supabase/server"
import { PresupuestoCategoriasRingsClient } from "./presupuesto-categorias-rings-client"

interface PresupuestoCategoriasRingsProps {
  perfilId: string
}

export async function PresupuestoCategoriasRings({ perfilId }: PresupuestoCategoriasRingsProps) {
  const supabase = await createClient()

  const now = new Date()
  const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // Obtener presupuesto con porcentajes
  const { data: presupuesto } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDia)
    .lte("fecha", ultimoDia)
    .maybeSingle()

  if (!presupuesto) {
    return null
  }

  // Obtener egresos agrupados por tipo de categoría
  const { data: egresos } = await supabase
    .from("egresos")
    .select(`
      monto,
      tipos_categoria_egreso!inner(nombre)
    `)
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDia)
    .lte("fecha", ultimoDia)

  // Agrupar gastos por categoría
  const gastosPorCategoria: Record<string, number> = {}
  egresos?.forEach((egreso: any) => {
    const categoria = egreso.tipos_categoria_egreso?.nombre
    if (categoria) {
      gastosPorCategoria[categoria] = (gastosPorCategoria[categoria] || 0) + Number(egreso.monto)
    }
  })

  const presupuestoTotal = Number(presupuesto.meta_salario)

  // Mapear categorías con sus datos
  const categorias = [
    {
      nombre: 'Donación',
      porcentaje: Number(presupuesto.pct_donacion || 0),
      gastado: gastosPorCategoria['Donación'] || 0,
    },
    {
      nombre: 'Ahorro 2025',
      porcentaje: Number(presupuesto.pct_ahorro_2025 || 0),
      gastado: gastosPorCategoria['Ahorro 2025'] || 0,
    },
    {
      nombre: 'Gastos Varios',
      porcentaje: Number(presupuesto.pct_gastos_varios || 0),
      gastado: gastosPorCategoria['Gastos Varios'] || 0,
    },
    {
      nombre: 'Gastos Vivienda',
      porcentaje: Number(presupuesto.pct_gastos_vivienda || 0),
      gastado: gastosPorCategoria['Gastos Vivienda'] || 0,
    },
    {
      nombre: 'Pago Deudas',
      porcentaje: Number(presupuesto.pct_pago_deudas || 0),
      gastado: gastosPorCategoria['Pago Deudas'] || 0,
    },
    {
      nombre: 'Disfrute',
      porcentaje: Number(presupuesto.pct_disfrute || 0),
      gastado: gastosPorCategoria['Disfrute'] || 0,
    },
    {
      nombre: 'Educación',
      porcentaje: Number(presupuesto.pct_educacion || 0),
      gastado: gastosPorCategoria['Educación'] || 0,
    },
    {
      nombre: 'Sueños',
      porcentaje: Number(presupuesto.pct_suenos || 0),
      gastado: gastosPorCategoria['Sueños'] || 0,
    },
    {
      nombre: 'Libertad Financiera',
      porcentaje: Number(presupuesto.pct_libertad_financiera || 0),
      gastado: gastosPorCategoria['Libertad Financiera'] || 0,
    },
  ].filter(cat => cat.porcentaje > 0) // Solo mostrar categorías con presupuesto asignado

  return <PresupuestoCategoriasRingsClient categorias={categorias} presupuestoTotal={presupuestoTotal} />
}
