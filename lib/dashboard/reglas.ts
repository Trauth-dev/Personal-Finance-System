import type { RangoFechas } from "./fechas"

/**
 * Reglas financieras únicas del Dashboard Personal.
 * Tarjetas, gráficos y alertas consumen estas funciones: ningún componente
 * vuelve a calcular ingresos, gastos o resultado por su cuenta.
 */

export const SIN_CATEGORIA = "Sin categoría"

export interface Ingreso {
  id: string
  monto: number
  fecha: string
  cajaId: string | null
}

export interface Egreso {
  id: string
  monto: number
  fecha: string
  concepto: string | null
  deudaId: string | null
  origenTipo: string | null
  origenId: string | null
  /** Nombre del tipo de categoría (Supermercado, Salud, ...). */
  categoria: string | null
  subcategoria: string | null
}

/**
 * Un egreso asociado a una deuda es un pago de deuda: cancela una obligación
 * (la compra con tarjeta ya se contó como gasto cuando ocurrió, y el capital de
 * un préstamo no es consumo). Por eso NO suma en Gastos del Mes.
 *
 * Provisional hasta el nuevo módulo Deudas: hoy los pagos de préstamos no
 * separan capital de intereses, así que el pago completo se excluye del gasto
 * y se informa aparte como "pagos de deudas".
 */
export function esPagoDeDeuda(egreso: Egreso): boolean {
  return egreso.deudaId !== null
}

export function ingresoEnCuenta(ingreso: Ingreso, cajaId: string | null): boolean {
  return cajaId === null || ingreso.cajaId === cajaId
}

/** Solo se atribuye a una caja lo que salió de esa caja (no compras con tarjeta). */
export function egresoEnCuenta(egreso: Egreso, cajaId: string | null): boolean {
  return cajaId === null || (egreso.origenTipo === "caja_ahorro" && egreso.origenId === cajaId)
}

export function enRango(fecha: string, rango: RangoFechas): boolean {
  return fecha >= rango.start && fecha <= rango.end
}

export interface ResumenPeriodo {
  ingresos: number
  gastos: number
  pagosDeuda: number
  resultado: number
  cantidadIngresos: number
  cantidadGastos: number
}

export function gastosDelPeriodo(egresos: Egreso[], rango: RangoFechas, cajaId: string | null): Egreso[] {
  return egresos.filter((e) => !esPagoDeDeuda(e) && enRango(e.fecha, rango) && egresoEnCuenta(e, cajaId))
}

export function resumirPeriodo(
  ingresos: Ingreso[],
  egresos: Egreso[],
  rango: RangoFechas,
  cajaId: string | null,
): ResumenPeriodo {
  let totalIngresos = 0
  let cantidadIngresos = 0
  for (const ingreso of ingresos) {
    if (enRango(ingreso.fecha, rango) && ingresoEnCuenta(ingreso, cajaId)) {
      totalIngresos += ingreso.monto
      cantidadIngresos++
    }
  }

  let gastos = 0
  let pagosDeuda = 0
  let cantidadGastos = 0
  for (const egreso of egresos) {
    if (!enRango(egreso.fecha, rango) || !egresoEnCuenta(egreso, cajaId)) continue
    if (esPagoDeDeuda(egreso)) {
      pagosDeuda += egreso.monto
    } else {
      gastos += egreso.monto
      cantidadGastos++
    }
  }

  return {
    ingresos: totalIngresos,
    gastos,
    pagosDeuda,
    resultado: totalIngresos - gastos,
    cantidadIngresos,
    cantidadGastos,
  }
}

/** Porcentaje del ingreso que quedó. Permite negativos. Null si no hubo ingresos. */
export function margenDelMes(resumen: ResumenPeriodo): number | null {
  if (resumen.ingresos <= 0) return null
  return (resumen.resultado / resumen.ingresos) * 100
}

/** Null cuando no hay una base comparable (evita "0,0%" y divisiones inválidas). */
export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return ((actual - anterior) / anterior) * 100
}

export interface CategoriaGasto {
  categoria: string
  monto: number
  porcentaje: number
}

/** Agrupa TODOS los gastos: la suma de categorías siempre es igual a Gastos del Mes. */
export function distribuirGastos(gastos: Egreso[]): CategoriaGasto[] {
  const total = gastos.reduce((s, g) => s + g.monto, 0)
  const porCategoria = new Map<string, number>()
  for (const gasto of gastos) {
    const nombre = gasto.categoria || SIN_CATEGORIA
    porCategoria.set(nombre, (porCategoria.get(nombre) ?? 0) + gasto.monto)
  }
  return Array.from(porCategoria, ([categoria, monto]) => ({
    categoria,
    monto,
    porcentaje: total > 0 ? (monto / total) * 100 : 0,
  })).sort((a, b) => b.monto - a.monto)
}

export function principalesGastos(gastos: Egreso[], limite = 5): Egreso[] {
  return [...gastos].sort((a, b) => b.monto - a.monto).slice(0, limite)
}
