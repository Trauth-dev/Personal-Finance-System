/**
 * Usuarios con acceso libre a Prospera+ (sin necesidad de abonar la suscripción).
 *
 * Se identifican por email (estable y único) en minúsculas. Estos usuarios
 * son socios/fundadores del proyecto, por lo que el muro de pago los deja
 * pasar siempre, sin importar profiles.suscripcion_vence.
 */
export const EMAILS_ACCESO_LIBRE = new Set<string>([
  "matiastrauth64lol@gmail.com", // Matías Trauth
  "luccianaramos007@gmail.com", // Luciana Ramos
  "davidblancobazan@gmail.com", // David Blanco
  "info@logrosconsultora.com", // Sebastián García
  "profeluciana@gmail.com", // Cuenta profe Luciana
  "profenicolas@gmail.com", // Cuenta profe Nicolás
])

/**
 * Interruptor general: mientras sea true, TODOS los usuarios tienen acceso
 * libre y el muro de pago queda desactivado. Para volver a cobrar, cambiar a
 * false (los emails de EMAILS_ACCESO_LIBRE seguirán exentos).
 */
export const ACCESO_LIBRE_GLOBAL = true

/** Devuelve true si el usuario tiene acceso libre (global o por email). */
export function tieneAccesoLibre(email: string | null | undefined): boolean {
  if (ACCESO_LIBRE_GLOBAL) return true
  if (!email) return false
  return EMAILS_ACCESO_LIBRE.has(email.trim().toLowerCase())
}
