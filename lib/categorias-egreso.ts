/**
 * Configuración central de las categorías de egreso (perfil Personal).
 *
 * IMPORTANTE: las "claves internas" (nombre guardado en la base de datos)
 * NUNCA cambian, para no romper egresos, presupuestos ni dashboards ya
 * existentes. Lo único que cambia es el NOMBRE VISIBLE (display) que ve el
 * usuario en la interfaz.
 *
 * Ejemplos de renombres solo-visuales:
 *  - "Donacion"            -> "Generosidad"
 *  - "Libertad Financiera" -> "Inversión"
 *  - "Gastos Vivienda"     -> "Vivienda"
 *  - "Gastos Varios"       -> "Imprevistos"
 *  - "Pago Deudas"         -> "Deudas"
 *  - "Ahorro"              -> "Ahorro / Sueños"
 */

// Orden exacto de la grilla (3 columnas x 4 filas) en "Tipo de Categoría".
// Se usan las claves INTERNAS (tal como están en la base de datos).
export const ORDEN_CATEGORIAS_EGRESO: string[] = [
  "Gastos Vivienda",
  "Gastos Personales",
  "Supermercado",
  "Pago Deudas",
  "Salud",
  "Disfrute",
  "Transportes",
  "Educacion",
  "Donacion",
  "Ahorro",
  "Gastos Varios",
  "Libertad Financiera",
  "Gastos del Negocio",
]

// Nombre interno (BD) -> Nombre visible (UI).
export const NOMBRES_DISPLAY_CATEGORIA: Record<string, string> = {
  "Gastos Vivienda": "Vivienda",
  "Gastos Personales": "Gastos Personales",
  Supermercado: "Supermercado",
  "Pago Deudas": "Deudas",
  Salud: "Salud",
  Disfrute: "Disfrute",
  Transportes: "Transportes",
  Educacion: "Educación",
  Donacion: "Generosidad",
  Ahorro: "Ahorro / Sueños",
  "Gastos Varios": "Imprevistos",
  "Libertad Financiera": "Inversión",
  "Gastos del Negocio": "Gastos del Negocio",
  // Variantes/legados para que nunca quede sin etiqueta correcta
  "Ahorro 2025": "Ahorro / Sueños",
  Educación: "Educación",
  Donación: "Generosidad",
}

// Nombre interno (BD) -> color HEX canónico. Debe coincidir con los colores
// sembrados en la base de datos (trigger y migración). Se guarda SIEMPRE en
// formato hex porque las clases Tailwind no se renderizan en estilos inline.
export const COLORES_CATEGORIA: Record<string, string> = {
  "Gastos Vivienda": "#ef4444",
  "Gastos Personales": "#8b5cf6",
  Supermercado: "#84cc16",
  "Pago Deudas": "#f97316",
  Salud: "#f43f5e",
  Disfrute: "#ec4899",
  Transportes: "#0ea5e9",
  Educacion: "#06b6d4",
  Donacion: "#10b981",
  Ahorro: "#3b82f6",
  "Gastos Varios": "#a855f7",
  "Libertad Financiera": "#10b981",
  "Gastos del Negocio": "#3b82f6",
}

/**
 * Devuelve el color hex canónico de una categoría por su nombre interno.
 */
export function getColorCategoria(nombreInterno: string | null | undefined): string {
  if (!nombreInterno) return "#6b7280"
  return COLORES_CATEGORIA[nombreInterno] ?? "#6b7280"
}

/**
 * Devuelve el nombre visible de una categoría a partir de su nombre interno.
 * Si no hay mapeo, devuelve el mismo nombre (categorías creadas por el usuario).
 */
export function getNombreCategoriaDisplay(nombreInterno: string | null | undefined): string {
  if (!nombreInterno) return ""
  return NOMBRES_DISPLAY_CATEGORIA[nombreInterno] ?? nombreInterno
}

/**
 * Ordena una lista de categorías según el orden oficial de la grilla.
 * Las categorías que no estén en el orden (creadas por el usuario) van al final.
 */
export function ordenarCategoriasEgreso<T extends { nombre: string }>(categorias: T[]): T[] {
  const indice = (nombre: string) => {
    const i = ORDEN_CATEGORIAS_EGRESO.indexOf(nombre)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...categorias].sort((a, b) => {
    const diff = indice(a.nombre) - indice(b.nombre)
    if (diff !== 0) return diff
    return a.nombre.localeCompare(b.nombre)
  })
}
