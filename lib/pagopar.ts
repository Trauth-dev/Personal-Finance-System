import crypto from "crypto"

/**
 * ============================================================================
 * PagoPar - Cliente de servidor
 * ============================================================================
 * Encapsula la firma de tokens SHA-1 y las llamadas al API de PagoPar.
 * PagoPar liquida SIEMPRE en guaraníes (PYG); por eso todos los montos que
 * pasan por aquí son enteros en guaraníes.
 *
 * Requiere las variables de entorno:
 *   - PAGOPAR_PUBLIC_TOKEN   (clave pública / token público del comercio)
 *   - PAGOPAR_PRIVATE_TOKEN  (clave privada del comercio)
 * ============================================================================
 */

const API_BASE = "https://api.pagopar.com/api"
export const PAGOPAR_CHECKOUT_BASE = "https://www.pagopar.com/pagos"

export function getPagoparCredentials() {
  const publicToken = process.env.PAGOPAR_PUBLIC_TOKEN
  const privateToken = process.env.PAGOPAR_PRIVATE_TOKEN
  return { publicToken, privateToken, configured: Boolean(publicToken && privateToken) }
}

/** Firma SHA-1 de: privateToken + sufijo (según el tipo de operación). */
export function sha1Token(privateToken: string, suffix: string): string {
  return crypto
    .createHash("sha1")
    .update(privateToken + suffix)
    .digest("hex")
}

export interface CompradorPagopar {
  nombre: string
  email: string
  telefono: string
  documento: string
  tipo_documento?: string
  ruc?: string
  razon_social?: string
  direccion?: string
  ciudad?: string
}

export interface ItemPagopar {
  nombre: string
  cantidad: number
  precio_total: number // guaraníes, entero
  ciudad_id?: number
  categoria?: number
  descripcion?: string
}

export interface IniciarTransaccionInput {
  idPedidoComercio: string
  montoTotal: number // guaraníes, entero
  descripcion: string
  comprador: CompradorPagopar
  items: ItemPagopar[]
  /** Fecha máxima de pago (Y-m-d H:i:s). Por defecto, +2 días. */
  fechaMaximaPago?: string
}

function fechaMaximaPorDefecto(): string {
  const d = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`
}

export interface IniciarTransaccionResult {
  ok: boolean
  hashPedido?: string
  checkoutUrl?: string
  error?: string
  raw?: unknown
}

/** Inicia una transacción en PagoPar y devuelve la URL de checkout. */
export async function iniciarTransaccion(input: IniciarTransaccionInput): Promise<IniciarTransaccionResult> {
  const { publicToken, privateToken, configured } = getPagoparCredentials()
  if (!configured) {
    return { ok: false, error: "pagopar_no_configurado" }
  }

  const token = sha1Token(privateToken!, "VENTA-COMERCIO")

  const body = {
    token,
    token_publico: publicToken,
    public_key: publicToken,
    tipo_pedido: "VENTA-COMERCIO",
    monto_total: input.montoTotal,
    id_pedido_comercio: input.idPedidoComercio,
    fecha_maxima_pago: input.fechaMaximaPago ?? fechaMaximaPorDefecto(),
    descripcion_resumen: input.descripcion,
    comprador: {
      ruc: input.comprador.ruc ?? "",
      email: input.comprador.email,
      ciudad: input.comprador.ciudad ?? "1",
      nombre: input.comprador.nombre,
      telefono: input.comprador.telefono,
      documento: input.comprador.documento,
      direccion: input.comprador.direccion ?? "",
      razon_social: input.comprador.razon_social ?? input.comprador.nombre,
      tipo_documento: input.comprador.tipo_documento ?? "CI",
      coordenadas: "",
    },
    compras_items: input.items.map((it, idx) => ({
      ciudad_id: it.ciudad_id ?? 1,
      nombre: it.nombre,
      cantidad: it.cantidad,
      categoria: it.categoria ?? 909,
      public_key: publicToken,
      url_imagen: "",
      descripcion: it.descripcion ?? it.nombre,
      precio_total: it.precio_total,
      vendedor_telefono: "",
      vendedor_direccion: "",
      vendedor_direccion_referencia: "",
      vendedor_direccion_coordenadas: "",
      id_producto: idx + 1,
    })),
  }

  try {
    const resp = await fetch(`${API_BASE}/comercios/1.1/iniciar-transaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = (await resp.json()) as {
      respuesta?: boolean
      resultado?: Array<{ data?: string; pedido?: string }>
    }

    if (!data?.respuesta || !data.resultado?.[0]?.data) {
      return { ok: false, error: "pagopar_rechazo", raw: data }
    }

    const hashPedido = data.resultado[0].data
    return {
      ok: true,
      hashPedido,
      checkoutUrl: `${PAGOPAR_CHECKOUT_BASE}/${hashPedido}`,
      raw: data,
    }
  } catch (e) {
    return { ok: false, error: "pagopar_error_red", raw: String(e) }
  }
}

export interface EstadoPedido {
  pagado: boolean
  formaPago?: string
  fechaPago?: string | null
  monto?: string
  raw?: unknown
}

/** Consulta el estado de un pedido por su hash. */
export async function consultarPedido(hashPedido: string): Promise<EstadoPedido | null> {
  const { publicToken, privateToken, configured } = getPagoparCredentials()
  if (!configured) return null

  const token = sha1Token(privateToken!, "CONSULTA")
  try {
    const resp = await fetch(`${API_BASE}/pedidos/1.1/traer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash_pedido: hashPedido, token, token_publico: publicToken }),
    })
    const data = (await resp.json()) as {
      respuesta?: boolean
      resultado?: Array<{ pagado?: boolean; forma_pago?: string; fecha_pago?: string | null; monto?: string }>
    }
    const r = data?.resultado?.[0]
    if (!r) return null
    return {
      pagado: Boolean(r.pagado),
      formaPago: r.forma_pago,
      fechaPago: r.fecha_pago ?? null,
      monto: r.monto,
      raw: data,
    }
  } catch {
    return null
  }
}

/**
 * Verifica el token que PagoPar envía en el webhook. El token del webhook es
 * SHA-1 de: privateToken + hash_pedido.
 */
export function verificarTokenWebhook(hashPedido: string, token: string): boolean {
  const { privateToken, configured } = getPagoparCredentials()
  if (!configured) return false
  const esperado = sha1Token(privateToken!, hashPedido)
  return esperado === token
}
