/**
 * Cuentas con acceso al panel de administración (/admin).
 * La verificación se hace SIEMPRE en el servidor (página y server actions).
 */
export const ADMIN_EMAILS = new Set<string>(["matiastrauth64@gmail.com"])

export function esAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.has(email.trim().toLowerCase())
}

export const ESTADOS_CUENTA = ["activo", "pausado", "bloqueado"] as const
export type EstadoCuenta = (typeof ESTADOS_CUENTA)[number]

export const PRECIO_PLAN_PERSONAL = 80000
export const PRECIO_PLAN_COMPLETO = 120000

/** Baneo "indefinido" en Supabase Auth (100 años). */
export const DURACION_BANEO = "876000h"
