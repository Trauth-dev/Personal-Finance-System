import type { createClient } from "@/lib/supabase/server"
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/currency"
import { normalizarNombre } from "@/lib/utils"
import {
  claveMes,
  desplazarMes,
  hoyEnZona,
  mismoMes,
  parsearClaveMes,
  rangoHastaDia,
  rangoMes,
  ultimosMeses,
  nombreMesCorto,
  type AnioMes,
  type DiaLocal,
} from "./fechas"
import {
  distribuirGastos,
  enRango,
  esPagoDeDeuda,
  gastosDelPeriodo,
  margenDelMes,
  principalesGastos,
  resumirPeriodo,
  variacionPorcentual,
  type CategoriaGasto,
  type Egreso,
  type Ingreso,
  type ResumenPeriodo,
} from "./reglas"
import { disponibleHoy, type Cuenta, type SaldoPorMoneda } from "./fuentes/cajas"
import { calcularDeudaPendiente, proximosPagos, type Deuda } from "./fuentes/deudas"
import { calcularPresupuesto, type PresupuestoMes } from "./fuentes/presupuesto"

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Una sección con error NUNCA se presenta como 0: la UI muestra "No pudimos cargar este dato". */
export type Seccion<T> = { ok: true; data: T } | { ok: false }

const ok = <T,>(data: T): Seccion<T> => ({ ok: true, data })
const fallo = { ok: false } as const

export interface PuntoEvolucion {
  mes: string
  clave: string
  ingresos: number
  gastos: number
  resultado: number
  sinActividad: boolean
}

export interface Movimientos {
  resumen: ResumenPeriodo
  /** Null = sin datos comparables del mes anterior. */
  variacionIngresos: number | null
  comparacionParcial: boolean
  margen: number | null
  distribucion: CategoriaGasto[]
  principales: Egreso[]
  evolucion: PuntoEvolucion[]
}

export type Aviso =
  | { id: string; tipo: "presupuesto_excedido"; categoria: string; excedente: number }
  | { id: string; tipo: "presupuesto_cerca"; categoria: string; porcentajeRestante: number }
  | { id: string; tipo: "proximo_pago"; nombre: string; dias: number; monto: number }

export interface Logro {
  id: string
  titulo: string
  descripcion: string | null
  fecha: string | null
}

export interface PersonalDashboardData {
  moneda: string
  hoy: DiaLocal
  mes: AnioMes
  claveMes: string
  esMesActual: boolean
  cajaId: string | null
  cajaNombre: string | null
  cuentas: Seccion<Cuenta[]>
  disponible: Seccion<SaldoPorMoneda[]>
  movimientos: Seccion<Movimientos>
  deuda: Seccion<{ total: number; activas: number }>
  presupuesto: Seccion<PresupuestoMes>
  avisos: Aviso[]
  logros: Seccion<Logro[]>
}

const PAGINA = 1000

async function leerTodo<T>(
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<{ data: T[]; error: unknown }> {
  const filas: T[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1)
    if (error) return { data: [], error }
    filas.push(...(data ?? []))
    if (!data || data.length < PAGINA) return { data: filas, error: null }
  }
}

const unico = <T,>(valor: T | T[] | null | undefined): T | null =>
  Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null)

const aNumero = (valor: unknown) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

