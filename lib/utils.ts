import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatMoney } from "@/lib/currency"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Reexport para que las pantallas puedan usar el formateador central de dinero.
export { formatMoney, formatMoneyNumber, getCurrencySymbol } from "@/lib/currency"

/**
 * Formatea un monto de dinero. Se mantiene el nombre `formatGuaranies` por
 * compatibilidad con los cientos de usos existentes, pero ahora delega en
 * `formatMoney`, que respeta la moneda del usuario (guaraníes, dólares, etc.).
 * Para usuarios de Paraguay el resultado es idéntico al anterior ("Gs 1.234").
 */
export function formatGuaranies(amount: number | null | undefined): string {
  return formatMoney(amount)
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

/**
 * Normaliza un nombre de categoría para comparaciones robustas: ignora
 * mayúsculas, tildes/acentos y espacios extra. Asi "Donación", "donacion"
 * y "Donacion" se consideran equivalentes y nunca generan duplicados.
 */
export function normalizarNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

/**
 * Convierte un color HEX (#RGB o #RRGGBB) a una cadena rgba() con la opacidad
 * indicada (0-1). Usar esto en lugar de concatenar alfa al hex
 * (ej. `${color}30`) porque el formato hex de 8 dígitos (#RRGGBBAA) NO es
 * compatible con algunos navegadores Android/Samsung Internet antiguos, lo que
 * hace que los fondos de color desaparezcan en esos dispositivos.
 *
 * @param hex Color en formato #RGB o #RRGGBB
 * @param alpha Opacidad entre 0 y 1
 * @returns Cadena rgba() compatible con todos los navegadores
 */
export function hexToRgba(hex: string | null | undefined, alpha = 1): string {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`

  let normalized = hex.trim().replace("#", "")

  // Expandir formato corto (#RGB -> #RRGGBB)
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((c) => c + c)
      .join("")
  }

  // Si ya viene con alfa de 8 dígitos, descartar el alfa hex
  if (normalized.length === 8) {
    normalized = normalized.slice(0, 6)
  }

  // Si no es un hex válido de 6 dígitos, devolver el valor original tal cual
  if (normalized.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return hex
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
