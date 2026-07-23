"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { AREAS, type AreaConfig } from "@/lib/asesoramiento/areas-config"

interface AreaSelectorProps {
  selectedAreaId: string
  onSelect: (area: AreaConfig) => void
}

export function AreaSelector({ selectedAreaId, onSelect }: AreaSelectorProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {AREAS.map((area) => {
        const Icon = area.icon
        const isSelected = area.id === selectedAreaId
        const isDisabled = !area.activa

        return (
          <button
            key={area.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(area)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex flex-col items-center text-center rounded-xl border-2 bg-white p-4 sm:p-5 transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isSelected
                ? cn(area.theme.border, area.theme.bgSoft, "ring-1", area.theme.ring)
                : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
              isDisabled && "opacity-50 cursor-not-allowed hover:border-slate-200 hover:shadow-none",
            )}
          >
            {isSelected && (
              <span
                className={cn(
                  "absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full text-white",
                  area.theme.bg,
                )}
              >
                <Check className="w-3 h-3" aria-hidden="true" />
              </span>
            )}
            <span
              className={cn(
                "flex items-center justify-center w-11 h-11 rounded-lg mb-2",
                isSelected ? area.theme.bgSoft : "bg-slate-100",
              )}
            >
              <Icon className={cn("w-6 h-6", isSelected ? area.theme.text : "text-slate-600")} aria-hidden="true" />
            </span>
            <span className="font-semibold text-slate-800 text-sm sm:text-base leading-tight text-balance">
              {area.nombre}
            </span>
            <span className="text-xs text-slate-500 mt-1 leading-snug text-pretty">
              {area.descripcionCorta}
            </span>
            {isDisabled && (
              <span className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Próximamente
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