export async function getPersonalDashboardData({
  supabase,
  userId,
  perfilId,
  mesSolicitado,
  cajaSolicitada,
}: {
  supabase: Supabase
  userId: string
  perfilId: string
  mesSolicitado?: string | null
  cajaSolicitada?: string | null
}): Promise<PersonalDashboardData> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("moneda, zona_horaria")
    .eq("id", userId)
    .maybeSingle()

  const moneda = profile?.moneda || DEFAULT_CURRENCY
  const hoy = hoyEnZona(profile?.zona_horaria || DEFAULT_TIMEZONE)
  const mesActual: AnioMes = { year: hoy.year, month: hoy.month }
  const mes = parsearClaveMes(mesSolicitado) ?? mesActual
  const esMesActual = mismoMes(mes, mesActual)

  const rangoSeleccionado = rangoMes(mes)
  const mesesEvolucion = ultimosMeses(mes, 6)
  const ventana = { start: rangoMes(mesesEvolucion[0]).start, end: rangoSeleccionado.end }
  const rangoActual = rangoMes(mesActual)

  const [cajasRes, ingresosRes, egresosRes, egresosHoyRes, deudasRes, presupuestoRes, categoriasRes, logrosRes] =
    await Promise.all([
      supabase
        .from("cajas_ahorro")
        .select("id, nombre, banco, monto_actual, moneda")
        .eq("perfil_id", perfilId)
        .eq("activa", true)
        .order("nombre"),
      leerTodo((desde, hasta) =>
        supabase
          .from("ingresos")
          .select("id, monto, fecha, destino_caja_id")
          .eq("perfil_id", perfilId)
          .gte("fecha", ventana.start)
          .lte("fecha", ventana.end)
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo((desde, hasta) =>
        supabase
          .from("egresos")
          .select(
            "id, monto, fecha, concepto, deuda_id, origen_tipo, origen_id, tipos_categoria_egreso(nombre), categorias_egreso(nombre)",
          )
          .eq("perfil_id", perfilId)
          .gte("fecha", ventana.start)
          .lte("fecha", ventana.end)
          .order("id")
          .range(desde, hasta),
      ),
      supabase
        .from("egresos")
        .select("deuda_id")
        .eq("perfil_id", perfilId)
        .not("deuda_id", "is", null)
        .gte("fecha", rangoActual.start)
        .lte("fecha", rangoActual.end),
      supabase
        .from("deudas")
        .select("id, nombre, tipo_deuda, estado, monto_total, monto_pagado, limite_credito, monto_cuota, dia_vencimiento, fecha_pago")
        .eq("perfil_id", perfilId),
      leerTodo((desde, hasta) =>
        supabase
          .from("presupuesto_categorias")
          .select("id, categoria, monto_presupuestado")
          .eq("perfil_id", perfilId)
          .eq("tipo_categoria", "egreso")
          .gte("mes", rangoSeleccionado.start)
          .lte("mes", rangoSeleccionado.end)
          .order("id")
          .range(desde, hasta),
      ),
      leerTodo((desde, hasta) =>
        supabase
          .from("categorias_egreso")
          .select("id, nombre, tipos_categoria_egreso(nombre)")
          .eq("perfil_id", perfilId)
          .order("id")
          .range(desde, hasta),
      ),
      supabase
        .from("logros_financieros")
        .select("id, titulo, descripcion, fecha_obtenido")
        .eq("perfil_id", perfilId)
        .order("fecha_obtenido", { ascending: false })
        .limit(3),
    ])

  for (const [nombre, res] of Object.entries({
    cajas: cajasRes,
    ingresos: ingresosRes,
    egresos: egresosRes,
    deudas: deudasRes,
    presupuesto: presupuestoRes,
    categorias: categoriasRes,
    logros: logrosRes,
  })) {
    if (res.error) console.error(`[dashboard-personal] Error leyendo ${nombre}:`, res.error)
  }

  const cuentas: Cuenta[] | null = cajasRes.error
    ? null
    : (cajasRes.data ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        banco: c.banco,
        saldo: aNumero(c.monto_actual),
        moneda: c.moneda || moneda,
      }))

  // Si no se pudieron leer las cajas se respeta el filtro pedido: la consulta ya está acotada al perfil.
  const cajaId = cajaSolicitada ? (cuentas ? (cuentas.some((c) => c.id === cajaSolicitada) ? cajaSolicitada : null) : cajaSolicitada) : null
  const cajaNombre = cajaId ? (cuentas?.find((c) => c.id === cajaId)?.nombre ?? null) : null

  const ingresos: Ingreso[] = ingresosRes.data.map((i) => ({
    id: i.id,
    monto: aNumero(i.monto),
    fecha: i.fecha,
    cajaId: i.destino_caja_id,
  }))

  const egresos: Egreso[] = egresosRes.data.map((e) => ({
    id: e.id,
    monto: aNumero(e.monto),
    fecha: e.fecha,
    concepto: e.concepto,
    deudaId: e.deuda_id,
    origenTipo: e.origen_tipo,
    origenId: e.origen_id,
    categoria: unico(e.tipos_categoria_egreso as { nombre: string } | { nombre: string }[] | null)?.nombre ?? null,
    subcategoria: unico(e.categorias_egreso as { nombre: string } | { nombre: string }[] | null)?.nombre ?? null,
  }))

  let movimientos: Seccion<Movimientos> = fallo
  if (!ingresosRes.error && !egresosRes.error) {
    const resumen = resumirPeriodo(ingresos, egresos, rangoSeleccionado, cajaId)
    const mesAnterior = desplazarMes(mes, -1)
    // Mes en curso: se compara del 1 al día de hoy contra el mismo tramo del mes anterior.
    const rangoComparable = esMesActual ? rangoHastaDia(mes, hoy.day) : rangoSeleccionado
    const rangoAnterior = esMesActual ? rangoHastaDia(mesAnterior, hoy.day) : rangoMes(mesAnterior)
    const ingresosComparables = resumirPeriodo(ingresos, [], rangoComparable, cajaId).ingresos
    const ingresosAnteriores = resumirPeriodo(ingresos, [], rangoAnterior, cajaId).ingresos
    const gastos = gastosDelPeriodo(egresos, rangoSeleccionado, cajaId)

    movimientos = ok({
      resumen,
      variacionIngresos: variacionPorcentual(ingresosComparables, ingresosAnteriores),
      comparacionParcial: esMesActual,
      margen: margenDelMes(resumen),
      distribucion: distribuirGastos(gastos),
      principales: principalesGastos(gastos, 5),
      evolucion: mesesEvolucion.map((m) => {
        const r = resumirPeriodo(ingresos, egresos, rangoMes(m), cajaId)
        return {
          mes: nombreMesCorto(m),
          clave: claveMes(m),
          ingresos: r.ingresos,
          gastos: r.gastos,
          resultado: r.resultado,
          sinActividad: r.cantidadIngresos === 0 && r.cantidadGastos === 0 && r.pagosDeuda === 0,
        }
      }),
    })
  }

  const deudas: Deuda[] | null = deudasRes.error
    ? null
    : (deudasRes.data ?? []).map((d) => ({
        id: d.id,
        nombre: d.nombre,
        tipo: d.tipo_deuda,
        estado: d.estado,
        montoTotal: aNumero(d.monto_total),
        montoPagado: aNumero(d.monto_pagado),
        limiteCredito: aNumero(d.limite_credito),
        montoCuota: aNumero(d.monto_cuota),
        diaPago: d.tipo_deuda === "tarjeta_credito" ? (d.fecha_pago ?? d.dia_vencimiento) : (d.dia_vencimiento ?? d.fecha_pago),
      }))

  // El presupuesto es general del perfil: no responde al filtro de caja.
  let presupuesto: Seccion<PresupuestoMes> = fallo
  if (!presupuestoRes.error && !categoriasRes.error && !egresosRes.error) {
    const subcategoriaATipo = new Map<string, string>()
    for (const c of categoriasRes.data) {
      const tipo = unico(c.tipos_categoria_egreso as { nombre: string } | { nombre: string }[] | null)?.nombre
      if (!tipo) continue
      subcategoriaATipo.set(c.nombre, tipo)
      subcategoriaATipo.set(normalizarNombre(c.nombre), tipo)
    }
    presupuesto = ok(
      calcularPresupuesto(
        presupuestoRes.data.map((p) => ({ subcategoria: p.categoria, monto: aNumero(p.monto_presupuestado) })),
        subcategoriaATipo,
        egresos.filter((e) => enRango(e.fecha, rangoSeleccionado)),
      ),
    )
  }

  const avisos: Aviso[] = []
  if (presupuesto.ok) {
    for (const linea of presupuesto.data.lineas) {
      if (linea.porcentaje > 100) {
        avisos.push({
          id: `excedido-${linea.categoria}`,
          tipo: "presupuesto_excedido",
          categoria: linea.categoria,
          excedente: -linea.restante,
        })
      } else if (linea.porcentaje >= 85) {
        avisos.push({
          id: `cerca-${linea.categoria}`,
          tipo: "presupuesto_cerca",
          categoria: linea.categoria,
          porcentajeRestante: Math.max(0, Math.round(100 - linea.porcentaje)),
        })
      }
    }
  }
  if (esMesActual && deudas && !egresosHoyRes.error) {
    const pagadasEsteMes = new Set((egresosHoyRes.data ?? []).map((e) => e.deuda_id as string))
    for (const pago of proximosPagos(deudas, hoy, pagadasEsteMes)) {
      avisos.push({ id: `pago-${pago.nombre}`, tipo: "proximo_pago", ...pago })
    }
  }

  return {
    moneda,
    hoy,
    mes,
    claveMes: claveMes(mes),
    esMesActual,
    cajaId,
    cajaNombre,
    cuentas: cuentas ? ok(cuentas) : fallo,
    disponible: cuentas ? ok(disponibleHoy(cuentas, cajaId, moneda)) : fallo,
    movimientos,
    deuda: deudas ? ok(calcularDeudaPendiente(deudas)) : fallo,
    presupuesto,
    avisos: avisos.slice(0, 4),
    logros: logrosRes.error
      ? fallo
      : ok(
          (logrosRes.data ?? []).map((l) => ({
            id: l.id,
            titulo: l.titulo,
            descripcion: l.descripcion,
            fecha: l.fecha_obtenido,
          })),
        ),
  }
}
