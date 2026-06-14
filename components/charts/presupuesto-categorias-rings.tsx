import { createClient } from "@/lib/supabase/server"
import { PresupuestoCategoriasRingsClient } from "./presupuesto-categorias-rings-client"
import { getParaguayDate } from "@/lib/utils"

interface PresupuestoCategoriasRingsProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
}

export async function PresupuestoCategoriasRings({ perfilId, fechaInicio, fechaFin }: PresupuestoCategoriasRingsProps) {
  const supabase = await createClient()

  let primerDia = fechaInicio
  let ultimoDia = fechaFin

  if (!primerDia || !ultimoDia) {
    const now = getParaguayDate()
    primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  // Obtener presupuesto mensual
  const { data: presupuestos } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDia)
    .lte("fecha", ultimoDia)
    .order("fecha", { ascending: false })
    .limit(1)

  const presupuesto = presupuestos?.[0] || null

  if (!presupuesto) {
    return null
  }

  // Obtener montos exactos desde presupuesto_categorias
  const { data: presupuestoCategorias } = await supabase
    .from("presupuesto_categorias")
    .select("categoria, monto_presupuestado")
    .eq("perfil_id", perfilId)
    .gte("mes", primerDia)
    .lte("mes", ultimoDia)

  // Agrupar montos por categoría de egreso (tipos_categoria_egreso)
  // Primero obtener la relación categorias_egreso -> tipos_categoria_egreso
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

  // Mapear categorías con sus montos exactos desde presupuesto_categorias
  const categorias = [
    {
      nombre: 'Gastos Vivienda',
      monto: montosPorTipo['Gastos Vivienda'] || 0,
      gastado: gastosPorCategoria['Gastos Vivienda'] || 0,
    },
    {
      nombre: 'Gastos Personales',
      monto: montosPorTipo['Gastos Personales'] || 0,
      gastado: gastosPorCategoria['Gastos Personales'] || 0,
    },
    {
      nombre: 'Supermercado',
      monto: montosPorTipo['Supermercado'] || 0,
      gastado: gastosPorCategoria['Supermercado'] || 0,
    },
    {
      nombre: 'Pago Deudas',
      monto: montosPorTipo['Pago Deudas'] || 0,
      gastado: gastosPorCategoria['Pago Deudas'] || 0,
    },
    {
      nombre: 'Salud',
      monto: montosPorTipo['Salud'] || 0,
      gastado: gastosPorCategoria['Salud'] || 0,
    },
    {
      nombre: 'Disfrute',
      monto: montosPorTipo['Disfrute'] || 0,
      gastado: gastosPorCategoria['Disfrute'] || 0,
    },
    {
      nombre: 'Transportes',
      monto: montosPorTipo['Transportes'] || 0,
      gastado: gastosPorCategoria['Transportes'] || 0,
    },
    {
      nombre: 'Educacion',
      monto: montosPorTipo['Educacion'] || montosPorTipo['Educación'] || 0,
      gastado: gastosPorCategoria['Educacion'] || gastosPorCategoria['Educación'] || 0,
    },
    {
      nombre: 'Donacion',
      monto: montosPorTipo['Donacion'] || 0,
      gastado: gastosPorCategoria['Donacion'] || gastosPorCategoria['Donación'] || 0,
    },
    {
      nombre: 'Ahorro',
      monto: montosPorTipo['Ahorro'] || montosPorTipo['Ahorro 2025'] || 0,
      gastado: gastosPorCategoria['Ahorro'] || gastosPorCategoria['Ahorro 2025'] || 0,
    },
    {
      nombre: 'Gastos Varios',
      monto: montosPorTipo['Gastos Varios'] || 0,
      gastado: gastosPorCategoria['Gastos Varios'] || 0,
    },
    {
      nombre: 'Libertad Financiera',
      monto: montosPorTipo['Libertad Financiera'] || 0,
      gastado: gastosPorCategoria['Libertad Financiera'] || 0,
    },
  ].filter(cat => cat.monto > 0) // Solo mostrar categorías con presupuesto asignado
    .map(cat => ({
      ...cat,
      porcentaje: presupuestoTotal > 0 ? (cat.monto / presupuestoTotal) * 100 : 0
    }))

  return <PresupuestoCategoriasRingsClient categorias={categorias} presupuestoTotal={presupuestoTotal} />
}
