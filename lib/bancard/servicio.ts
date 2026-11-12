import { after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { enviarAlertaPago, type TipoAlertaPago } from "@/lib/notificaciones/alertas-pagos"
import { esAdmin } from "@/lib/admin/config"
import {
  BANCARD_HOSTS,
  emailsDePrueba,
  entornoDesde,
  formatearMonto,
  tokenGetConfirmation,
  tokenRollback,
  tokenSingleBuy,
  type ConfirmacionNormalizada,
  type EntornoBancard,
  type OperacionConfirmada,
} from "@/lib/bancard/core"

/** Solo servidor: usa la clave privada y el service role. */

const TIMEOUT_MS = 15_000

export interface ConfigBancard {
  configurado: boolean
  entorno: EntornoBancard
  baseUrl: string
  scriptUrl: string
  publicKey: string
  privateKey: string
  appUrl: string | null
}

export function getConfigBancard(): ConfigBancard {
  const entorno = entornoDesde(process.env.BANCARD_ENV)
  const baseUrl = BANCARD_HOSTS[entorno]
  const publicKey = process.env.BANCARD_PUBLIC_KEY?.trim() ?? ""
  const privateKey = process.env.BANCARD_PRIVATE_KEY?.trim() ?? ""
  const appUrl = urlApp()
  return {
    configurado: Boolean(publicKey && privateKey && appUrl),
    entorno,
    baseUrl,
    scriptUrl: `${baseUrl}/checkout/javascript/dist/bancard-checkout-4.0.0.js`,
    publicKey,
    privateKey,
    appUrl,
  }
}

function urlApp(): string | null {
  const explicita = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicita) return explicita.replace(/\/+$/, "")
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return null
}

/**
 * En staging solo pueden pagar (y activar planes) los administradores y los
 * emails listados en BANCARD_TEST_EMAILS. En producción, cualquiera.
 */
export function puedeUsarEntorno(entorno: EntornoBancard, email: string | null | undefined): boolean {
  if (entorno === "production") return true
  const e = (email ?? "").toLowerCase()
  return esAdmin(e) || emailsDePrueba(process.env.BANCARD_TEST_EMAILS).includes(e)
}

type MensajeBancard = { key?: string; level?: string; dsc?: string }
type RespuestaBancard = { status?: string; process_id?: string; messages?: MensajeBancard[]; confirmation?: OperacionConfirmada }

async function llamar(cfg: ConfigBancard, ruta: string, operation: Record<string, unknown>, metodo = "POST") {
  try {
    const res = await fetch(`${cfg.baseUrl}${ruta}`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: cfg.publicKey, operation }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as RespuestaBancard
    return { httpOk: res.ok, json }
  } catch (e) {
    return { httpOk: false, json: { status: "error", messages: [{ key: "NetworkError", dsc: (e as Error).message }] } as RespuestaBancard }
  }
}

const claves = (r: RespuestaBancard) => (r.messages ?? []).map((m) => m.key ?? "").filter(Boolean)

export async function iniciarSingleBuy(
  cfg: ConfigBancard,
  datos: { shopProcessId: number; monto: number; descripcion: string; returnUrl: string; cancelUrl: string },
) {
  const amount = formatearMonto(datos.monto)
  const { json } = await llamar(cfg, "/vpos/api/0.3/single_buy", {
    token: tokenSingleBuy(cfg.privateKey, datos.shopProcessId, amount),
    shop_process_id: datos.shopProcessId,
    amount,
    currency: "PYG",
    additional_data: "",
    description: datos.descripcion.slice(0, 20),
    return_url: datos.returnUrl,
    cancel_url: datos.cancelUrl,
  })
  if (json.status === "success" && json.process_id) return { ok: true as const, processId: json.process_id }
  return { ok: false as const, errores: claves(json) }
}

export async function consultarConfirmacion(cfg: ConfigBancard, shopProcessId: number) {
  const { json } = await llamar(cfg, "/vpos/api/0.3/single_buy/confirmations", {
    token: tokenGetConfirmation(cfg.privateKey, shopProcessId),
    shop_process_id: shopProcessId,
  })
  if (json.status === "success" && json.confirmation) return { ok: true as const, confirmation: json.confirmation }
  return { ok: false as const, errores: claves(json) }
}

