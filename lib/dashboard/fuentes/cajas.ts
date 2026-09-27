/**
 * FUENTE PROVISIONAL — CAJAS DE AHORRO
 *
 * INTEGRACIÓN PENDIENTE: cuando se cierre el nuevo módulo Cajas de Ahorro
 * (saldos reconciliados con su libro de movimientos), reemplazar esta fuente
 * para "Disponible Hoy" y el selector "Cuentas y cajas". Hoy se usa
 * `cajas_ahorro.monto_actual` tal cual; el Dashboard no calcula saldos propios.
 *
 * Las tarjetas de crédito viven en `deudas`, por lo que su límite o crédito
 * disponible nunca entra acá como dinero propio.
 */

export interface Cuenta {
  id: string
  nombre: string
  banco: string | null
  saldo: number
  moneda: string
}

export interface SaldoPorMoneda {
  moneda: string
  total: number
}

/**
 * Agrupa por moneda: nunca suma Gs con USD. Sin una tasa de cambio confiable,
 * las monedas distintas se muestran por separado. La moneda principal va primero.
 */
export function disponibleHoy(cuentas: Cuenta[], cajaId: string | null, monedaPrincipal: string): SaldoPorMoneda[] {
  const seleccion = cajaId ? cuentas.filter((c) => c.id === cajaId) : cuentas
  const porMoneda = new Map<string, number>()
  for (const cuenta of seleccion) {
    porMoneda.set(cuenta.moneda, (porMoneda.get(cuenta.moneda) ?? 0) + cuenta.saldo)
  }
  if (porMoneda.size === 0) porMoneda.set(monedaPrincipal, 0)
  return Array.from(porMoneda, ([moneda, total]) => ({ moneda, total })).sort((a, b) =>
    a.moneda === monedaPrincipal ? -1 : b.moneda === monedaPrincipal ? 1 : a.moneda.localeCompare(b.moneda),
  )
}
