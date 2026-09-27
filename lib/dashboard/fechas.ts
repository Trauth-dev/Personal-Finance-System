import { DEFAULT_TIMEZONE } from "@/lib/currency"

/**
 * Fechas financieras del dashboard.
 *
 * Todo se maneja como fechas de calendario ("YYYY-MM-DD") calculadas con
 * aritmética de enteros. Nunca se usa `toISOString()` sobre una fecha local,
 * porque la conversión a UTC puede mover el día (ej. el 1° del mes termina
 * siendo el último día del mes anterior).
 */

export interface AnioMes {
  year: number
  /** 1 a 12 */
  month: number
}

export interface DiaLocal extends AnioMes {
  day: number
}

export interface RangoFechas {
  start: string
  end: string
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

const pad = (n: number) => String(n).padStart(2, "0")

function partesEnZona(timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
}

/** Día actual según la zona horaria configurada del usuario. */
export function hoyEnZona(timezone: string | null | undefined): DiaLocal {
  let partes: Intl.DateTimeFormatPart[]
  try {
    partes = partesEnZona(timezone || DEFAULT_TIMEZONE)
  } catch {
    partes = partesEnZona(DEFAULT_TIMEZONE)
  }
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value)
  return { year: valor("year"), month: valor("month"), day: valor("day") }
}

export function diasDelMes({ year, month }: AnioMes): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function desplazarMes({ year, month }: AnioMes, delta: number): AnioMes {
  const indice = year * 12 + (month - 1) + delta
  return { year: Math.floor(indice / 12), month: (indice % 12) + 1 }
}

export function claveMes({ year, month }: AnioMes): string {
  return `${year}-${pad(month)}`
}

export function fechaIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function rangoMes(mes: AnioMes): RangoFechas {
  return {
    start: fechaIso(mes.year, mes.month, 1),
    end: fechaIso(mes.year, mes.month, diasDelMes(mes)),
  }
}

/** Del día 1 al día indicado (limitado al largo del mes). */
export function rangoHastaDia(mes: AnioMes, dia: number): RangoFechas {
  const tope = Math.min(dia, diasDelMes(mes))
  return { start: fechaIso(mes.year, mes.month, 1), end: fechaIso(mes.year, mes.month, tope) }
}

export function mismoMes(a: AnioMes, b: AnioMes): boolean {
  return a.year === b.year && a.month === b.month
}

/** Acepta "YYYY-MM". Devuelve null si el valor no es un mes válido. */
export function parsearClaveMes(valor: string | null | undefined): AnioMes | null {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) return null
  const [year, month] = valor.split("-").map(Number)
  if (month < 1 || month > 12) return null
  return { year, month }
}

/** Últimos `cantidad` meses terminando en `mes`, en orden cronológico. */
export function ultimosMeses(mes: AnioMes, cantidad: number): AnioMes[] {
  return Array.from({ length: cantidad }, (_, i) => desplazarMes(mes, i - (cantidad - 1)))
}

export function nombreMes(mes: AnioMes): string {
  return `${MESES[mes.month - 1]} ${mes.year}`
}

export function nombreMesCorto(mes: AnioMes): string {
  return MESES[mes.month - 1].slice(0, 3)
}

export function diasEntre(desde: DiaLocal, hasta: DiaLocal): number {
  const a = Date.UTC(desde.year, desde.month - 1, desde.day)
  const b = Date.UTC(hasta.year, hasta.month - 1, hasta.day)
  return Math.round((b - a) / 86_400_000)
}

export function formatearFechaCorta(fecha: string): string {
  const [, month, day] = fecha.split("-").map(Number)
  return `${day} ${MESES[month - 1].slice(0, 3).toLowerCase()}`
}
