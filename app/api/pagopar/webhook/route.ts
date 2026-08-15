import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verificarTokenWebhook, consultarPedido } from "@/lib/pagopar"

/**
 * Webhook de PagoPar. PagoPar hace un POST a esta URL cuando cambia el estado de
 * un pedido. Validamos el token (SHA-1 de privateToken + hash_pedido) y, si el
 * pedido está pagado, actualizamos el plan del usuario.
 *
 * URL a configurar en PagoPar (panel del comercio):
 *   https://<tu-dominio>/api/pagopar/webhook
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      resultado?: Array<{ hash_pedido?: string; token?: string; pagado?: boolean }>
    }

    const item = payload?.resultado?.[0]
    const hashPedido = item?.hash_pedido
    const token = item?.token

    if (!hashPedido || !token) {
      return NextResponse.json({ respuesta: false, resultado: "Sin datos" }, { status: 400 })
    }

    // 1) Validar autenticidad del webhook.
    if (!verificarTokenWebhook(hashPedido, token)) {
      return NextResponse.json({ respuesta: false, resultado: "Token inválido" }, { status: 401 })
    }

    const admin = createAdminClient()

    // 2) Buscar el pago pendiente por hash.
    const { data: pago } = await admin
      .from("pagos")
      .select("id, user_id, plan_id, estado")
      .eq("hash_pedido", hashPedido)
      .maybeSingle()

    if (!pago) {
      return NextResponse.json({ respuesta: false, resultado: "Pedido no encontrado" }, { status: 404 })
    }

    // 3) Confirmar el estado REAL consultando a PagoPar (no confiar solo en el payload).
    const estado = await consultarPedido(hashPedido)
    const pagado = estado?.pagado ?? Boolean(item?.pagado)

    if (pagado && pago.estado !== "pagado") {
      // 4) Activar el plan comprado.
      await admin
        .from("profiles")
        .update({ plan_tier: pago.plan_id })
        .eq("id", pago.user_id)

      // Asegurar acceso personal activo (todos los planes incluyen lo personal).
      await admin
        .from("user_plan_access")
        .upsert(
          { user_id: pago.user_id, plan_type: "personal", is_active: true, granted_by: "pagopar" },
          { onConflict: "user_id,plan_type" },
        )

      // 5) Marcar el pago como pagado (conciliación).
      await admin
        .from("pagos")
        .update({
          estado: "pagado",
          forma_pago: estado?.formaPago ?? null,
          fecha_pago: estado?.fechaPago ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pago.id)
    }

    // PagoPar espera una respuesta con el hash para confirmar la recepción.
    return NextResponse.json({
      respuesta: true,
      resultado: [{ hash_pedido: hashPedido, estado: pagado ? "pagado" : "pendiente" }],
    })
  } catch {
    return NextResponse.json({ respuesta: false, resultado: "Error" }, { status: 400 })
  }
}
