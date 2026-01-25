import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGuaranies(amount: number): string {
  return `Gs ${amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

/**
 * Obtiene la fecha actual en el timezone de Paraguay (America/Asuncion)
 * @returns Fecha en formato YYYY-MM-DD
 */
export function getTodayDate(): string {
  const paraguayDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Asuncion" })
  )
  const year = paraguayDate.getFullYear()
  const month = String(paraguayDate.getMonth() + 1).padStart(2, "0")
  const day = String(paraguayDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Obtiene un objeto Date en el timezone de Paraguay
 * @returns Date object en timezone de Paraguay
 */
export function getParaguayDate(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Asuncion" })
  )
}

/**
 * Convierte una fecha UTC a fecha de Paraguay
 * @param date - Fecha a convertir
 * @returns Date object en timezone de Paraguay
 */
export function toParaguayDate(date: Date): Date {
  return new Date(
    date.toLocaleString("en-US", { timeZone: "America/Asuncion" })
  )
}

/**
 * Obtiene la fecha y hora actual como ISO string en timezone de Paraguay
 * @returns ISO string de la fecha actual en Paraguay
 */
export function getParaguayISOString(): string {
  const paraguayDate = getParaguayDate()
  return paraguayDate.toISOString()
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
