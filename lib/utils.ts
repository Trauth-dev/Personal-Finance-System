import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatGuaranies(amount: number): string {
  return `Gs ${amount.toLocaleString("es-PY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]
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
