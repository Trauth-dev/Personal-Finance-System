import { normalizarNombre } from "@/lib/utils"
import { categoriaDeEgreso, cuentaComoEgreso, type Egreso } from "../reglas"

/**
 * FUENTE PROVISIONAL — PRESUPUESTO
 *
 * INTEGRACIÓN PENDIENTE: cuando se cierre el nuevo módulo Presupuesto,
 * reemplazar esta fuente para "Presupuesto Disponible" y "Presupuesto por
 * Categoría". Hoy se lee la estructura real `presupuesto_categorias` del mes
 * (montos por subcategoría) agrupada por tipo de categoría. `meta_salario` NO
 * se usa como presupuesto de gastos.
 */

export const OTRAS_CATEGORIAS = "Otras categorías"

export interface LineaPresupuesto {
  categoria: string
  presupuestado: number
  utilizado: number
  restante: number
  porcentaje: number
}

export interface PresupuestoMes {
  configurado: boolean
  total: number
  utilizado: number
  disponible: number
  lineas: LineaPresupuesto[]
}

export interface MontoPresupuestado {
  subcategoria: string
  monto: number
}

/**
 * Consumo del presupuesto: el mismo criterio que Egresos del Mes (cuentaComoEgreso),
 * así el total utilizado del presupuesto siempre coincide con los egresos reales.
 * Los pagos de préstamos y tarjetas consumen la línea "Pago Deudas".
 */
export function calcularPresupuesto(
  montos: MontoPresupuestado[],
  subcategoriaATipo: Map<string, string>,
  egresosDelMes: Egreso[],
): PresupuestoMes {
  const tipoDe = (subcategoria: string) =>
    subcategoriaATipo.get(subcategoria) ?? subcategoriaATipo.get(normalizarNombre(subcategoria)) ?? OTRAS_CATEGORIAS

  const presupuestado = new Map<string, number>()
  for (const { subcategoria, monto } of montos) {
    if (monto <= 0) continue
    const tipo = tipoDe(subcategoria)
    presupuestado.set(tipo, (presupuestado.get(tipo) ?? 0) + monto)
  }

  const total = Array.from(presupuestado.values()).reduce((s, m) => s + m, 0)
  if (total <= 0) return { configurado: false, total: 0, utilizado: 0, disponible: 0, lineas: [] }

  const utilizadoPorTipo = new Map<string, number>()
  let utilizado = 0
  for (const egreso of egresosDelMes) {
    if (!cuentaComoEgreso(egreso)) continue
    const tipo = categoriaDeEgreso(egreso)
    utilizado += egreso.monto
    utilizadoPorTipo.set(tipo, (utilizadoPorTipo.get(tipo) ?? 0) + egreso.monto)
  }

  const lineas = Array.from(presupuestado, ([categoria, monto]) => {
    const usado = utilizadoPorTipo.get(categoria) ?? 0
    return {
      categoria,
      presupuestado: monto,
      utilizado: usado,
      restante: monto - usado,
      porcentaje: (usado / monto) * 100,
    }
  }).sort((a, b) => b.porcentaje - a.porcentaje)

  return { configurado: true, total, utilizado, disponible: total - utilizado, lineas }
}
