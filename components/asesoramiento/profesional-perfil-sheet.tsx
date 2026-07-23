"use client"

import { Monitor, MapPin, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { ProfesionalAvatar } from "./profesional-avatar"
import { formatGuaranies, type AreaConfig, type Profesional } from "@/lib/asesoramiento/areas-config"

interface ProfesionalPerfilSheetProps {
  area: AreaConfig
  profesional: Profesional | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onElegir: (profesional: Profesional) => void
}

export function ProfesionalPerfilSheet({
  area,
  profesional,
  open,
  onOpenChange,
  onElegir,
}: ProfesionalPerfilSheetProps) {
  if (!profesional) return null

  const temasLabels = profesional.temas
    .map((tid) => area.temas.find((t) => t.id === tid)?.label)
    .filter(Boolean) as string[]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-4">
            <ProfesionalAvatar
              nombre={profesional.nombre}
              bgClass={area.theme.bg}
              fotoUrl={profesional.fotoUrl}
              className="w-16 h-16"
            />
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">{profesional.nombre}</SheetTitle>
              <SheetDescription className={cn("font-medium", area.theme.text)}>
                {profesional.titulo}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {profesional.esEjemplo && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
              Perfil de ejemplo. Los profesionales reales se mostrarán aquí próximamente.
            </div>
          )}

          {typeof profesional.experienciaAnios === "number" && (
            <div className={cn("rounded-lg px-4 py-3", area.theme.bgSoft)}>
              <p className={cn("text-2xl font-bold leading-none", area.theme.text)}>
                +{profesional.experienciaAnios} años
              </p>
              <p className="mt-1 text-xs text-slate-600">de experiencia enseñando finanzas</p>
            </div>
          )}

          <section>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Sobre el profesional</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{profesional.descripcion}</p>
          </section>

          {profesional.especialidades && profesional.especialidades.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Áreas de especialidad</h4>
              <div className="flex flex-wrap gap-1.5">
                {profesional.especialidades.map((esp) => (
                  <span
                    key={esp}
                    className={cn("rounded-full px-2.5 py-1 text-xs font-medium", area.theme.bgSoft, area.theme.text)}
                  >
                    {esp}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profesional.formacion && profesional.formacion.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Formación</h4>
              <ul className="space-y-1.5">
                {profesional.formacion.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                    <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", area.theme.accentBg)} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {profesional.logros && profesional.logros.length > 0 && (
            <section>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Logros destacados</h4>
              <ul className="space-y-1.5">
                {profesional.logros.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                    <Check className={cn("mt-0.5 h-4 w-4 shrink-0", area.theme.text)} aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Temas que trabaja</h4>
            <div className="flex flex-wrap gap-1.5">
              {temasLabels.map((label) => (
                <span
                  key={label}
                  className={cn("rounded-full px-2.5 py-1 text-xs font-medium", area.theme.bgSoft, area.theme.text)}
                >
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Modalidades</h4>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              {profesional.modalidades.includes("online") && (
                <span className="inline-flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" aria-hidden="true" /> Online
                </span>
              )}
              {profesional.modalidades.includes("presencial") && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Presencial
                </span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Precio por sesión</span>
              <span className="text-xl font-bold text-slate-800">
                {formatGuaranies(profesional.precioPorSesion)}
              </span>
            </div>
          </section>

          <Button
            type="button"
            onClick={() => onElegir(profesional)}
            className={cn("w-full text-white", area.theme.bg, area.theme.bgHover)}
          >
            <Check className="w-4 h-4 mr-2" aria-hidden="true" />
            Elegir este profesional
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
