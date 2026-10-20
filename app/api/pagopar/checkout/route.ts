import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPagoparCredentials, iniciarTransaccion } from "@/lib/pagopar"
import { PLANES, esPlanId } from "@/lib/plans/catalogo"

/**
 * Checkout de PagoPar. Crea un pedido en PagoPar y devuelve la URL de pago.
 *
 * IMPORTANTE: PagoPar liquida SIEMPRE en guaraníes (PYG). Los precios son la
 * fuente de verdad en el servidor y están en guaraníes, sin importar la moneda
 * en la que el usuario ve la app.
 */

export async function POST(request: Request) {
  try {
    // El cliente solo elige el plan; monto y nombre salen del catálogo server-side.
    const body = (await request.json().catch(() => ({}))) as { planId?: unknown }
    if (!esPlanId(body.planId)) {
      return NextResponse.json({ error: "plan_invalido" }, { status: 400 })
    }
    const plan = PLANES[body.planId]
    const planId = plan.id

    // La integración solo funciona con credenciales cargadas.
    if (!getPagoparCredentials().configured) {
      return NextResponse.json(
        {
          error: "pagopar_no_configurado",
          message:
            "La integración con PagoPar aún no está configurada. Falta cargar PAGOPAR_PUBLIC_TOKEN y PAGOPAR_PRIVATE_TOKEN.",
        },
        { status: 501 },
      )
    }

    // Usuario autenticado.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "no_autenticado" }, { status: 401 })
    }

    // Datos del comprador desde el perfil.
    const { data: perfil } = await supabase
      .from("profiles")
      .select("nombre_completo, email, telefono")
      .eq("id", user.id)
      .maybeSingle()

    const monto = plan.monto // SIEMPRE guaraníes
    const idPedidoComercio = `${planId}-${user.id.slice(0, 8)}-${Date.now()}`

    // Registrar el pago pendiente (para conciliación y para el webhook).
    const admin = createAdminClient()
    const { error: insertError } = await admin.from("pagos").insert({
      user_id: user.id,
      id_pedido_comercio: idPedidoComercio,
      plan_id: planId,
      monto,
      moneda: "PYG",
      estado: "pendiente",
    })
    if (insertError) {
      return NextResponse.json({ error: "error_registrando_pago" }, { status: 500 })
    }

    // Iniciar transacción en PagoPar.
    const telefono = (perfil?.telefono || "").replace(/\D/g, "").slice(-9) || "0000000"
    const result = await iniciarTransaccion({
      idPedidoComercio,
      montoTotal: monto,
      descripcion: `Suscripción mensual ${plan.nombre}`,
      comprador: {
        nombre: perfil?.nombre_completo || user.email?.split("@")[0] || "Usuario",
        email: perfil?.email || user.email || "sincorreo@prospera.app",
        telefono,
        documento: "0", // PagoPar solicitará/validará el documento en su pantalla
      },
      items: [
        {
          nombre: plan.nombre,
          cantidad: 1,
          precio_total: monto,
          descripcion: `Suscripción mensual ${plan.nombre}`,
        },
      ],
    })

    if (!result.ok || !result.checkoutUrl) {
      // Marcar el pago como fallido para conciliación.
      await admin.from("pagos").update({ estado: "error", updated_at: new Date().toISOString() }).eq(
        "id_pedido_comercio",
        idPedidoComercio,
      )
      return NextResponse.json({ error: result.error || "pagopar_error" }, { status: 502 })
    }

    // Guardar el hash del pedido para poder conciliar en el webhook.
    await admin
      .from("pagos")
      .update({ hash_pedido: result.hashPedido, updated_at: new Date().toISOString() })
      .eq("id_pedido_comercio", idPedidoComercio)

    return NextResponse.json({ checkoutUrl: result.checkoutUrl })
  } catch {
    return NextResponse.json({ error: "solicitud_invalida" }, { status: 400 })
  }
}
