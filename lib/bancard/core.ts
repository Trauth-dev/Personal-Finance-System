import { createHash, timingSafeEqual } from "node:crypto"

/**
 * Funciones puras de Bancard vPOS 2.0 (sin red ni base de datos), para que
 * puedan probarse de forma aislada. Especificación: firmas MD5 sobre la clave
 * privada concatenada con los datos de la operación.
 */

export type EntornoBancard = "staging" | "production"

export const BANCARD_HOSTS: Record<EntornoBancard, string> = {
  staging: "https://vpos.infonet.com.py:8888",
  production: "https://vpos.infonet.com.py",
}

export function entornoDesde(valor: string | undefined): EntornoBancard {
  return valor?.trim().toLowerCase() === "production" ? "production" : "staging"
}

/** Bancard exige el monto como string con 2 decimales, p. ej. "80000.00". */
export function formatearMonto(monto: number): string {
  if (!Number.isInteger(monto) || monto <= 0) throw new Error("Monto inválido")
  return monto.toFixed(2)
}

export function md5(texto: string): string {
  return createHash("md5").update(texto, "utf8").digest("hex")
}

export function tokenSingleBuy(privateKey: string, shopProcessId: number | string, monto: string, moneda = "PYG") {
  return md5(`${privateKey}${shopProcessId}${monto}${moneda}`)
}

export function tokenConfirmacion(privateKey: string, shopProcessId: number | string, monto: string, moneda = "PYG") {
  return md5(`${privateKey}${shopProcessId}confirm${monto}${moneda}`)
}

export function tokenGetConfirmation(privateKey: string, shopProcessId: number | string) {
  return md5(`${privateKey}${shopProcessId}get_confirmation`)
}

export function tokenRollback(privateKey: string, shopProcessId: number | string) {
  return md5(`${privateKey}${shopProcessId}rollback0.00`)
}

/** Comparación en tiempo constante para no filtrar información por timing. */
export function igualSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a.toLowerCase(), "utf8")
  const bb = Buffer.from(b.toLowerCase(), "utf8")
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export interface OperacionConfirmada {
  token?: unknown
  shop_process_id?: unknown
  response?: unknown
  response_details?: unknown
  amount?: unknown
  currency?: unknown
  authorization_number?: unknown
  ticket_number?: unknown
  response_code?: unknown
  response_description?: unknown
  extended_response_description?: unknown
}

export interface ConfirmacionNormalizada {
  shopProcessId: number
  montoTexto: string
  monto: number
  moneda: string
  aprobado: boolean
  responseCode: string | null
  responseDescription: string | null
  authorizationNumber: string | null
  ticketNumber: string | null
}

const texto = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v).slice(0, 255))

/** Valida la forma del payload de Bancard. Devuelve null si es inválido. */
export function normalizarConfirmacion(op: OperacionConfirmada | null | undefined): ConfirmacionNormalizada | null {
  if (!op || typeof op !== "object") return null
  const spid = Number(op.shop_process_id)
  const montoTexto = String(op.amount ?? "")
  const monto = Number(montoTexto)
  if (!Number.isSafeInteger(spid) || spid <= 0) return null
  if (!/^\d+(\.\d{1,2})?$/.test(montoTexto) || !Number.isFinite(monto)) return null

  const responseCode = texto(op.response_code)
  return {
    shopProcessId: spid,
    montoTexto,
    monto,
    moneda: String(op.currency ?? "").toUpperCase(),
    // Aprobado solo si Bancard responde "S" Y el código es "00".
    aprobado: String(op.response ?? "").toUpperCase() === "S" && responseCode === "00",
    responseCode,
    responseDescription: texto(op.response_description),
    authorizationNumber: texto(op.authorization_number),
    ticketNumber: texto(op.ticket_number),
  }
}

/** Verifica la firma de una confirmación recibida de Bancard. */
export function firmaConfirmacionValida(privateKey: string, op: OperacionConfirmada, conf: ConfirmacionNormalizada) {
  if (typeof op.token !== "string" || !op.token) return false
  return igualSeguro(op.token, tokenConfirmacion(privateKey, conf.shopProcessId, conf.montoTexto, conf.moneda))
}

export function emailsDePrueba(valor: string | undefined): string[] {
  return (valor ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
}
