import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { normalizarConfirmacion } from "@/lib/bancard/core"
import { aplicarConfirmacion, consultarConfirmacion, getConfigBancard, registrarEvento, revertirEnBancard } from "@/lib/bancard/servicio"

export const dynamic = "force-dynamic"

const ABANDONO_MS = 15 * 60 * 1000

/**
 * Estado de un pago del usuario. Si sigue pendiente, consulta a Bancard
 * (por si la confirmación no llegó) y concilia.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const spid = Number(url.searchParams.get("spid"))
  const cancelado = url.searchParams.get("cancelado") === "1"
  if (!Number.isSafeInteger(spid) || spid <= 0) return NextResponse.json({ error: "spid_invalido" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "no_autenticado" }, { status: 401 })

  const admin = createAdminClient()
  const leer = () =>
    admin
      .from("pagos")
      .select("id, estado, plan_id, monto, entorno, created_at, vence_nuevo, response_description")
      .eq("shop_process_id", spid)
      .eq("proveedor", "bancard")
      .eq("user_id", user.id)
      .maybeSingle()

  let { data: pago } = await leer()
  if (!pago) return NextResponse.json({ error: "no_encontrado" }, { status: 404 })

  const cfg = getConfigBancard()
  if (pago.estado === "pendiente" && cfg.configurado && pago.entorno === cfg.entorno) {
    const consulta = await consultarConfirmacion(cfg, spid)
    const conf = consulta.ok ? normalizarConfirmacion(consulta.confirmation) : null

    if (conf) {
      await aplicarConfirmacion(cfg, conf, "consulta")
    } else {
      const abandonado = Date.now() - new Date(pago.created_at).getTime() > ABANDONO_MS
      const sinPago = !consulta.ok && consulta.errores.includes("PaymentNotFoundError")
      if (sinPago && (cancelado || abandonado)) {
        // Bancard recomienda revertir los procesos cancelados o abandonados.
        await revertirEnBancard(cfg, spid)
        await admin.from("pagos").update({ estado: "cancelado", updated_at: new Date().toISOString() }).eq("id", pago.id).eq("estado", "pendiente")
        await registrarEvento({ pagoId: pago.id, shopProcessId: spid, entorno: cfg.entorno, tipo: "consulta", resultado: "cancelado" })
      }
    }
    pago = (await leer()).data ?? pago
  }

  return NextResponse.json({
    estado: pago.estado,
    planId: pago.plan_id,
    monto: pago.monto,
    entorno: pago.entorno,
    venceNuevo: pago.vence_nuevo,
  })
}
