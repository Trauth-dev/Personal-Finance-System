"use client"

import { CalendarCheck, Monitor, MapPin, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { formatGuaranies } from "@/lib/asesoramiento/areas-config"
import type { AgendamientoSeleccion } from "./agendamiento-panel"

interface ConfirmacionDialogProps {
  seleccion: AgendamientoSeleccion | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfirmacionDialog({ seleccion, open, onOpenChange }: ConfirmacionDialogProps) {
  if (!seleccion) return null

  const { area, profesional, modalidad, servicioId, primeraSesion, fechaISO, hora, temas } = seleccion
  const servicio = area.servicios.find((s) => s.id === servicioId)
  const temasLabels = temas.map((id) => area.temas.find((t) => t.id === id)?.label).filter(Boolean).join(", ")
  const fecha = new Date(fechaISO).toLocaleDateString("es-PY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-full text-white", area.theme.bg)}>
              <CalendarCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <DialogTitle>Resumen de tu agendamiento</DialogTitle>
          </div>
        </DialogHeader>

        <dl className="space-y-3 py-2 text-sm">
          <Row label="Área" value={area.nombre} />
          {temasLabels && <Row label="Temas" value={temasLabels} />}
          <Row label="Profesional" value={profesional.nombre} />
          {servicio && <Row label="Servicio" value={servicio.label} />}
          <Row
            label="Modalidad"
            value={
              <span className="inline-flex items-center gap-1.5">
                {modalidad === "online" ? <Monitor className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                {modalidad === "online" ? "Online" : "Presencial"}
              </span>
            }
          />
          <Row label="Fecha" value={<span className="capitalize">{fecha}</span>} />
          <Row label="Hora" value={hora} />
          <Row label="Primera sesión" value={primeraSesion ? "Sí" : "No"} />
          <Row label="Precio" value={<span className="font-bold">{formatGuaranies(profesional.precioPorSesion)}</span>} />
        </dl>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Esta es una vista previa del agendamiento. El pago y la confirmación con el profesional se habilitarán en la
            próxima etapa.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Volver
          </Button>
          <Button
            type="button"
            disabled
            className={cn("text-white", area.theme.bg)}
          >
            Continuar al pago (próximamente)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800 text-right">{value}</dd>
    </div>
  )
}
