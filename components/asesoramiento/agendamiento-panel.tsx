"use client"

import { useState, useEffect, useMemo } from "react"
import { Monitor, MapPin, ChevronLeft, ChevronRight, Lock, CalendarCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AreaConfig, Modalidad, Profesional } from "@/lib/asesoramiento/areas-config"

export interface AgendamientoSeleccion {
  area: AreaConfig
  temas: string[]
  profesional: Profesional
  modalidad: Modalidad
  servicioId: string
  primeraSesion: boolean
  fechaISO: string
  hora: string
}

interface AgendamientoPanelProps {
  area: AreaConfig
  selectedTemas: string[]
  onToggleTema: (temaId: string) => void
  profesional: Profesional | null
  profesionales: Profesional[]
  onSelectProfesional: (p: Profesional) => void
  onConfirm: (seleccion: AgendamientoSeleccion) => void
}

const HORARIOS = ["09:00", "11:00", "15:00", "17:00"]
const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

export function AgendamientoPanel({
  area,
  selectedTemas,
  onToggleTema,
  profesional,
  profesionales,
  onSelectProfesional,
  onConfirm,
}: AgendamientoPanelProps) {
  const [modalidad, setModalidad] = useState<Modalidad>("online")
  const [servicioId, setServicioId] = useState<string>(area.servicios[0]?.id ?? "")
  const [primeraSesion, setPrimeraSesion] = useState(true)
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(1)
  const [selectedTime, setSelectedTime] = useState<string>("")

  // Al cambiar de area, reiniciamos el servicio al primero disponible
  useEffect(() => {
    setServicioId(area.servicios[0]?.id ?? "")
  }, [area.id, area.servicios])

  // Si el profesional no ofrece la modalidad elegida, ajustamos
  useEffect(() => {
    if (profesional && !profesional.modalidades.includes(modalidad)) {
      setModalidad(profesional.modalidades[0] ?? "online")
    }
  }, [profesional, modalidad])

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const temasSeleccionados = selectedTemas
    .map((id) => area.temas.find((t) => t.id === id))
    .filter(Boolean) as { id: string; label: string }[]

  const puedeConfirmar = Boolean(profesional && servicioId && selectedTime && selectedDayIdx >= 0)

  const handleConfirm = () => {
    if (!profesional || !puedeConfirmar) return
    onConfirm({
      area,
      temas: selectedTemas,
      profesional,
      modalidad,
      servicioId,
      primeraSesion,
      fechaISO: dias[selectedDayIdx].toISOString(),
      hora: selectedTime,
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">
          <span className={area.theme.text}>3.</span> Agendamiento
        </h2>
        <p className="text-sm text-slate-500">Completá los datos y elegí fecha y hora.</p>
      </div>

      {/* Modalidad */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["online", "presencial"] as Modalidad[]).map((m) => {
          const disabled = profesional ? !profesional.modalidades.includes(m) : false
          const active = modalidad === m
          const Icon = m === "online" ? Monitor : MapPin
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => setModalidad(m)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                active ? cn(area.theme.border, area.theme.bgSoft, area.theme.text) : "border-slate-200 text-slate-600 hover:border-slate-300",
                disabled && "opacity-40 cursor-not-allowed hover:border-slate-200",
              )}
            >
              <Icon className="w-4 h-4" aria-hidden="true" />
              {m === "online" ? "Online" : "Presencial"}
            </button>
          )
        })}
      </div>

      {/* Area (informativo) */}
      <Field label="Área">
        <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
          {area.nombre}
        </div>
      </Field>

      {/* Tema a tratar */}
      <Field label="Tema a tratar">
        {temasSeleccionados.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 rounded-md border border-slate-200 p-2">
            {temasSeleccionados.map((t) => (
              <span
                key={t.id}
                className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", area.theme.bgSoft, area.theme.text)}
              >
                {t.label}
                <button
                  type="button"
                  onClick={() => onToggleTema(t.id)}
                  aria-label={`Quitar ${t.label}`}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="flex h-10 items-center rounded-md border border-dashed border-slate-200 px-3 text-sm text-slate-400">
            Seleccioná al menos un tema arriba
          </div>
        )}
      </Field>

      {/* Profesional */}
      <Field label="Profesional">
        <Select value={profesional?.id ?? ""} onValueChange={(id) => {
          const p = profesionales.find((x) => x.id === id)
          if (p) onSelectProfesional(p)
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Elegí un profesional" />
          </SelectTrigger>
          <SelectContent>
            {profesionales.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre} — {p.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Servicio */}
      <Field label="Servicio">
        <Select value={servicioId} onValueChange={setServicioId}>
          <SelectTrigger>
            <SelectValue placeholder="Elegí un servicio" />
          </SelectTrigger>
          <SelectContent>
            {area.servicios.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* Primera sesion */}
      <Field label="¿Es tu primera sesión?">
        <div className="flex items-center gap-4">
          {[{ v: true, l: "Sí" }, { v: false, l: "No" }].map((opt) => (
            <label key={opt.l} className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="primera-sesion"
                checked={primeraSesion === opt.v}
                onChange={() => setPrimeraSesion(opt.v)}
                className="sr-only peer"
              />
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full border-2",
                  primeraSesion === opt.v ? cn(area.theme.border) : "border-slate-300",
                )}
              >
                {primeraSesion === opt.v && <span className={cn("h-2 w-2 rounded-full", area.theme.bg)} />}
              </span>
              {opt.l}
            </label>
          ))}
        </div>
      </Field>

      {/* Selector de semana */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            aria-label="Semana anterior"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-xs font-medium text-slate-500">
            {dias[0].toLocaleDateString("es-PY", { day: "numeric", month: "short" })} —{" "}
            {dias[6].toLocaleDateString("es-PY", { day: "numeric", month: "short" })}
          </span>
          <button
            type="button"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            aria-label="Semana siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dias.map((dia, idx) => {
            const active = idx === selectedDayIdx
            const isPast = dia < today
            return (
              <button
                key={idx}
                type="button"
                disabled={isPast}
                onClick={() => setSelectedDayIdx(idx)}
                className={cn(
                  "flex flex-col items-center rounded-md py-1.5 text-xs transition-all",
                  active ? cn(area.theme.bg, "text-white") : "text-slate-600 hover:bg-slate-100",
                  isPast && "opacity-30 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <span className="text-[10px]">{DIAS_SEMANA[dia.getDay()]}</span>
                <span className="font-semibold">{dia.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Horarios */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {HORARIOS.map((hora) => {
          const active = selectedTime === hora
          return (
            <button
              key={hora}
              type="button"
              onClick={() => setSelectedTime(hora)}
              className={cn(
                "rounded-md border-2 py-2 text-sm font-medium transition-all",
                active ? cn(area.theme.border, area.theme.bgSoft, area.theme.text) : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              {hora}
            </button>
          )
        })}
      </div>

      <Button
        type="button"
        disabled={!puedeConfirmar}
        onClick={handleConfirm}
        className={cn("w-full text-white", area.theme.bg, area.theme.bgHover)}
      >
        <CalendarCheck className="w-4 h-4 mr-2" aria-hidden="true" />
        Confirmar agendamiento
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Lock className="w-3 h-3" aria-hidden="true" />
        Tu información está protegida y es confidencial.
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium text-slate-700">{label}</p>
      {children}
    </div>
  )
}
