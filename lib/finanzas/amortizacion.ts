export type MetodoAmortizacion = "frances" | "aleman" | "manual"
export type FrecuenciaPago = "semanal" | "quincenal" | "mensual" | "trimestral" | "anual"
export type TasaTipo = "anual" | "periodo"

export interface CuotaProgramada {
  numero: number
  fecha: string
  saldo_inicial: number
  capital: number
  interes: number
  cargos: number
  total: number
}

const PERIODOS_POR_ANIO: Record<FrecuenciaPago, number> = {
  semanal: 52,
  quincenal: 24,
  mensual: 12,
  trimestral: 4,
  anual: 1,
}

function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Suma meses respetando el día original (31 -> último día del mes si no existe). */
function addMonthsClamped(base: Date, months: number, diaOriginal: number): Date {
  const y = base.getUTCFullYear()
  const m = base.getUTCMonth() + months
  const ultimoDia = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return new Date(Date.UTC(y, m, Math.min(diaOriginal, ultimoDia)))
}

export function generarFechasCuotas(primeraCuota: string, cantidad: number, frecuencia: FrecuenciaPago): string[] {
  const [y, m, d] = primeraCuota.split("-").map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const fechas: string[] = []
  for (let i = 0; i < cantidad; i++) {
    let fecha: Date
    if (frecuencia === "semanal") fecha = new Date(base.getTime() + i * 7 * 86400000)
    else if (frecuencia === "quincenal") fecha = new Date(base.getTime() + i * 15 * 86400000)
    else {
      const meses = frecuencia === "mensual" ? 1 : frecuencia === "trimestral" ? 3 : 12
      fecha = addMonthsClamped(base, i * meses, d)
    }
    fechas.push(toIsoDate(fecha))
  }
  return fechas
}

export function tasaPeriodica(tasaPorcentaje: number, tasaTipo: TasaTipo, frecuencia: FrecuenciaPago): number {
  const tasa = Math.max(0, tasaPorcentaje || 0) / 100
  return tasaTipo === "periodo" ? tasa : tasa / PERIODOS_POR_ANIO[frecuencia]
}

interface ParametrosCronograma {
  metodo: Exclude<MetodoAmortizacion, "manual">
  capital: number
  cantidadCuotas: number
  tasaPorcentaje: number
  tasaTipo: TasaTipo
  frecuencia: FrecuenciaPago
  primeraCuota: string
  cargosPorCuota?: number
}

/**
 * Único motor de cronogramas de la app. Montos redondeados a guaraníes enteros;
 * la última cuota absorbe el redondeo para que el capital cierre exacto en 0.
 */
export function generarCronograma(p: ParametrosCronograma): CuotaProgramada[] {
  const n = Math.max(1, Math.floor(p.cantidadCuotas))
  const capital = Math.round(p.capital)
  const i = tasaPeriodica(p.tasaPorcentaje, p.tasaTipo, p.frecuencia)
  const cargos = Math.max(0, Math.round(p.cargosPorCuota || 0))
  const fechas = generarFechasCuotas(p.primeraCuota, n, p.frecuencia)

  const cuotaFija = i === 0 ? capital / n : (capital * i) / (1 - Math.pow(1 + i, -n))
  const capitalFijo = capital / n

  const cuotas: CuotaProgramada[] = []
  let saldo = capital
  for (let k = 0; k < n; k++) {
    const interes = Math.round(saldo * i)
    let capitalCuota = p.metodo === "frances" ? Math.round(cuotaFija) - interes : Math.round(capitalFijo)
    if (k === n - 1 || capitalCuota > saldo) capitalCuota = saldo
    capitalCuota = Math.max(0, capitalCuota)
    cuotas.push({
      numero: k + 1,
      fecha: fechas[k],
      saldo_inicial: saldo,
      capital: capitalCuota,
      interes,
      cargos,
      total: capitalCuota + interes + cargos,
    })
    saldo -= capitalCuota
  }
  return cuotas
}

export function resumenCronograma(cuotas: Pick<CuotaProgramada, "capital" | "interes" | "cargos" | "total">[]) {
  return cuotas.reduce(
    (acc, c) => ({
      capital: acc.capital + (c.capital || 0),
      interes: acc.interes + (c.interes || 0),
      cargos: acc.cargos + (c.cargos || 0),
      total: acc.total + (c.total || 0),
    }),
    { capital: 0, interes: 0, cargos: 0, total: 0 },
  )
}
