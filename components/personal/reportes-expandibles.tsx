import { createClient } from "@/lib/supabase/server"
import { ReportesExpandiblesClient } from "./reportes-expandibles-client"

interface ReportesExpandiblesProps {
  perfilId: string
  fechaInicio?: string
  fechaFin?: string
  cajaId?: string
}

export async function ReportesExpandibles({ perfilId, fechaInicio, fechaFin, cajaId }: ReportesExpandiblesProps) {
  const supabase = await createClient()

  let primerDiaMes = fechaInicio
  let ultimoDiaMes = fechaFin

  if (!primerDiaMes || !ultimoDiaMes) {
    const now = new Date()
    primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
    ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  }

  let egresosQuery = supabase
    .from("egresos")
    .select(
      `
      id,
      monto,
      fecha,
      concepto,
      tipo_categoria_id,
      tipos_categoria_egreso!inner (
        id,
        nombre,
        color
      ),
      categorias_egreso (
        nombre
      )
    `,
    )
    .eq("perfil_id", perfilId)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)
    .order("monto", { ascending: false })

  if (cajaId) {
    egresosQuery = egresosQuery.eq("origen_tipo", "caja_ahorro").eq("origen_id", cajaId)
  }

  const { data: egresosConCategoria } = await egresosQuery

  const gastosPorCategoria: Record<
    string,
    {
      nombre: string
      color: string
      total: number
      gastos: Array<{ monto: number; concepto: string; descripcion: string; fecha: string }>
    }
  > = {}

  egresosConCategoria?.forEach((egreso) => {
    const tipoCategoria = egreso.tipos_categoria_egreso
    if (!tipoCategoria) return

    if (!gastosPorCategoria[tipoCategoria.id]) {
      gastosPorCategoria[tipoCategoria.id] = {
        nombre: tipoCategoria.nombre,
        color: tipoCategoria.color || "#6366f1",
        total: 0,
        gastos: [],
      }
    }

    gastosPorCategoria[tipoCategoria.id].total += Number(egreso.monto)
    gastosPorCategoria[tipoCategoria.id].gastos.push({
      monto: Number(egreso.monto),
      concepto: egreso.concepto || "Sin concepto",
      descripcion: egreso.categorias_egreso?.nombre || "Sin descripcion",
      fecha: egreso.fecha,
    })
  })

  Object.values(gastosPorCategoria).forEach((categoria) => {
    // Mostrar TODOS los gastos de la categoria (no solo los 5 mayores) para que el
    // desglose visible coincida exactamente con el total de la categoria.
    categoria.gastos = categoria.gastos.sort((a, b) => b.monto - a.monto)
  })

  const top5GastosGenerales =
    egresosConCategoria
      ?.map((egreso) => ({
        monto: Number(egreso.monto),
        concepto: egreso.concepto || "Sin concepto",
        categoria: egreso.tipos_categoria_egreso?.nombre || "Sin categoria",
        descripcion: egreso.categorias_egreso?.nombre || "Sin descripcion",
        color: egreso.tipos_categoria_egreso?.color || "#6366f1",
        fecha: egreso.fecha,
      }))
      .slice(0, 5) || []

  return <ReportesExpandiblesClient gastosPorCategoria={gastosPorCategoria} top5GastosGenerales={top5GastosGenerales} />
}
