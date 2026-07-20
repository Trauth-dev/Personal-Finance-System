import { NextResponse } from "next/server"

/**
 * ============================================================================
 * PAGOPAR - Punto de integracion (PENDIENTE de credenciales/API)
 * ============================================================================
 *
 * Este endpoint es un ANDAMIO preparado para cuando PagoPar entregue las
 * credenciales. Hoy NO esta activo: si no estan las variables de entorno,
 * responde 501 (no configurado). El boton del frontend todavia no lo llama.
 *
 * PASOS PARA ACTIVARLO (cuando tengas la API de PagoPar):
 *
 * 1) Cargar las credenciales como variables de entorno del proyecto:
 *      - PAGOPAR_PUBLIC_TOKEN
 *      - PAGOPAR_PRIVATE_TOKEN
 *
 * 2) PagoPar firma los pedidos con un hash SHA1 de:
 *      sha1(PAGOPAR_PRIVATE_TOKEN + id_pedido_comercio + monto_total)
 *    (Confirmar el formato exacto en la documentacion oficial que te entreguen.)
 *
 * 3) Reemplazar el bloque marcado "TODO PAGOPAR" por la llamada real al API de
 *    PagoPar (endpoint de "iniciar transaccion / comercios/pedido"), enviando:
 *      token_publico, comprador, monto_total, tipo_pedido, compras_items, etc.
 *    PagoPar devuelve un identificador con el que se arma la URL de pago:
 *      https://www.pagopar.com/pagos/<hash_pedido>
 *
 * 4) Devolver esa URL como { checkoutUrl } y en el frontend hacer:
 *      window.location.href = checkoutUrl
 *
 * 5) Crear un webhook (ej. app/api/pagopar/webhook/route.ts) para recibir la
 *    confirmacion de pago y, al confirmarse, actualizar en la tabla `profiles`
 *    el campo `plan_tier` del usuario a 'completo' (o el plan comprado).
 *
 * 6) (Opcional) Guardar cada intento/resultado de pago en una tabla `pagos`
 *    para tener historial y conciliacion.
 * ============================================================================
 */

// Precios de referencia (en guaranies). Fuente de verdad del monto en el server.
const PRECIOS: Record<string, number> = {
  basico: 89000,
  completo: 150000,
}

export async function POST(request: Request) {
  try {
    const { planId } = (await request.json()) as { planId?: string }

    if (!planId || !(planId in PRECIOS)) {
      return NextResponse.json({ error: "Plan invalido" }, { status: 400 })
    }

    const publicToken = process.env.PAGOPAR_PUBLIC_TOKEN
    const privateToken = process.env.PAGOPAR_PRIVATE_TOKEN

    // Mientras no existan las credenciales, el endpoint queda deshabilitado.
    if (!publicToken || !privateToken) {
      return NextResponse.json(
        {
          error: "pagopar_no_configurado",
          message:
            "La integracion con PagoPar aun no esta configurada. Falta cargar PAGOPAR_PUBLIC_TOKEN y PAGOPAR_PRIVATE_TOKEN.",
        },
        { status: 501 },
      )
    }

    const monto = PRECIOS[planId]

    // ========================= TODO PAGOPAR =========================
    // Aqui va la llamada real al API de PagoPar para crear el pedido y
    // obtener la URL de pago. Ejemplo (pseudocodigo):
    //
    //   const idPedido = crypto.randomUUID()
    //   const token = sha1(privateToken + idPedido + String(monto))
    //   const resp = await fetch("https://api.pagopar.com/api/comercios/2.0/iniciar-transaccion", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ token, token_publico: publicToken, monto_total: monto, /* ... */ }),
    //   })
    //   const data = await resp.json()
    //   const checkoutUrl = `https://www.pagopar.com/pagos/${data.resultado[0].data}`
    //   return NextResponse.json({ checkoutUrl })
    // ================================================================

    return NextResponse.json(
      {
        error: "pagopar_pendiente",
        message: "Integracion de PagoPar pendiente de implementacion.",
        planId,
        monto,
      },
      { status: 501 },
    )
  } catch {
    return NextResponse.json({ error: "solicitud_invalida" }, { status: 400 })
  }
}
