"use client"

import { createClient } from "@/lib/supabase/client"
import type { CuotaProgramada, FrecuenciaPago, MetodoAmortizacion, TasaTipo } from "./amortizacion"

/**
 * Capa financiera central. Toda operación que mueve dinero pasa por una RPC de
 * Postgres que aplica sus efectos (cuenta, tarjeta, préstamo, cuota, extracto)
 * en una sola transacción. Los componentes NUNCA deben actualizar saldos directo.
 */

export type OrigenTipo = "caja_ahorro" | "tarjeta_credito"

export class OperacionFinancieraError extends Error {}

function nuevaOperacionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16).padStart(12, "0")}-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`
}

function mensajeHumano(error: { message?: string; code?: string } | null): string {
  if (!error) return "Ocurrió un error inesperado."
  if (error.code === "P0001" || error.code === "42501" || error.code === "28000") return error.message || "Operación no permitida."
  if (error.message?.includes("Failed to fetch")) return "Sin conexión. Revisá tu internet e intentá de nuevo."
  return "No se pudo completar la operación. Intentá de nuevo."
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new OperacionFinancieraError(mensajeHumano(error))
  return data as T
}

// ---------- Gastos ----------
export interface GastoInput {
  perfilId: string
  monto: number
  fecha: string
  concepto?: string | null
  tipoCategoriaId?: string | null
  categoriaId?: string | null
  origenTipo?: OrigenTipo | null
  origenId?: string | null
  naturaleza?: "gasto" | "cargo_financiero"
  operacionId?: string
}

function gastoPayload(g: Omit<GastoInput, "perfilId" | "operacionId">) {
  return {
    monto: g.monto,
    fecha: g.fecha,
    concepto: g.concepto ?? "",
    tipo_categoria_id: g.tipoCategoriaId ?? "",
    categoria_id: g.categoriaId ?? "",
    origen_tipo: g.origenTipo ?? "",
    origen_id: g.origenId ?? "",
  }
}

export function registrarGasto(g: GastoInput) {
  return rpc<string>("fin_registrar_gasto", {
    p: {
      ...gastoPayload(g),
      perfil_id: g.perfilId,
      naturaleza: g.naturaleza ?? "gasto",
      operacion_id: g.operacionId ?? nuevaOperacionId(),
    },
  })
}

export function actualizarGasto(id: string, g: Omit<GastoInput, "perfilId" | "operacionId" | "naturaleza">) {
  return rpc<string>("fin_actualizar_gasto", { p_id: id, p: gastoPayload(g) })
}

/** Elimina un gasto, cargo o pago de deuda revirtiendo todos sus efectos. */
export function eliminarEgreso(id: string) {
  return rpc<void>("fin_eliminar_egreso", { p_id: id })
}

// ---------- Pagos de deuda ----------
export interface PagoDeudaInput {
  perfilId: string
  deudaId: string
  monto: number
  fecha: string
  origenCajaId?: string | null
  concepto?: string | null
  cuotaId?: string | null
  extractoId?: string | null
  numeroCuota?: number | null
  desglose?: { capital: number; interes: number; cargos: number } | null
  operacionId?: string
}

function pagoPayload(p: Omit<PagoDeudaInput, "perfilId" | "deudaId" | "operacionId">) {
  return {
    monto: p.monto,
    fecha: p.fecha,
    origen_caja_id: p.origenCajaId ?? "",
    concepto: p.concepto ?? "",
    cuota_id: p.cuotaId ?? "",
    extracto_id: p.extractoId ?? "",
    numero_cuota: p.numeroCuota ? String(p.numeroCuota) : "",
    desglose_informado: !!p.desglose,
    capital: p.desglose?.capital ?? null,
    interes: p.desglose?.interes ?? null,
    cargos: p.desglose?.cargos ?? null,
  }
}

export function registrarPagoDeuda(p: PagoDeudaInput) {
  return rpc<string>("fin_registrar_pago_deuda", {
    p: { ...pagoPayload(p), perfil_id: p.perfilId, deuda_id: p.deudaId, operacion_id: p.operacionId ?? nuevaOperacionId() },
  })
}

export function actualizarPagoDeuda(id: string, p: Omit<PagoDeudaInput, "perfilId" | "deudaId" | "operacionId">) {
  const payload: Record<string, unknown> = { ...pagoPayload(p) }
  // En edición, cuota y extracto se conservan del pago original.
  delete payload.cuota_id
  delete payload.extracto_id
  if (!p.desglose) delete payload.desglose_informado
  return rpc<string>("fin_actualizar_pago_deuda", { p_id: id, p: payload })
}

// ---------- Ingresos ----------
export interface IngresoInput {
  perfilId: string
  tipoIngreso: string
  monto: number
  fecha: string
  destinoCajaId?: string | null
  operacionId?: string
}

export function registrarIngreso(i: IngresoInput) {
  return rpc<string>("fin_registrar_ingreso", {
    p: {
      perfil_id: i.perfilId,
      tipo_ingreso: i.tipoIngreso,
      monto: i.monto,
      fecha: i.fecha,
      destino_caja_id: i.destinoCajaId ?? "",
      operacion_id: i.operacionId ?? nuevaOperacionId(),
    },
  })
}

export function actualizarIngreso(id: string, i: Omit<IngresoInput, "perfilId" | "operacionId">) {
  return rpc<string>("fin_actualizar_ingreso", {
    p_id: id,
    p: { tipo_ingreso: i.tipoIngreso, monto: i.monto, fecha: i.fecha, destino_caja_id: i.destinoCajaId ?? "" },
  })
}

export function eliminarIngreso(id: string) {
  return rpc<void>("fin_eliminar_ingreso", { p_id: id })
}

// ---------- Deudas ----------
export interface CrearTarjetaInput {
  perfilId: string
  nombre: string
  acreedor: string
  limiteCredito: number | null
  saldoInicial: number
  fechaCorte: number | null
  diaVencimiento: number | null
  tasaInteres?: number | null
  notas?: string | null
}

export function crearTarjeta(t: CrearTarjetaInput) {
  return rpc<string>("fin_crear_deuda", {
    p: {
      tipo_deuda: "tarjeta_credito",
      perfil_id: t.perfilId,
      nombre: t.nombre,
      acreedor: t.acreedor,
      limite_credito: t.limiteCredito ?? "",
      saldo_inicial: t.saldoInicial,
      fecha_corte: t.fechaCorte ?? "",
      dia_vencimiento: t.diaVencimiento ?? "",
      tasa_interes: t.tasaInteres ?? "",
      notas: t.notas ?? "",
    },
  })
}

export interface CrearPrestamoInput {
  perfilId: string
  nombre: string
  acreedor: string
  metodo: MetodoAmortizacion
  capitalInicial: number | null
  tasaInteres: number
  tasaTipo: TasaTipo
  frecuencia: FrecuenciaPago
  cargosPorCuota: number
  fechaInicio?: string | null
  desgloseInformado: boolean
  cuotas: Partial<CuotaProgramada>[]
  notas?: string | null
}

export function crearPrestamo(l: CrearPrestamoInput) {
  return rpc<string>("fin_crear_deuda", {
    p: {
      tipo_deuda: "prestamo",
      perfil_id: l.perfilId,
      nombre: l.nombre,
      acreedor: l.acreedor,
      metodo_amortizacion: l.metodo,
      capital_inicial: l.capitalInicial ?? "",
      tasa_interes: l.tasaInteres,
      tasa_tipo: l.tasaTipo,
      frecuencia_pago: l.frecuencia,
      cargos_por_cuota: l.cargosPorCuota,
      fecha_inicio: l.fechaInicio ?? "",
      desglose_informado: l.desgloseInformado,
      cuotas: l.cuotas,
      notas: l.notas ?? "",
    },
  })
}

export interface ActualizarDeudaInput {
  nombre?: string
  acreedor?: string
  notas?: string | null
  prioridad?: string
  tasaInteres?: number | null
  limiteCredito?: number | null
  fechaCorte?: number | null
  diaVencimiento?: number | null
  estadoTarjeta?: "activa" | "bloqueada" | "cerrada"
}

export function actualizarDeuda(id: string, d: ActualizarDeudaInput) {
  const p: Record<string, unknown> = {}
  if (d.nombre !== undefined) p.nombre = d.nombre
  if (d.acreedor !== undefined) p.acreedor = d.acreedor
  if (d.notas !== undefined) p.notas = d.notas ?? ""
  if (d.prioridad !== undefined) p.prioridad = d.prioridad
  if (d.tasaInteres !== undefined) p.tasa_interes = d.tasaInteres ?? ""
  if (d.limiteCredito !== undefined) p.limite_credito = d.limiteCredito ?? ""
  if (d.fechaCorte !== undefined) p.fecha_corte = d.fechaCorte ?? ""
  if (d.diaVencimiento !== undefined) p.dia_vencimiento = d.diaVencimiento ?? ""
  if (d.estadoTarjeta !== undefined) p.estado_tarjeta = d.estadoTarjeta
  return rpc<string>("fin_actualizar_deuda", { p_id: id, p })
}

export function archivarDeuda(id: string, archivar = true) {
  return rpc<void>("fin_archivar_deuda", { p_id: id, p_archivar: archivar })
}

export function eliminarDeuda(id: string) {
  return rpc<void>("fin_eliminar_deuda", { p_id: id })
}

export function generarExtractos(perfilId: string) {
  return rpc<void>("fin_generar_extractos", { p_perfil: perfilId })
}

export function actualizarPagoMinimo(extractoId: string, monto: number | null) {
  return rpc<void>("fin_actualizar_pago_minimo", { p_extracto: extractoId, p_monto: monto })
}

/** Notifica a otras vistas (Presupuesto, Egresos, Deudas) que cambió el estado financiero. */
export const EVENTO_FINANZAS_ACTUALIZADAS = "finanzas:actualizadas"
export function notificarCambioFinanciero() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENTO_FINANZAS_ACTUALIZADAS))
}
