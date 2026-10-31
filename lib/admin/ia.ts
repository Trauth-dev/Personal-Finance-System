import { createAdminClient } from "@/lib/supabase/admin"

export type CargaCreditos = { id: number; montoUsd: number; fecha: string; nota: string | null; adminEmail: string }

export type ResumenIA = {
  cargadoUsd: number
  cargadoDesde: string | null
  gastadoDesdeCargaUsd: number
  saldoEstimadoUsd: number | null
  gastadoMesUsd: number
  gastadoTotalUsd: number
  /** Gasto real del mes informado por OpenAI (solo si existe OPENAI_ADMIN_KEY). */
  gastadoMesRealUsd: number | null
  solicitudesMes: number
  erroresMes: number
  usuariosMes: number
  sinCreditos: boolean
  ultimoError: { error: string; fecha: string } | null
  cargas: CargaCreditos[]
  error: string | null
}

function inicioMesAsuncionUnix(): number {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
  // Paraguay usa UTC-3 todo el año.
  return Math.floor(Date.UTC(Number(partes[0]), Number(partes[1]) - 1, 1, 3) / 1000)
}

async function gastoRealDelMes(): Promise<number | null> {
  const key = process.env.OPENAI_ADMIN_KEY
  if (!key) return null
  try {
    let total = 0
    let pagina: string | null = null
    for (let i = 0; i < 5; i++) {
      const url = new URL("https://api.openai.com/v1/organization/costs")
      url.searchParams.set("start_time", String(inicioMesAsuncionUnix()))
      url.searchParams.set("limit", "31")
      if (pagina) url.searchParams.set("page", pagina)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) return null
      const json = await res.json()
      for (const bucket of json.data ?? [])
        for (const r of bucket.results ?? []) total += Number(r.amount?.value ?? 0)
      if (!json.has_more || !json.next_page) break
      pagina = json.next_page
    }
    return total
  } catch {
    return null
  }
}

export async function getResumenIA(): Promise<ResumenIA> {
  const [resumen, real] = await Promise.all([createAdminClient().rpc("admin_resumen_ia"), gastoRealDelMes()])

  const d = (resumen.data ?? {}) as Record<string, any>
  const cargado = Number(d.cargado_usd ?? 0)
  const gastadoDesdeCarga = Number(d.gastado_desde_carga_usd ?? 0)
  const ultimoError = d.ultimo_error ?? null

  return {
    cargadoUsd: cargado,
    cargadoDesde: d.cargado_desde ?? null,
    gastadoDesdeCargaUsd: gastadoDesdeCarga,
    saldoEstimadoUsd: cargado > 0 ? Math.max(0, cargado - gastadoDesdeCarga) : null,
    gastadoMesUsd: Number(d.gastado_mes_usd ?? 0),
    gastadoTotalUsd: Number(d.gastado_total_usd ?? 0),
    gastadoMesRealUsd: real,
    solicitudesMes: Number(d.solicitudes_mes ?? 0),
    erroresMes: Number(d.errores_mes ?? 0),
    usuariosMes: Number(d.usuarios_mes ?? 0),
    sinCreditos:
      typeof ultimoError?.error === "string" &&
      ultimoError.error.includes("insufficient_quota") &&
      Date.now() - new Date(ultimoError.fecha).getTime() < 86_400_000,
    ultimoError,
    cargas: ((d.cargas ?? []) as any[]).map((c) => ({
      id: Number(c.id),
      montoUsd: Number(c.monto_usd),
      fecha: c.fecha,
      nota: c.nota ?? null,
      adminEmail: c.admin_email,
    })),
    error: resumen.error ? resumen.error.message : null,
  }
}
