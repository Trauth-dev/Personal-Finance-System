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
  naturaleza: string | null
  /** Nombre del tipo de categoría (Supermercado, Salud, ...). */
  categoria: string | null
  subcategoria: string | null
}

export const CATEGORIA_PAGO_DEUDAS = "Pago Deudas"

const NATURALEZAS_TECNICAS = new Set(["ajuste", "ajuste_saldo", "reembolso", "transferencia"])

/** Ajustes de saldo, reembolsos y transferencias no son salida de dinero. */
export function esAjusteTecnico(egreso: Pick<Egreso, "naturaleza">): boolean {
  return !!egreso.naturaleza && NATURALEZAS_TECNICAS.has(egreso.naturaleza)
}

export function esPagoDeDeuda(egreso: Pick<Egreso, "naturaleza" | "deudaId">): boolean {
  if (egreso.naturaleza) return egreso.naturaleza === "pago_deuda"
  return egreso.deudaId !== null
}

/**
 * Criterio único de flujo de caja: un egreso es dinero que salió.
 * - Pagos de préstamos y de tarjetas SÍ son egreso (salió dinero de tu bolsillo).
 * - Una compra hecha CON tarjeta todavía no es salida de dinero: aumenta la deuda
 *   de la tarjeta y se convierte en egreso cuando pagás la tarjeta. Contarla en
 *   ambos momentos duplicaría el gasto.
 * - Ajustes técnicos nunca suman.
 */
export function cuentaComoEgreso(
  egreso: Pick<Egreso, "naturaleza" | "deudaId" | "origenTipo" | "monto">,
): boolean {
  if (egreso.monto <= 0 || esAjusteTecnico(egreso)) return false
  if (!esPagoDeDeuda(egreso) && egreso.origenTipo === "tarjeta_credito") return false
  return true
}

/** Los pagos registrados desde Deudas sin tipo de categoría se ubican en "Pago Deudas". */
export function categoriaDeEgreso(egreso: Egreso): string {
  return egreso.categoria || (esPagoDeDeuda(egreso) ? CATEGORIA_PAGO_DEUDAS : SIN_CATEGORIA)
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
  return egresos.filter((e) => cuentaComoEgreso(e) && enRango(e.fecha, rango) && egresoEnCuenta(e, cajaId))
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
    if (!cuentaComoEgreso(egreso) || !enRango(egreso.fecha, rango) || !egresoEnCuenta(egreso, cajaId)) continue
    gastos += egreso.monto
    cantidadGastos++
    if (esPagoDeDeuda(egreso)) pagosDeuda += egreso.monto
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
    const nombre = categoriaDeEgreso(gasto)
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
