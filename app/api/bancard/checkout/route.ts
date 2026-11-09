import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { PLANES, esPlanId } from "@/lib/plans/catalogo"
import { getConfigBancard, iniciarSingleBuy, puedeUsarEntorno, registrarEvento } from "@/lib/bancard/servicio"

export const dynamic = "force-dynamic"

/**
 * Inicia una compra simple en Bancard. El cliente solo envía el plan: monto,
 * moneda y descripción salen del catálogo del servidor.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { planId?: unknown }
  if (!esPlanId(body.planId)) return NextResponse.json({ error: "plan_invalido" }, { status: 400 })
  const plan = PLANES[body.planId]

  const cfg = getConfigBancard()
  if (!cfg.configurado) {
    return NextResponse.json(
      { error: "bancard_no_configurado", message: "Los pagos con Bancard todavía no están habilitados." },
      { status: 501 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "no_autenticado" }, { status: 401 })

  if (!puedeUsarEntorno(cfg.entorno, user.email)) {
    return NextResponse.json(
      { error: "solo_pruebas", message: "Los pagos están en modo de prueba y solo cuentas autorizadas pueden usarlos." },
      { status: 403 },
    )
  }

  const admin = createAdminClient()
  const { data: perfil } = await admin
    .from("profiles")
    .select("plan_tier, suscripcion_vence")
    .eq("id", user.id)
    .maybeSingle()
  const totalVigente =
    perfil?.plan_tier === "completo" && perfil.suscripcion_vence && new Date(perfil.suscripcion_vence).getTime() > Date.now()
  if (plan.id === "personal" && totalVigente) {
    return NextResponse.json(
      { error: "plan_superior_vigente", message: "Ya tenés el Plan Total vigente; incluye todo lo del Plan Personal." },
      { status: 409 },
    )
  }

  const { data: reservas, error: errReserva } = await admin.rpc("bancard_reservar_pago", {
    p_user_id: user.id,
    p_plan_id: plan.id,
    p_monto: plan.monto,
    p_entorno: cfg.entorno,
    p_ventana_min: 10,
  })
  const reserva = (reservas as { pago_id: string; shop_process_id: number; process_id: string | null; nuevo: boolean }[] | null)?.[0]
  if (errReserva || !reserva) {
    console.error("[bancard] reserva fallida:", errReserva?.message)
    return NextResponse.json({ error: "error_interno", message: "No pudimos iniciar el pago. Probá de nuevo." }, { status: 500 })
  }

  // Doble clic o recarga: reutilizamos el mismo proceso en lugar de crear otro cobro.
  if (reserva.process_id) {
    return NextResponse.json({ processId: reserva.process_id, scriptUrl: cfg.scriptUrl, shopProcessId: reserva.shop_process_id })
  }
  if (!reserva.nuevo) {
    return NextResponse.json({ error: "en_curso", message: "Ya hay un pago iniciándose. Esperá unos segundos." }, { status: 409 })
  }

  const resultado = `${cfg.appUrl}/dashboard/personal/mejorar-plan/resultado?spid=${reserva.shop_process_id}`
  const inicio = await iniciarSingleBuy(cfg, {
    shopProcessId: reserva.shop_process_id,
    monto: plan.monto,
    descripcion: `Prospera ${plan.id === "total" ? "Total" : "Personal"}`,
    returnUrl: resultado,
    cancelUrl: `${resultado}&cancelado=1`,
  })

  if (!inicio.ok) {
    await admin.from("pagos").update({ estado: "error", response_description: inicio.errores.join(",").slice(0, 255), updated_at: new Date().toISOString() }).eq("id", reserva.pago_id)
    await registrarEvento({ pagoId: reserva.pago_id, shopProcessId: reserva.shop_process_id, entorno: cfg.entorno, tipo: "single_buy", resultado: "error", detalle: { errores: inicio.errores } })
    return NextResponse.json({ error: "bancard_error", message: "Bancard no pudo iniciar el pago. Probá de nuevo en unos minutos." }, { status: 502 })
  }

  await admin.from("pagos").update({ process_id: inicio.processId, updated_at: new Date().toISOString() }).eq("id", reserva.pago_id)
  await registrarEvento({ pagoId: reserva.pago_id, shopProcessId: reserva.shop_process_id, entorno: cfg.entorno, tipo: "single_buy", resultado: "iniciado" })

  return NextResponse.json({ processId: inicio.processId, scriptUrl: cfg.scriptUrl, shopProcessId: reserva.shop_process_id })
}
