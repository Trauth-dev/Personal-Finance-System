import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

/**
 * Baja de la suscripción al estilo "cancelar renovación": el usuario conserva
 * el acceso hasta suscripcion_vence y no se le pide renovar. "reactivar" la revierte.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { accion?: unknown }
  if (body.accion !== "cancelar" && body.accion !== "reactivar") {
    return NextResponse.json({ error: "accion_invalida" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "no_autenticado" }, { status: 401 })

  const admin = createAdminClient()
  const { data: perfil } = await admin.from("profiles").select("suscripcion_vence").eq("id", user.id).maybeSingle()
  const vigente = perfil?.suscripcion_vence && new Date(perfil.suscripcion_vence).getTime() > Date.now()
  if (!vigente) {
    return NextResponse.json(
      { error: "sin_plan_pago", message: "No tenés un plan pago vigente para dar de baja." },
      { status: 409 },
    )
  }

  const cancelar = body.accion === "cancelar"
  const { error } = await admin
    .from("profiles")
    .update({ renovacion_cancelada: cancelar, renovacion_cancelada_at: cancelar ? new Date().toISOString() : null })
    .eq("id", user.id)
  if (error) {
    console.error("[suscripcion] baja fallida:", error.message)
    return NextResponse.json({ error: "error_interno", message: "No pudimos guardar el cambio. Probá de nuevo." }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cancelada: cancelar, vence: perfil.suscripcion_vence })
}
