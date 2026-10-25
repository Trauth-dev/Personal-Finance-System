/**
 * Usuarios con acceso libre a Prospera+ (sin necesidad de abonar la suscripción).
 *
 * Se identifican por email (estable y único) en minúsculas. Estos usuarios
 * son socios/fundadores del proyecto: siempre tienen acceso Total, sin
 * importar profiles.suscripcion_vence ni profiles.plan_tier.
 */
export const EMAILS_ACCESO_LIBRE = new Set<string>([
  "matiastrauth64lol@gmail.com", // Matías Trauth
  "matiastrauth@gmail.com", // Matías Trauth (admin)
  "luccianaramos007@gmail.com", // Luciana Ramos
  "davidblancobazan@gmail.com", // David Blanco
  "info@logrosconsultora.com", // Sebastián García
  "profeluciana@gmail.com", // Cuenta profe Luciana
  "profenicolas@gmail.com", // Cuenta profe Nicolás
])

/**
 * Período sin cobro hasta que se habilite Bancard (diciembre).
 * Mientras sea true nadie paga, pero cada usuario accede SEGÚN SU PLAN
 * (profiles.plan_tier): "completo" = Total, cualquier otro = Personal.
 * Para empezar a cobrar, cambiar a false: desde ese momento se exige
 * suscripción vigente (los emails de EMAILS_ACCESO_LIBRE siguen exentos).
 */
export const COBROS_PAUSADOS = true

/** Devuelve true si el usuario es socio/fundador con acceso Total permanente. */
export function tieneAccesoLibre(email: string | null | undefined): boolean {
  if (!email) return false
  return EMAILS_ACCESO_LIBRE.has(email.trim().toLowerCase())
}
