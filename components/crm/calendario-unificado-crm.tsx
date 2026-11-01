"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatMoney } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Phone,
  RefreshCw,
  Wrench,
  type LucideIcon,
} from "lucide-react"

interface CalendarioUnificadoCRMProps {
  perfilId: string
}

type TipoEvento = "seguimiento" | "agendamiento" | "revisita" | "cobranza"

interface EventoCalendario {
  id: string
  tipo: TipoEvento
  titulo: string
  fecha: string
  hora?: string
  cliente_nombre?: string
  cliente_telefono?: string
  monto?: number
}

const TIPOS: Record<
  TipoEvento,
  {
    plural: string
    ayuda: string
    href: string
    icono: LucideIcon
    punto: string
    texto: string
    suave: string
    activo: string
  }
> = {
  seguimiento: {
    plural: "Seguimientos",
    ayuda: "Llamar o escribir a un cliente",
    href: "/dashboard/crm/seguimientos",
    icono: Clock,
    punto: "bg-amber-400",
    texto: "text-amber-300",
    suave: "border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20",
    activo: "border-amber-400 bg-amber-400 text-slate-950",
  },
  agendamiento: {
    plural: "Citas",
    ayuda: "Reuniones agendadas con clientes",
    href: "/dashboard/crm/agendamientos",
    icono: CalendarDays,
    punto: "bg-sky-400",
    texto: "text-sky-300",
    suave: "border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20",
    activo: "border-sky-400 bg-sky-400 text-slate-950",
  },
  revisita: {
    plural: "Re-visitas",
    ayuda: "Volver a visitar a un cliente",
    href: "/dashboard/crm/revisitas",
    icono: Wrench,
    punto: "bg-emerald-400",
    texto: "text-emerald-300",
    suave: "border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20",
    activo: "border-emerald-400 bg-emerald-400 text-slate-950",
  },
  cobranza: {
    plural: "Cobranzas",
    ayuda: "Cuotas que vencen y hay que cobrar",
    href: "/dashboard/crm/cobranzas",
    icono: DollarSign,
    punto: "bg-rose-400",
    texto: "text-rose-300",
    suave: "border-rose-400/30 bg-rose-400/10 hover:bg-rose-400/20",
    activo: "border-rose-400 bg-rose-400 text-slate-950",
  },
}

const ORDEN_TIPOS: TipoEvento[] = ["seguimiento", "agendamiento", "revisita", "cobranza"]
const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** Clave YYYY-MM-DD en hora local (toISOString usa UTC y corre el día después de las 21 h en Paraguay). */
function claveLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function horaLocal(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function inicioSemana(fecha: Date): Date {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  const dia = d.getDay()
  d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1))
  return d
}

