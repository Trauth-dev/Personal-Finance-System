import { diasDelMes, diasEntre, desplazarMes, type DiaLocal } from "../fechas"
import { saldoPendienteDeuda } from "@/lib/finanzas/saldos"

/**
 * FUENTE PROVISIONAL — DEUDAS
 *
 * INTEGRACIÓN PENDIENTE: cuando se cierre el nuevo módulo Deudas (cronogramas
 * francés/alemán, capital vs. intereses, fecha de corte, pago mínimo, etc.),
 * reemplazar las funciones de este archivo por la fuente definitiva del módulo.
 * El Dashboard solo consume `calcularDeudaPendiente` y `proximosPagos`; no debe
 * crearse ninguna fórmula paralela.
 */

export interface Deuda {
  id: string
  nombre: string
  tipo: "prestamo" | "tarjeta_credito" | string
  estado: string | null
  /** Préstamo: monto total adeudado. Tarjeta: legacy, no usar. */
  montoTotal: number
  montoPagado: number
  limiteCredito: number
  /** Tarjeta: deuda real de la tarjeta. */
  saldoUtilizado: number
  montoCuota: number
  diaPago: number | null
}

/** Delegado en la lectura canónica de lib/finanzas/saldos. */
export function saldoPendiente(deuda: Deuda): number {
  return saldoPendienteDeuda({
    tipo_deuda: deuda.tipo,
    monto_total: deuda.montoTotal,
    monto_pagado: deuda.montoPagado,
    saldo_utilizado: deuda.saldoUtilizado,
  })
}

function estaActiva(deuda: Deuda): boolean {
  return deuda.estado !== "pagada"
}

export function calcularDeudaPendiente(deudas: Deuda[]): { total: number; activas: number } {
  let total = 0
  let activas = 0
  for (const deuda of deudas) {
    if (!estaActiva(deuda)) continue
    const saldo = saldoPendiente(deuda)
    if (saldo <= 0) continue
    total += saldo
    activas++
  }
  return { total, activas }
}

export interface ProximoPago {
  nombre: string
  dias: number
  monto: number
}

/** Vencimientos en los próximos días, omitiendo las deudas que ya tienen un pago este mes. */
export function proximosPagos(
  deudas: Deuda[],
  hoy: DiaLocal,
  deudasPagadasEsteMes: Set<string>,
  dentroDeDias = 7,
): ProximoPago[] {
  const pagos: ProximoPago[] = []
  for (const deuda of deudas) {
    if (!estaActiva(deuda) || !deuda.diaPago || deudasPagadasEsteMes.has(deuda.id)) continue

    const monto = deuda.tipo === "tarjeta_credito" ? saldoPendiente(deuda) : deuda.montoCuota || saldoPendiente(deuda)
    if (monto <= 0) continue

    let mes = { year: hoy.year, month: hoy.month }
    if (deuda.diaPago < hoy.day) mes = desplazarMes(mes, 1)
    const vencimiento = { ...mes, day: Math.min(deuda.diaPago, diasDelMes(mes)) }
    const dias = diasEntre(hoy, vencimiento)

    if (dias >= 0 && dias <= dentroDeDias) pagos.push({ nombre: deuda.nombre, dias, monto })
  }
  return pagos.sort((a, b) => a.dias - b.dias)
}
