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
])

/** Devuelve true si el email pertenece a un usuario con acceso libre. */
export function tieneAccesoLibre(email: string | null | undefined): boolean {
  if (!email) return false
  return EMAILS_ACCESO_LIBRE.has(email.trim().toLowerCase())
}
