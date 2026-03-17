import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGuaranies(amount: number | null | undefined): string {
  const safeAmount = amount ?? 0
  return `Gs ${safeAmount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Obtiene la fecha actual en el timezone de Paraguay (UTC-3)
 * Paraguay NO cambia de horario, siempre es UTC-3
 * @returns Fecha en formato YYYY-MM-DD
 */
export function getTodayDate(): string {
  const paraguayDate = getParaguayDate()
  const year = paraguayDate.getFullYear()
  const month = String(paraguayDate.getMonth() + 1).padStart(2, "0")
  const day = String(paraguayDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Obtiene un objeto Date en el timezone de Paraguay (UTC-3)
 * Paraguay NO cambia de horario, siempre es UTC-3
 * @returns Date object en timezone de Paraguay
 */
export function getParaguayDate(): Date {
  const now = new Date()
  // Paraguay es UTC-3 (3 horas menos que UTC)
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const paraguayTime = new Date(utc + (3600000 * -3))
  return paraguayTime
}

/**
 * Convierte una fecha UTC a fecha de Paraguay (UTC-3)
 * @param date - Fecha a convertir
 * @returns Date object en timezone de Paraguay
 */
export function toParaguayDate(date: Date): Date {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000)
  const paraguayTime = new Date(utc + (3600000 * -3))
  return paraguayTime
}

/**
 * Obtiene la fecha y hora actual como ISO string en timezone de Paraguay (UTC-3)
 * @returns ISO string de la fecha actual en Paraguay
 */
export function getParaguayISOString(): string {
  const paraguayDate = getParaguayDate()
  return paraguayDate.toISOString()
}

/**
 * Obtiene el timestamp actual ajustado al timezone de Paraguay (UTC-3)
 * Útil para campos updated_at, created_at, etc.
 * @returns ISO string con el timestamp de Paraguay
 */
export function getParaguayTimestamp(): string {
  return getParaguayISOString()
}

export function formatDateWithoutTimezone(dateString: string, locale = "es-ES"): string {
  if (!dateString) return ""

  // Parse the date string as YYYY-MM-DD without timezone conversion
  const [year, month, day] = dateString.split("-").map(Number)

  // Create date in local timezone (not UTC)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString(locale)
}

export function formatDateShort(dateString: string): string {
  if (!dateString) return ""

  const [year, month, day] = dateString.split("-").map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}