export async function revertirEnBancard(cfg: ConfigBancard, shopProcessId: number) {
  const { json } = await llamar(
    cfg,
    "/vpos/api/0.3/single_buy/rollback",
    { token: tokenRollback(cfg.privateKey, shopProcessId), shop_process_id: shopProcessId },
    "POST",
  )
  const errores = claves(json)
  // Si ya estaba revertido o nunca se pagó, el resultado final es el mismo.
  const ok = json.status === "success" || errores.some((k) => k === "AlreadyRollbackedError" || k === "PaymentNotFoundError")
  return { ok, errores }
}

export async function registrarEvento(evento: {
  pagoId?: string | null
  shopProcessId?: number | null
  entorno: EntornoBancard
  tipo: string
  firmaValida?: boolean | null
  resultado: string
  detalle?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  await admin.from("pagos_eventos").insert({
    pago_id: evento.pagoId ?? null,
    shop_process_id: evento.shopProcessId ?? null,
    proveedor: "bancard",
    entorno: evento.entorno,
    tipo: evento.tipo,
    firma_valida: evento.firmaValida ?? null,
    resultado: evento.resultado,
    detalle: evento.detalle ?? {},
  })
}

/** Datos sin información sensible para la bitácora (nunca guarda tokens). */
function detalleSeguro(conf: ConfirmacionNormalizada) {
  return {
    response_code: conf.responseCode,
    response_description: conf.responseDescription,
    authorization_number: conf.authorizationNumber,
    ticket_number: conf.ticketNumber,
    amount: conf.montoTexto,
    currency: conf.moneda,
  }
}

/**
 * Aplica una confirmación ya validada (firma correcta o consultada a Bancard).
 * La activación es atómica e idempotente en la base de datos.
 */
export async function aplicarConfirmacion(cfg: ConfigBancard, conf: ConfirmacionNormalizada, origen: "webhook" | "consulta") {
  const admin = createAdminClient()

  const { data: pago } = await admin
    .from("pagos")
    .select("id, user_id, entorno")
    .eq("shop_process_id", conf.shopProcessId)
    .eq("proveedor", "bancard")
    .maybeSingle()

  let activacionPermitida = cfg.entorno === "production"
  if (pago && !activacionPermitida) {
    const { data } = await admin.auth.admin.getUserById(pago.user_id)
    activacionPermitida = puedeUsarEntorno(cfg.entorno, data.user?.email)
  }

  const { data, error } = await admin.rpc("bancard_aplicar_confirmacion", {
    p_shop_process_id: conf.shopProcessId,
    p_aprobado: conf.aprobado,
    p_monto: conf.monto,
    p_moneda: conf.moneda,
    p_entorno: cfg.entorno,
    p_activacion_permitida: activacionPermitida,
    p_response_code: conf.responseCode,
    p_response_description: conf.responseDescription,
    p_authorization_number: conf.authorizationNumber,
    p_ticket_number: conf.ticketNumber,
    p_origen: origen,
    p_detalle: detalleSeguro(conf),
  })

  if (error) throw new Error(`No se pudo aplicar la confirmación: ${error.message}`)
  const res = data as { resultado: string; vence_nuevo?: string }

  const tipo = TIPO_ALERTA[res.resultado]
  if (tipo) {
    after(async () => {
      const { data: p } = await admin
        .from("pagos")
        .select("user_id, plan_id, monto, entorno")
        .eq("shop_process_id", conf.shopProcessId)
        .eq("proveedor", "bancard")
        .maybeSingle()
      const usuario = p ? (await admin.auth.admin.getUserById(p.user_id)).data.user?.email : null
      await enviarAlertaPago({
        tipo,
        entorno: p?.entorno ?? cfg.entorno,
        shopProcessId: conf.shopProcessId,
        planId: p?.plan_id,
        monto: p?.monto ?? conf.monto,
        usuarioEmail: usuario,
        venceNuevo: res.vence_nuevo ?? null,
        detalle: [conf.responseCode, conf.responseDescription].filter(Boolean).join(" - ") || null,
      })
    })
  }
  return res
}

const TIPO_ALERTA: Record<string, TipoAlertaPago | undefined> = {
  activado: "aprobado",
  rechazado: "rechazado",
  bloqueado: "bloqueado",
  inconsistente: "inconsistente",
}
