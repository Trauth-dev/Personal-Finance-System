// ============================================================================
// Caché en memoria para la sección "Carga de Ingreso y Egreso".
// ----------------------------------------------------------------------------
// Objetivo: que las categorías/tipos aparezcan de forma INSTANTÁNEA al cambiar
// de pestaña o al volver a entrar a la página, sin volver a esperar al servidor.
//
// Patrón: stale-while-revalidate. Los formularios leen primero de esta caché
// (síncrono, sin red) y muestran los datos al instante; luego revalidan en
// segundo plano y actualizan tanto la caché como la pantalla si algo cambió.
//
// Es solo un respaldo de lectura: NO reemplaza las consultas ni la seguridad
// (RLS sigue aplicando en cada consulta real). Vive solo en memoria del cliente
// durante la sesión de navegación; se limpia al recargar la página.
// ============================================================================

const store = new Map<string, unknown>()

/** Devuelve el valor cacheado para la clave, o undefined si no existe. */
export function getCache<T>(key: string): T | undefined {
  return store.get(key) as T | undefined
}

/** Guarda/actualiza el valor cacheado para la clave. */
export function setCache<T>(key: string, value: T): void {
  store.set(key, value)
}

/** Elimina una entrada (útil tras crear/editar/borrar para forzar recarga). */
export function invalidateCache(key: string): void {
  store.delete(key)
}

/** Limpia todas las entradas de un perfil (por si se cambia de perfil). */
export function invalidatePerfil(perfilId: string): void {
  for (const key of store.keys()) {
    if (key.includes(`:${perfilId}`)) store.delete(key)
  }
}
