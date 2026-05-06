"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  DollarSign,
  Wrench,
  CalendarDays,
  CalendarRange,
  AlertCircle,
  CheckCircle2,
  MapPin,
  Video,
  ClipboardList
} from "lucide-react"
import { formatDateGMT3, formatTimeGMT3 } from "@/lib/utils/timezone"

interface CalendarioUnificadoCRMProps {
  perfilId: string
}

interface EventoCalendario {
  id: string
  tipo: "seguimiento" | "agendamiento" | "revisita" | "cobranza"
  titulo: string
  descripcion?: string
  fecha: string
  hora?: string
  cliente_nombre?: string
  cliente_telefono?: string
  estado?: string
  prioridad?: string
  monto?: number
  lugar?: string
  tipo_visita?: string
}

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
const DIAS_SEMANA_COMPLETO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export function CalendarioUnificadoCRM({ perfilId }: CalendarioUnificadoCRMProps) {
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [vistaActual, setVistaActual] = useState<"semana" | "quincena">("semana")
  const [fechaInicio, setFechaInicio] = useState<Date>(getInicioSemana(new Date()))
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const supabase = createClient()

  // Obtener inicio de semana (lunes)
  function getInicioSemana(fecha: Date): Date {
    const d = new Date(fecha)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }

  // Obtener rango de fechas según vista
  function getRangoFechas(): { inicio: Date; fin: Date; dias: Date[] } {
    const inicio = new Date(fechaInicio)
    const cantidadDias = vistaActual === "semana" ? 7 : 14
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + cantidadDias - 1)
    
    const dias: Date[] = []
    for (let i = 0; i < cantidadDias; i++) {
      const dia = new Date(inicio)
      dia.setDate(dia.getDate() + i)
      dias.push(dia)
    }
    
    return { inicio, fin, dias }
  }

  // Navegar semanas/quincenas
  const navegarAnterior = () => {
    const nuevaFecha = new Date(fechaInicio)
    nuevaFecha.setDate(nuevaFecha.getDate() - (vistaActual === "semana" ? 7 : 14))
    setFechaInicio(nuevaFecha)
  }

  const navegarSiguiente = () => {
    const nuevaFecha = new Date(fechaInicio)
    nuevaFecha.setDate(nuevaFecha.getDate() + (vistaActual === "semana" ? 7 : 14))
    setFechaInicio(nuevaFecha)
  }

  const irAHoy = () => {
    setFechaInicio(getInicioSemana(new Date()))
  }

  // Cargar eventos
  useEffect(() => {
    loadEventos()
  }, [perfilId, fechaInicio, vistaActual])

  const loadEventos = async () => {
    setIsLoading(true)
    const { inicio, fin } = getRangoFechas()
    const inicioStr = inicio.toISOString().split("T")[0]
    const finStr = fin.toISOString().split("T")[0]

    try {
      const eventosTemp: EventoCalendario[] = []

      // 1. Cargar Seguimientos
      const { data: seguimientos } = await supabase
        .from("crm_seguimientos")
        .select(`
          id,
          nota,
          recordatorio_fecha,
          recordatorio_completado,
          tipo_seguimiento,
          cliente_id,
          clientes(nombre, apellido, telefono)
        `)
        .eq("perfil_id", perfilId)
        .gte("recordatorio_fecha", inicioStr)
        .lte("recordatorio_fecha", finStr)
        .eq("recordatorio_completado", false)

      if (seguimientos) {
        seguimientos.forEach((s: any) => {
          eventosTemp.push({
            id: s.id,
            tipo: "seguimiento",
            titulo: s.tipo_seguimiento === "mantenimiento" ? "Mantenimiento" : 
                   s.tipo_seguimiento === "posventa" ? "Seguimiento Posventa" : "Seguimiento",
            descripcion: s.nota,
            fecha: s.recordatorio_fecha,
            cliente_nombre: s.clientes ? `${s.clientes.nombre} ${s.clientes.apellido || ""}`.trim() : "Sin cliente",
            cliente_telefono: s.clientes?.telefono,
            estado: s.recordatorio_completado ? "completado" : "pendiente"
          })
        })
      }

      // 2. Cargar Agendamientos
      const { data: agendamientos } = await supabase
        .from("crm_agendamientos")
        .select(`
          id,
          titulo,
          tipo,
          fecha_hora,
          lugar,
          estado,
          estrellas,
          cliente_id,
          prospecto_nombre,
          prospecto_telefono,
          clientes(nombre, apellido, telefono)
        `)
        .eq("perfil_id", perfilId)
        .gte("fecha_hora", `${inicioStr}T00:00:00`)
        .lte("fecha_hora", `${finStr}T23:59:59`)
        .neq("estado", "cancelada")

      if (agendamientos) {
        agendamientos.forEach((a: any) => {
          const fechaHora = new Date(a.fecha_hora)
          const nombreCliente = a.clientes 
            ? `${a.clientes.nombre} ${a.clientes.apellido || ""}`.trim()
            : a.prospecto_nombre || "Prospecto"
          const telefono = a.clientes?.telefono || a.prospecto_telefono
          
          eventosTemp.push({
            id: a.id,
            tipo: "agendamiento",
            titulo: a.titulo || "Cita",
            descripcion: a.tipo,
            fecha: fechaHora.toISOString().split("T")[0],
            hora: fechaHora.toTimeString().slice(0, 5),
            cliente_nombre: nombreCliente,
            cliente_telefono: telefono,
            estado: a.estado,
            lugar: a.lugar,
            tipo_visita: a.tipo,
            prioridad: a.estrellas >= 4 ? "alta" : a.estrellas >= 2 ? "media" : "baja"
          })
        })
      }

      // 3. Cargar Re-visitas
      const { data: revisitas } = await supabase
        .from("crm_revisitas")
        .select(`
          id,
          motivo,
          tipo,
          fecha_programada,
          lugar,
          estado,
          cliente_id,
          clientes(nombre, apellido, telefono)
        `)
        .eq("perfil_id", perfilId)
        .gte("fecha_programada", `${inicioStr}T00:00:00`)
        .lte("fecha_programada", `${finStr}T23:59:59`)
        .in("estado", ["programada", "confirmada", "sugerida"])

      if (revisitas) {
        revisitas.forEach((r: any) => {
          const fechaHora = new Date(r.fecha_programada)
          eventosTemp.push({
            id: r.id,
            tipo: "revisita",
            titulo: `Re-visita: ${r.motivo || "General"}`,
            descripcion: r.tipo,
            fecha: fechaHora.toISOString().split("T")[0],
            hora: fechaHora.toTimeString().slice(0, 5),
            cliente_nombre: r.clientes ? `${r.clientes.nombre} ${r.clientes.apellido || ""}`.trim() : "Sin cliente",
            cliente_telefono: r.clientes?.telefono,
            estado: r.estado,
            lugar: r.lugar,
            tipo_visita: r.tipo
          })
        })
      }

      // 4. Cargar Cobranzas pendientes
      const { data: cobranzas } = await supabase
        .from("crm_pagos_cuotas")
        .select(`
          id,
          numero_cuota,
          fecha_vencimiento,
          monto_pagado,
          estado,
          venta_id,
          crm_ventas(
            id,
            monto_cuota,
            cliente_id,
            clientes(nombre, apellido, telefono)
          )
        `)
        .gte("fecha_vencimiento", inicioStr)
        .lte("fecha_vencimiento", finStr)
        .eq("estado", "pendiente")

      if (cobranzas) {
        cobranzas.forEach((c: any) => {
          if (c.crm_ventas) {
            const cliente = c.crm_ventas.clientes
            eventosTemp.push({
              id: c.id,
              tipo: "cobranza",
              titulo: `Cuota ${c.numero_cuota}`,
              descripcion: `Vencimiento de cuota`,
              fecha: c.fecha_vencimiento,
              cliente_nombre: cliente ? `${cliente.nombre} ${cliente.apellido || ""}`.trim() : "Sin cliente",
              cliente_telefono: cliente?.telefono,
              estado: c.estado,
              monto: c.crm_ventas.monto_cuota
            })
          }
        })
      }

      setEventos(eventosTemp)
    } catch (error) {
      console.error("Error cargando eventos:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar eventos por tipo
  const eventosFiltrados = filtroTipo === "todos" 
    ? eventos 
    : eventos.filter(e => e.tipo === filtroTipo)

  // Agrupar eventos por fecha
  const eventosPorFecha = (fecha: Date): EventoCalendario[] => {
    const fechaStr = fecha.toISOString().split("T")[0]
    return eventosFiltrados.filter(e => e.fecha === fechaStr)
      .sort((a, b) => {
        if (a.hora && b.hora) return a.hora.localeCompare(b.hora)
        if (a.hora) return -1
        if (b.hora) return 1
        return 0
      })
  }

  // Verificar si es hoy
  const esHoy = (fecha: Date): boolean => {
    const hoy = new Date()
    return fecha.toDateString() === hoy.toDateString()
  }

  // Obtener color por tipo
  const getColorTipo = (tipo: string) => {
    switch (tipo) {
      case "seguimiento": return "bg-amber-500"
      case "agendamiento": return "bg-purple-500"
      case "revisita": return "bg-cyan-500"
      case "cobranza": return "bg-red-500"
      default: return "bg-slate-500"
    }
  }

  // Obtener icono por tipo
  const getIconoTipo = (tipo: string) => {
    switch (tipo) {
      case "seguimiento": return <Clock className="h-3 w-3" />
      case "agendamiento": return <CalendarDays className="h-3 w-3" />
      case "revisita": return <Wrench className="h-3 w-3" />
      case "cobranza": return <DollarSign className="h-3 w-3" />
      default: return <Calendar className="h-3 w-3" />
    }
  }

  // Obtener icono de tipo de visita
  const getIconoVisita = (tipo?: string) => {
    switch (tipo) {
      case "presencial": return <MapPin className="h-3 w-3" />
      case "virtual": return <Video className="h-3 w-3" />
      case "telefonica": return <Phone className="h-3 w-3" />
      default: return null
    }
  }

  const { dias } = getRangoFechas()
  const hoy = new Date()

  // Contar eventos por tipo para estadísticas
  const contarPorTipo = (tipo: string) => eventos.filter(e => e.tipo === tipo).length
  const eventosHoy = eventos.filter(e => e.fecha === hoy.toISOString().split("T")[0])

  return (
    <Card className="border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-white to-cyan-50/30 dark:from-slate-800 dark:to-cyan-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
              <Calendar className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-800 dark:text-white">
                Mi Agenda CRM
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {MESES[fechaInicio.getMonth()]} {fechaInicio.getFullYear()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Resumen del día */}
            {eventosHoy.length > 0 && (
              <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700">
                <AlertCircle className="h-3 w-3 mr-1 text-cyan-600" />
                {eventosHoy.length} hoy
              </Badge>
            )}

            {/* Vista selector */}
            <Tabs value={vistaActual} onValueChange={(v) => setVistaActual(v as "semana" | "quincena")}>
              <TabsList className="h-8">
                <TabsTrigger value="semana" className="text-xs px-3 h-7">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  Semana
                </TabsTrigger>
                <TabsTrigger value="quincena" className="text-xs px-3 h-7">
                  <CalendarRange className="h-3 w-3 mr-1" />
                  Quincena
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Navegación */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={navegarAnterior} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={irAHoy} className="h-8 text-xs px-2">
                Hoy
              </Button>
              <Button variant="outline" size="sm" onClick={navegarSiguiente} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filtros por tipo */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted-foreground">Filtrar:</span>
          <div className="flex gap-1 flex-wrap">
            <Button 
              variant={filtroTipo === "todos" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFiltroTipo("todos")}
              className="h-7 text-xs"
            >
              Todos ({eventos.length})
            </Button>
            <Button 
              variant={filtroTipo === "seguimiento" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFiltroTipo("seguimiento")}
              className={`h-7 text-xs ${filtroTipo === "seguimiento" ? "bg-amber-500 hover:bg-amber-600" : ""}`}
            >
              <Clock className="h-3 w-3 mr-1" />
              Seguimientos ({contarPorTipo("seguimiento")})
            </Button>
            <Button 
              variant={filtroTipo === "agendamiento" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFiltroTipo("agendamiento")}
              className={`h-7 text-xs ${filtroTipo === "agendamiento" ? "bg-purple-500 hover:bg-purple-600" : ""}`}
            >
              <CalendarDays className="h-3 w-3 mr-1" />
              Citas ({contarPorTipo("agendamiento")})
            </Button>
            <Button 
              variant={filtroTipo === "revisita" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFiltroTipo("revisita")}
              className={`h-7 text-xs ${filtroTipo === "revisita" ? "bg-cyan-500 hover:bg-cyan-600" : ""}`}
            >
              <Wrench className="h-3 w-3 mr-1" />
              Re-visitas ({contarPorTipo("revisita")})
            </Button>
            <Button 
              variant={filtroTipo === "cobranza" ? "default" : "outline"} 
              size="sm" 
              onClick={() => setFiltroTipo("cobranza")}
              className={`h-7 text-xs ${filtroTipo === "cobranza" ? "bg-red-500 hover:bg-red-600" : ""}`}
            >
              <DollarSign className="h-3 w-3 mr-1" />
              Cobranzas ({contarPorTipo("cobranza")})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
          </div>
        ) : (
          <div className={`grid gap-2 ${vistaActual === "semana" ? "grid-cols-7" : "grid-cols-7"}`}>
            {/* Headers de días */}
            {dias.slice(0, 7).map((dia, idx) => (
              <div key={`header-${idx}`} className="text-center text-xs font-medium text-muted-foreground py-1">
                {DIAS_SEMANA[dia.getDay()]}
              </div>
            ))}

            {/* Días del calendario */}
            {dias.map((dia, idx) => {
              const eventosDelDia = eventosPorFecha(dia)
              const esHoyDia = esHoy(dia)
              const esPasado = dia < new Date(hoy.toDateString())

              return (
                <div 
                  key={idx}
                  className={`
                    min-h-[120px] p-1.5 rounded-lg border transition-all
                    ${esHoyDia 
                      ? "bg-cyan-100 dark:bg-cyan-900/40 border-cyan-400 dark:border-cyan-600 ring-2 ring-cyan-400/50" 
                      : esPasado
                        ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-700"
                    }
                  `}
                >
                  {/* Número del día */}
                  <div className={`
                    text-sm font-semibold mb-1 flex items-center justify-between
                    ${esHoyDia ? "text-cyan-700 dark:text-cyan-300" : "text-slate-700 dark:text-slate-300"}
                  `}>
                    <span className={`
                      ${esHoyDia ? "bg-cyan-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" : ""}
                    `}>
                      {dia.getDate()}
                    </span>
                    {eventosDelDia.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {eventosDelDia.length}
                      </Badge>
                    )}
                  </div>

                  {/* Eventos del día */}
                  <ScrollArea className="h-[85px]">
                    <div className="space-y-1">
                      {eventosDelDia.map((evento) => (
                        <div 
                          key={evento.id}
                          className={`
                            p-1.5 rounded text-[10px] cursor-pointer transition-all hover:scale-[1.02]
                            ${evento.tipo === "seguimiento" ? "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200" : ""}
                            ${evento.tipo === "agendamiento" ? "bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200" : ""}
                            ${evento.tipo === "revisita" ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200" : ""}
                            ${evento.tipo === "cobranza" ? "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200" : ""}
                          `}
                        >
                          <div className="flex items-center gap-1 font-medium truncate">
                            {getIconoTipo(evento.tipo)}
                            <span className="truncate">{evento.titulo}</span>
                          </div>
                          {evento.hora && (
                            <div className="flex items-center gap-1 text-[9px] opacity-80">
                              <Clock className="h-2 w-2" />
                              {evento.hora}
                              {evento.tipo_visita && getIconoVisita(evento.tipo_visita)}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[9px] opacity-80 truncate">
                            <User className="h-2 w-2" />
                            <span className="truncate">{evento.cliente_nombre}</span>
                          </div>
                          {evento.monto && (
                            <div className="flex items-center gap-1 text-[9px] font-medium">
                              <DollarSign className="h-2 w-2" />
                              Gs. {evento.monto.toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                      {eventosDelDia.length === 0 && !esPasado && (
                        <div className="text-[10px] text-muted-foreground text-center py-2 opacity-50">
                          Sin eventos
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
        )}

        {/* Resumen de eventos de hoy */}
        {eventosHoy.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-purple-50 dark:from-cyan-900/20 dark:to-purple-900/20 border border-cyan-200 dark:border-cyan-800">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-cyan-600" />
              Hoy - {DIAS_SEMANA_COMPLETO[hoy.getDay()]} {hoy.getDate()} de {MESES[hoy.getMonth()]}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {eventosHoy.slice(0, 6).map((evento) => (
                <div 
                  key={evento.id}
                  className={`
                    p-2 rounded-lg border text-xs
                    ${evento.tipo === "seguimiento" ? "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" : ""}
                    ${evento.tipo === "agendamiento" ? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" : ""}
                    ${evento.tipo === "revisita" ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800" : ""}
                    ${evento.tipo === "cobranza" ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800" : ""}
                  `}
                >
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className={`w-2 h-2 rounded-full ${getColorTipo(evento.tipo)}`}></span>
                      {evento.titulo}
                    </div>
                    {evento.hora && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {evento.hora}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    {evento.cliente_nombre}
                    {evento.cliente_telefono && (
                      <>
                        <span className="mx-1">-</span>
                        <Phone className="h-3 w-3" />
                        {evento.cliente_telefono}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {eventosHoy.length > 6 && (
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  +{eventosHoy.length - 6} más
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div className="mt-4 flex items-center gap-4 justify-center flex-wrap text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500"></span>
            Seguimientos
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-purple-500"></span>
            Citas
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-500"></span>
            Re-visitas
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-500"></span>
            Cobranzas
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
