/**
 * Utilidades de timezone para Paraguay (GMT-3)
 * Zona horaria: America/Asuncion
 */

const TIMEZONE = "America/Asuncion"

/**
 * Formatea una fecha a formato legible en GMT-3
 */
export const formatDateGMT3 = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleDateString("es-PY", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formatea una fecha con hora en GMT-3
 */
export const formatDateTimeGMT3 = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleString("es-PY", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formatea solo la hora en GMT-3
 */
export const formatTimeGMT3 = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleTimeString("es-PY", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formatea una fecha en formato largo en GMT-3
 */
export const formatDateLongGMT3 = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  return date.toLocaleDateString("es-PY", {
    timeZone: TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Formatea una fecha relativa (hace X dias, etc.)
 */
export const formatRelativeGMT3 = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return "Ahora mismo"
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? "s" : ""}`
  if (days < 7) return `Hace ${days} dia${days > 1 ? "s" : ""}`
  if (days < 30) return `Hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? "s" : ""}`
  if (days < 365) return `Hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? "es" : ""}`
  return `Hace ${Math.floor(days / 365)} ano${Math.floor(days / 365) > 1 ? "s" : ""}`
}

/**
 * Obtiene la fecha actual en formato ISO para inputs de fecha
 */
export const getTodayISO = (): string => {
  const now = new Date()
  return now.toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
}

/**
 * Crea un string ISO con offset GMT-3 para guardar en la base de datos
 */
export const toISOWithGMT3 = (date: string, time?: string): string => {
  if (time) {
    return `${date}T${time}:00-03:00`
  }
  return `${date}T00:00:00-03:00`
}

/**
 * Verifica si una fecha es hoy en GMT-3
 */
export const isToday = (dateString: string | Date): boolean => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  const today = new Date()
  
  const dateStr = date.toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
  const todayStr = today.toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
  
  return dateStr === todayStr
}

/**
 * Verifica si una fecha ya paso en GMT-3
 */
export const isPast = (dateString: string | Date): boolean => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  const now = new Date()
  return date.getTime() < now.getTime()
}

/**
 * Verifica si una fecha es manana en GMT-3
 */
export const isTomorrow = (dateString: string | Date): boolean => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const dateStr = date.toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
  const tomorrowStr = tomorrow.toLocaleDateString("sv-SE", { timeZone: TIMEZONE })
  
  return dateStr === tomorrowStr
}

/**
 * Obtiene la fecha de inicio de la semana actual (Lunes) en GMT-3
 */
export const getWeekStartGMT3 = (): Date => {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(now.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

/**
 * Formatea para mostrar en calendarios
 */
export const formatForCalendar = (dateString: string | Date): string => {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString
  
  if (isToday(date)) return "Hoy"
  if (isTomorrow(date)) return "Manana"
  
  return date.toLocaleDateString("es-PY", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}