function nombreCliente(c: any, alternativo = "Sin cliente"): string {
  return c ? `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim() || alternativo : alternativo
}

function rangoTexto(inicio: Date, fin: Date): string {
  const mismoMes = inicio.getMonth() === fin.getMonth()
  const desde = mismoMes ? `${inicio.getDate()}` : `${inicio.getDate()} ${MESES_CORTO[inicio.getMonth()]}`
  return `${desde} – ${fin.getDate()} ${MESES_CORTO[fin.getMonth()]} ${fin.getFullYear()}`
}

export function CalendarioUnificadoCRM({ perfilId }: CalendarioUnificadoCRMProps) {
  const supabase = useMemo(() => createClient(), [])
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<"semana" | "quincena">("semana")
  const [fechaInicio, setFechaInicio] = useState<Date>(() => inicioSemana(new Date()))
  const [filtro, setFiltro] = useState<TipoEvento | "todos">("todos")
  const [recarga, setRecarga] = useState(0)

  const cantidadDias = vista === "semana" ? 7 : 14
  const dias = useMemo(
    () =>
      Array.from({ length: cantidadDias }, (_, i) => {
        const d = new Date(fechaInicio)
        d.setDate(d.getDate() + i)
        return d
      }),
    [fechaInicio, cantidadDias],
  )
  const fin = dias[dias.length - 1]
  const hoyClave = claveLocal(new Date())
  const enSemanaActual = dias.some((d) => claveLocal(d) === hoyClave)

  const cargarEventos = useCallback(
    async (inicio: Date, ultimo: Date) => {
      const inicioStr = claveLocal(inicio)
      const finStr = claveLocal(ultimo)
      const desdeIso = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()).toISOString()
      const hastaIso = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate(), 23, 59, 59, 999).toISOString()

      const [seg, agen, rev, cob] = await Promise.all([
        supabase
          .from("crm_seguimientos")
          .select("id, recordatorio_fecha, tipo_seguimiento, clientes(nombre, apellido, telefono)")
          .eq("perfil_id", perfilId)
          .gte("recordatorio_fecha", inicioStr)
          .lte("recordatorio_fecha", finStr)
          .eq("recordatorio_completado", false),
        supabase
          .from("crm_agendamientos")
          .select("id, titulo, fecha_hora, prospecto_nombre, prospecto_telefono, clientes(nombre, apellido, telefono)")
          .eq("perfil_id", perfilId)
          .gte("fecha_hora", desdeIso)
          .lte("fecha_hora", hastaIso)
          .neq("estado", "cancelada"),
        supabase
          .from("crm_revisitas")
          .select("id, motivo, fecha_programada, clientes(nombre, apellido, telefono)")
          .eq("perfil_id", perfilId)
          .gte("fecha_programada", desdeIso)
          .lte("fecha_programada", hastaIso)
          .in("estado", ["programada", "confirmada", "sugerida"]),
        supabase
          .from("crm_pagos_cuotas")
          .select("id, numero_cuota, fecha_vencimiento, crm_ventas!inner(perfil_id, monto_cuota, clientes(nombre, apellido, telefono))")
          .eq("crm_ventas.perfil_id", perfilId)
          .gte("fecha_vencimiento", inicioStr)
          .lte("fecha_vencimiento", finStr)
          .eq("estado", "pendiente"),
      ])

      const fallo = [seg, agen, rev, cob].find((r) => r.error)
      if (fallo?.error) throw new Error(fallo.error.message)

      const lista: EventoCalendario[] = []
      for (const s of (seg.data ?? []) as any[]) {
        lista.push({
          id: `s-${s.id}`,
          tipo: "seguimiento",
          titulo:
            s.tipo_seguimiento === "mantenimiento"
              ? "Mantenimiento"
              : s.tipo_seguimiento === "posventa"
                ? "Posventa"
                : "Seguimiento",
          fecha: String(s.recordatorio_fecha).slice(0, 10),
          cliente_nombre: nombreCliente(s.clientes),
          cliente_telefono: s.clientes?.telefono,
        })
      }
      for (const a of (agen.data ?? []) as any[]) {
        const f = new Date(a.fecha_hora)
        lista.push({
          id: `a-${a.id}`,
          tipo: "agendamiento",
          titulo: a.titulo || "Cita",
          fecha: claveLocal(f),
          hora: horaLocal(f),
          cliente_nombre: a.clientes ? nombreCliente(a.clientes) : a.prospecto_nombre || "Prospecto",
          cliente_telefono: a.clientes?.telefono || a.prospecto_telefono,
        })
      }
      for (const r of (rev.data ?? []) as any[]) {
        const f = new Date(r.fecha_programada)
        lista.push({
          id: `r-${r.id}`,
          tipo: "revisita",
          titulo: r.motivo || "Re-visita",
          fecha: claveLocal(f),
          hora: horaLocal(f),
          cliente_nombre: nombreCliente(r.clientes),
          cliente_telefono: r.clientes?.telefono,
        })
      }
      for (const c of (cob.data ?? []) as any[]) {
        const venta = Array.isArray(c.crm_ventas) ? c.crm_ventas[0] : c.crm_ventas
        if (!venta) continue
        lista.push({
          id: `c-${c.id}`,
          tipo: "cobranza",
          titulo: `Cuota ${c.numero_cuota}`,
          fecha: String(c.fecha_vencimiento).slice(0, 10),
          cliente_nombre: nombreCliente(venta.clientes),
          cliente_telefono: venta.clientes?.telefono,
          monto: venta.monto_cuota,
        })
      }

      return lista.sort((x, y) => (x.hora ?? "99").localeCompare(y.hora ?? "99"))
    },
    [supabase, perfilId],
  )

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError(null)
    cargarEventos(fechaInicio, fin)
      .then((lista) => vigente && setEventos(lista))
      .catch((e: Error) => {
        console.error("Error cargando agenda CRM:", e)
        if (vigente) setError("No pudimos cargar tu agenda.")
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [cargarEventos, fechaInicio, fin, recarga])

  const mover = (sentido: 1 | -1) => {
    const d = new Date(fechaInicio)
    d.setDate(d.getDate() + sentido * cantidadDias)
    setFechaInicio(d)
  }

  const conteo = (tipo: TipoEvento) => eventos.filter((e) => e.tipo === tipo).length
  const visibles = filtro === "todos" ? eventos : eventos.filter((e) => e.tipo === filtro)
  const eventosHoy = visibles.filter((e) => e.fecha === hoyClave)
  const hoy = new Date()

  return (
    <section
      aria-labelledby="agenda-crm-titulo"
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4 text-card-foreground md:p-6"
    >
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CalendarDays className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <h2 id="agenda-crm-titulo" className="text-lg font-semibold text-foreground">
              Mi agenda
            </h2>
            <p className="text-sm text-muted-foreground">{rangoTexto(fechaInicio, fin)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Cantidad de días" className="flex rounded-lg bg-secondary p-1">
            {(["semana", "quincena"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={vista === v}
                onClick={() => setVista(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  vista === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {v === "semana" ? "7 días" : "14 días"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="icon" onClick={() => mover(-1)} aria-label="Semana anterior">
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="secondary"
              onClick={() => setFechaInicio(inicioSemana(new Date()))}
              disabled={enSemanaActual && vista === "semana"}
            >
              Hoy
            </Button>
            <Button variant="secondary" size="icon" onClick={() => mover(1)} aria-label="Semana siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <div role="group" aria-label="Mostrar en la agenda" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={filtro === "todos"}
          onClick={() => setFiltro("todos")}
          className={cn(
            "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
            filtro === "todos"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-foreground hover:bg-muted",
          )}
        >
          Todo
          <span className="tabular-nums opacity-80">{eventos.length}</span>
        </button>
        {ORDEN_TIPOS.map((tipo) => {
          const t = TIPOS[tipo]
          const activo = filtro === tipo
          return (
            <button
              key={tipo}
              type="button"
              aria-pressed={activo}
              title={t.ayuda}
              onClick={() => setFiltro(activo ? "todos" : tipo)}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                activo ? t.activo : cn(t.suave, "text-foreground"),
              )}
            >
              <t.icono className={cn("size-4", !activo && t.texto)} aria-hidden="true" />
              {t.plural}
              <span className="tabular-nums opacity-80">{conteo(tipo)}</span>
            </button>
          )
        })}
      </div>

      {error ? (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-border bg-secondary p-8 text-center">
          <p className="text-sm text-foreground">{error}</p>
          <Button variant="outline" onClick={() => setRecarga((n) => n + 1)}>
            <RefreshCw className="size-4" />
            Reintentar
          </Button>
        </div>
      ) : (
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7" aria-busy={cargando}>
          {dias.map((dia) => {
            const clave = claveLocal(dia)
            const esHoy = clave === hoyClave
            const esPasado = clave < hoyClave
            const delDia = visibles.filter((e) => e.fecha === clave)

            return (
              <li
                key={clave}
                aria-label={`${DIAS_LARGO[dia.getDay()]} ${dia.getDate()} de ${MESES[dia.getMonth()]}${esHoy ? ", hoy" : ""}`}
                className={cn(
                  "flex min-h-36 flex-col gap-2 rounded-lg border p-2",
                  esHoy ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-background/60",
                  esPasado && "opacity-55",
                )}
              >
                <div className="flex items-center justify-between gap-1 px-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className={cn("text-xs font-semibold uppercase", esHoy ? "text-primary" : "text-muted-foreground")}>
                      {DIAS_CORTO[dia.getDay()]}
                    </span>
                    <span className="text-lg font-semibold tabular-nums text-foreground">{dia.getDate()}</span>
                  </span>
                  {esHoy && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">Hoy</span>
                  )}
                </div>

                {cargando ? (
                  <div className="h-10 animate-pulse rounded-md bg-muted" />
                ) : delDia.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">{esPasado ? "" : "Libre"}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {delDia.slice(0, 4).map((ev) => {
                      const t = TIPOS[ev.tipo]
                      return (
                        <li key={ev.id}>
                          <Link
                            href={t.href}
                            title={`${t.plural}: ${ev.titulo} · ${ev.cliente_nombre ?? ""}`}
                            className={cn(
                              "flex flex-col gap-0.5 rounded-md border px-2 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              t.suave,
                            )}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                              <t.icono className={cn("size-3.5 shrink-0", t.texto)} aria-hidden="true" />
                              {ev.hora && <span className="tabular-nums">{ev.hora}</span>}
                              <span className="truncate">{ev.titulo}</span>
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                              {ev.cliente_nombre}
                              {ev.monto ? ` · ${formatMoney(ev.monto)}` : ""}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                    {delDia.length > 4 && (
                      <li className="px-1 text-xs font-medium text-muted-foreground">+{delDia.length - 4} más</li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {!cargando && !error && enSemanaActual && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/60 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            Para hoy · {DIAS_LARGO[hoy.getDay()]} {hoy.getDate()} de {MESES[hoy.getMonth()]}
          </h3>
          {eventosHoy.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenés pendientes para hoy.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {eventosHoy.map((ev) => {
                const t = TIPOS[ev.tipo]
                return (
                  <li key={ev.id} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                    <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", t.punto)}>
                      <t.icono className="size-4 text-slate-950" aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {ev.hora ? `${ev.hora} · ` : ""}
                        {ev.titulo}
                      </span>
                      <span className="truncate text-sm text-muted-foreground">{ev.cliente_nombre}</span>
                      {ev.cliente_telefono && (
                        <a
                          href={`tel:${ev.cliente_telefono}`}
                          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                          <Phone className="size-3.5" aria-hidden="true" />
                          {ev.cliente_telefono}
                        </a>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
