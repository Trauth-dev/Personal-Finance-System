/**
 * Lectura canónica de saldos de deuda. Tarjetas: saldo_utilizado (deuda real).
 * Préstamos: monto_total - monto_pagado (capital/saldo contractual pendiente).
 * monto_total de tarjetas es legacy y NO debe usarse.
 */
export interface DeudaSaldoFields {
  tipo_deuda: string
  monto_total: number | string | null
  monto_pagado?: number | string | null
  saldo_utilizado?: number | string | null
  limite_credito?: number | string | null
}

const n = (v: unknown) => Number(v ?? 0) || 0

export const esTarjeta = (d: { tipo_deuda: string }) => d.tipo_deuda === "tarjeta_credito"

export function saldoPendienteDeuda(d: DeudaSaldoFields): number {
  if (esTarjeta(d)) return Math.max(0, n(d.saldo_utilizado))
  return Math.max(0, n(d.monto_total) - n(d.monto_pagado))
}

/** Crédito disponible de una tarjeta; null si no tiene límite cargado. */
export function disponibleTarjeta(d: DeudaSaldoFields): number | null {
  const limite = n(d.limite_credito)
  if (limite <= 0) return null
  return Math.max(0, limite - n(d.saldo_utilizado))
}

/**
 * Gasto económico de un egreso. Pagos de deuda: solo interés + cargos informados
 * (el capital no es gasto). Ajustes y transferencias: 0.
 */
export function gastoEconomicoEgreso(e: {
  naturaleza?: string | null
  monto: number | string
  interes_aplicado?: number | string | null
  cargos_aplicados?: number | string | null
}): number {
  const nat = e.naturaleza || "gasto"
  if (nat === "gasto" || nat === "cargo_financiero") return n(e.monto)
  if (nat === "pago_deuda") return n(e.interes_aplicado) + n(e.cargos_aplicados)
  return 0
}

export const NATURALEZA_LABEL: Record<string, string> = {
  gasto: "Gasto",
  pago_deuda: "Pago de deuda",
  cargo_financiero: "Cargo financiero",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
}
