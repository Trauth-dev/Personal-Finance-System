import { createClient } from "@/lib/supabase/client"

export type EstadoPago = "pagado" | "pendiente"
export type DestinoCompra = "producto" | "materia" | "otro"

export interface VentaInput {
  id?: string | null
  perfilId: string
  productoId: string
  cantidad: number
  precioUnitario: number
  fecha: string
  estadoPago: EstadoPago
  fechaVencimiento?: string | null
  clienteId?: string | null
  clienteNombre?: string | null
  notas?: string | null
}

export interface CompraInput {
  id?: string | null
  perfilId: string
  destino: DestinoCompra
  itemId?: string | null
  itemNombre?: string | null
  proveedorId?: string | null
  cantidad: number
  costoUnitario: number
  fecha: string
  estadoPago: EstadoPago
  fechaVencimiento?: string | null
  notas?: string | null
}

async function ejecutar<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message || "No se pudo completar la operación")
  return data as T
}

/**
 * Registra o edita una venta en una sola transacción: descuenta stock,
 * genera el ingreso si fue cobrada y deja la cuenta por cobrar si queda pendiente.
 */
export function guardarVenta(v: VentaInput) {
  return ejecutar<string>("emp_guardar_venta", {
    p_id: v.id ?? null,
    p_perfil_id: v.perfilId,
    p_producto_id: v.productoId,
    p_cantidad: v.cantidad,
    p_precio_unitario: v.precioUnitario,
    p_fecha: v.fecha,
    p_estado_pago: v.estadoPago,
    p_fecha_vencimiento: v.estadoPago === "pendiente" ? v.fechaVencimiento || null : null,
    p_cliente_id: v.clienteId || null,
    p_cliente_nombre: v.clienteNombre || null,
    p_notas: v.notas || null,
  })
}

export function eliminarVenta(id: string) {
  return ejecutar<void>("emp_eliminar_venta", { p_id: id })
}

/**
 * Registra o edita una compra en una sola transacción: suma stock al producto o
 * materia prima, genera el egreso si fue pagada y deja la cuenta por pagar si queda pendiente.
 */
export function guardarCompra(c: CompraInput) {
  return ejecutar<string>("emp_guardar_compra", {
    p_id: c.id ?? null,
    p_perfil_id: c.perfilId,
    p_destino: c.destino,
    p_item_id: c.destino === "otro" ? null : c.itemId || null,
    p_item_nombre: c.itemNombre || null,
    p_proveedor_id: c.proveedorId || null,
    p_cantidad: c.cantidad,
    p_costo_unitario: c.costoUnitario,
    p_fecha: c.fecha,
    p_estado_pago: c.estadoPago,
    p_fecha_vencimiento: c.estadoPago === "pendiente" ? c.fechaVencimiento || null : null,
    p_notas: c.notas || null,
  })
}

export function eliminarCompra(id: string) {
  return ejecutar<void>("emp_eliminar_compra", { p_id: id })
}

/** Cobra una venta pendiente o paga una compra pendiente y lo registra en caja. */
export function registrarPago(tipo: "venta" | "compra", id: string, fecha: string) {
  return ejecutar<void>("emp_registrar_pago", { p_tipo: tipo, p_id: id, p_fecha: fecha })
}

export function mensajeError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}
