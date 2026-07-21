"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AreaConfig } from "@/lib/asesoramiento/areas-config"

interface TemaChipsProps {
  area: AreaConfig
  selectedTemas: string[]
  onToggle: (temaId: string) => void
}

export function TemaChips({ area, selectedTemas, onToggle }: TemaChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {area.temas.map((tema) => {
        const isSelected = selectedTemas.includes(tema.id)
        return (
          <button
            key={tema.id}
            type="button"
            onClick={() => onToggle(tema.id)}
            aria-pressed={isSelected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              isSelected
                ? cn(area.theme.border, area.theme.bgSoft, area.theme.text, area.theme.ring)
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {tema.label}
            {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
