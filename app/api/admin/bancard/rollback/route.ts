import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { obtenerAdmin } from "@/lib/admin/auth"
import { getConfigBancard, revertirEnBancard } from "@/lib/bancard/servicio"

export const dynamic = "force-dynamic"

/**
 * Revierte un pago de PRUEBA (staging). En producción los reversos se hacen
 * desde el portal de Bancard, para evitar devoluciones accidentales.
 */
export async function POST(request: Request) {
  const { usuario: adminSesion } = await obtenerAdmin()
  if (!adminSesion) return NextResponse.json({ error: "no_autorizado" }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as { shopProcessId?: unknown }
  const spid = Number(body.shopProcessId)
  if (!Number.isSafeInteger(spid) || spid <= 0) return NextResponse.json({ error: "spid_invalido" }, { status: 400 })

  const cfg = getConfigBancard()
  if (!cfg.configurado || cfg.entorno !== "staging") {
    return NextResponse.json({ error: "solo_staging", message: "Los reversos reales se hacen desde el portal de Bancard." }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: pago } = await admin
    .from("pagos")
    .select("id, user_id, entorno, estado")
    .eq("shop_process_id", spid)
    .eq("proveedor", "bancard")
    .maybeSingle()
  if (!pago || pago.entorno !== "staging") return NextResponse.json({ error: "no_encontrado" }, { status: 404 })

  const r = await revertirEnBancard(cfg, spid)
  if (!r.ok) {
    return NextResponse.json({ error: "bancard_error", message: `Bancard rechazó el reverso: ${r.errores.join(", ") || "sin detalle"}` }, { status: 502 })
  }

  const { data: res, error } = await admin.rpc("bancard_marcar_revertido", { p_shop_process_id: spid, p_detalle: { admin: adminSesion.email } })
  if (error) return NextResponse.json({ error: "error_interno" }, { status: 500 })

  const { data: u } = await admin.auth.admin.getUserById(pago.user_id)
  await admin.from("admin_auditoria").insert({
    admin_id: adminSesion.id,
    admin_email: adminSesion.email,
    usuario_id: pago.user_id,
    usuario_email: u.user?.email ?? "",
    accion: "bancard_rollback",
    detalle: { shop_process_id: spid, estado_anterior: pago.estado },
  })

  return NextResponse.json({ ok: true, resultado: res })
}
