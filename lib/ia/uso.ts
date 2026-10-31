import { createAdminClient } from "@/lib/supabase/admin"

export const MODELO_EXTRACCION = "gpt-4o-mini"
export const MODELO_TRANSCRIPCION = "gpt-4o-mini-transcribe"

/** USD por 1M de tokens (precios públicos de OpenAI). Se usan para estimar el gasto. */
const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  [MODELO_EXTRACCION]: { entrada: 0.15, salida: 0.6 },
  [MODELO_TRANSCRIPCION]: { entrada: 3, salida: 5 },
}

export const LIMITE_POR_MINUTO = 8
export const LIMITE_POR_DIA = 150

export function calcularCostoUsd(modelo: string, tokensEntrada: number, tokensSalida: number): number {
  const p = PRECIOS[modelo]
  if (!p) return 0
  return (tokensEntrada * p.entrada + tokensSalida * p.salida) / 1_000_000
}

export type RegistroUso = {
  userId: string
  operacion: "extraccion" | "transcripcion"
  modelo: string
  tokensEntrada?: number
  tokensSalida?: number
  ok: boolean
  error?: string | null
  duracionMs?: number
}

export async function registrarUso(r: RegistroUso): Promise<void> {
  const entrada = r.tokensEntrada ?? 0
  const salida = r.tokensSalida ?? 0
  const { error } = await createAdminClient()
    .from("ia_uso")
    .insert({
      user_id: r.userId,
      operacion: r.operacion,
      modelo: r.modelo,
      tokens_entrada: entrada,
      tokens_salida: salida,
      costo_usd: calcularCostoUsd(r.modelo, entrada, salida),
      ok: r.ok,
      error: r.error ? r.error.slice(0, 300) : null,
      duracion_ms: r.duracionMs ?? null,
    })
  if (error) console.error("No se pudo registrar el uso de IA:", error.message)
}

/** Devuelve un mensaje si el usuario superó el límite, o null si puede continuar. */
export async function verificarLimite(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const ahora = Date.now()
  const [minuto, dia] = await Promise.all([
    admin
      .from("ia_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(ahora - 60_000).toISOString()),
    admin
      .from("ia_uso")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(ahora - 86_400_000).toISOString()),
  ])
  if ((minuto.count ?? 0) >= LIMITE_POR_MINUTO) return "Hiciste muchas cargas seguidas. Esperá un minuto e intentá de nuevo."
  if ((dia.count ?? 0) >= LIMITE_POR_DIA) return "Alcanzaste el límite diario de cargas con IA. Podés seguir cargando de forma manual."
  return null
}
