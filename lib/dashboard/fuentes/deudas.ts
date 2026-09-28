import { diasDelMes, diasEntre, desplazarMes, type DiaLocal } from "../fechas"

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
  /** Préstamo: monto total adeudado. Tarjeta: crédito disponible. */
  montoTotal: number
  montoPagado: number
  limiteCredito: number
  montoCuota: number
  diaPago: number | null
}

/**
 * Préstamo: lo que falta pagar (total - pagado).
 * Tarjeta: saldo utilizado (límite - disponible). El límite nunca es deuda.
 */
export function saldoPendiente(deuda: Deuda): number {
  if (deuda.tipo === "tarjeta_credito") {
    return Math.max(0, deuda.limiteCredito - deuda.montoTotal)
  }
  return Math.max(0, deuda.montoTotal - deuda.montoPagado)
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
