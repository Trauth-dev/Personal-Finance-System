"use client"

import { Monitor, MapPin, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ProfesionalAvatar } from "./profesional-avatar"
import { formatGuaranies, type AreaConfig, type Profesional } from "@/lib/asesoramiento/areas-config"

interface ProfesionalCardProps {
  area: AreaConfig
  profesional: Profesional
  isSelected: boolean
  onSelect: () => void
  onVerPerfil: () => void
}

export function ProfesionalCard({ area, profesional, isSelected, onSelect, onVerPerfil }: ProfesionalCardProps) {
  const temasLabels = profesional.temas
    .map((tid) => area.temas.find((t) => t.id === tid)?.label)
    .filter(Boolean) as string[]

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border-2 bg-white p-4 transition-all duration-200 h-full",
        isSelected ? cn(area.theme.border, "shadow-sm") : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <ProfesionalAvatar
            nombre={profesional.nombre}
            bgClass={area.theme.bg}
            fotoUrl={profesional.fotoUrl}
            className="w-12 h-12"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-800 text-sm leading-tight truncate">{profesional.nombre}</h3>
            <p className={cn("text-xs font-medium", area.theme.text)}>{profesional.titulo}</p>
          </div>
        </div>
        {profesional.esEjemplo && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Ejemplo
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-3">{profesional.descripcion}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {temasLabels.map((label) => (
          <span
            key={label}
            className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", area.theme.bgSoft, area.theme.text)}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
        {profesional.modalidades.includes("online") && (
          <span className="inline-flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5" aria-hidden="true" /> Online
          </span>
        )}
        {profesional.modalidades.includes("presencial") && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Presencial
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-amber-600">
          <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Próximamente
        </span>
      </div>

      <div className="mt-auto">
        <p className="text-lg font-bold text-slate-800 mb-2">
          {formatGuaranies(profesional.precioPorSesion)}{" "}
          <span className="text-xs font-normal text-slate-500">/ sesión</span>
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={onSelect}
            className={cn("flex-1 text-white", area.theme.bg, area.theme.bgHover)}
          >
            {isSelected ? "Seleccionado" : "Elegir"}
          </Button>
          <Button type="button" variant="outline" onClick={onVerPerfil} className="flex-1">
            Ver perfil
          </Button>
        </div>
      </div>
    </div>
  )
}
