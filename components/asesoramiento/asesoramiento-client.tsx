"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AreaSelector } from "./area-selector"
import { TemaChips } from "./tema-chips"
import { ProfesionalCard } from "./profesional-card"
import { ProfesionalPerfilSheet } from "./profesional-perfil-sheet"
import { AgendamientoPanel, type AgendamientoSeleccion } from "./agendamiento-panel"
import { ComoFunciona } from "./como-funciona"
import { ConfirmacionDialog } from "./confirmacion-dialog"
import { AREAS_ACTIVAS, getArea, type AreaConfig, type Profesional } from "@/lib/asesoramiento/areas-config"

const VISIBLES_INICIALES = 3

export function AsesoramientoClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialAreaId = searchParams.get("area")
  const initialArea = getArea(initialAreaId)?.activa ? (getArea(initialAreaId) as AreaConfig) : AREAS_ACTIVAS[0]
  const initialTemas = (searchParams.get("temas") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const [area, setArea] = useState<AreaConfig>(initialArea)
  const [selectedTemas, setSelectedTemas] = useState<string[]>(
    initialTemas.filter((id) => initialArea.temas.some((t) => t.id === id)),
  )
  const [selectedProfesional, setSelectedProfesional] = useState<Profesional | null>(null)
  const [verMas, setVerMas] = useState(false)
  const [perfilAbierto, setPerfilAbierto] = useState(false)
  const [perfilProfesional, setPerfilProfesional] = useState<Profesional | null>(null)
  const [confirmacion, setConfirmacion] = useState<AgendamientoSeleccion | null>(null)
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false)

  // Sincroniza el estado clave con la URL (permite volver atras / compartir)
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("area", area.id)
    if (selectedTemas.length) params.set("temas", selectedTemas.join(","))
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [area.id, selectedTemas, router])

  const handleSelectArea = useCallback((next: AreaConfig) => {
    setArea(next)
    setSelectedTemas([])
    setSelectedProfesional(null)
    setVerMas(false)
  }, [])

  const handleToggleTema = useCallback((temaId: string) => {
    setSelectedTemas((prev) =>
      prev.includes(temaId) ? prev.filter((t) => t !== temaId) : [...prev, temaId],
    )
  }, [])

  const profesionales = area.profesionales
  const profesionalesVisibles = verMas ? profesionales : profesionales.slice(0, VISIBLES_INICIALES)

  const abrirPerfil = (p: Profesional) => {
    setPerfilProfesional(p)
    setPerfilAbierto(true)
  }

  const elegirDesdePerfil = (p: Profesional) => {
    setSelectedProfesional(p)
    setPerfilAbierto(false)
  }

  const handleConfirm = (seleccion: AgendamientoSeleccion) => {
    setConfirmacion(seleccion)
    setConfirmacionAbierta(true)
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 text-balance">Asesoramiento Personalizado</h1>
        <p className="text-slate-500 mt-1">Elegí el área, seleccioná el tema y agendá tu sesión con un profesional.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Columna izquierda */}
        <div className="space-y-8 min-w-0">
          {/* Paso 1: Area */}
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">
              <span className={area.theme.text}>1.</span> Seleccioná el área a trabajar
            </h2>
            <AreaSelector selectedAreaId={area.id} onSelect={handleSelectArea} />

            <p className="text-sm text-slate-500 mt-4 mb-2">
              Temas dentro de <span className="font-semibold text-slate-700">{area.nombre}</span> (seleccioná uno o más)
            </p>
            <TemaChips area={area} selectedTemas={selectedTemas} onToggle={handleToggleTema} />
          </section>

          {/* Paso 2: Profesionales */}
          <section>
            <h2 className="text-base font-bold text-slate-800 mb-3">
              <span className={area.theme.text}>2.</span> Profesionales disponibles
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {profesionalesVisibles.map((p) => (
                <ProfesionalCard
                  key={p.id}
                  area={area}
                  profesional={p}
                  isSelected={selectedProfesional?.id === p.id}
                  onSelect={() => setSelectedProfesional(p)}
                  onVerPerfil={() => abrirPerfil(p)}
                />
              ))}
            </div>
            {profesionales.length > VISIBLES_INICIALES && (
              <div className="flex justify-center mt-4">
                <Button type="button" variant="outline" onClick={() => setVerMas((v) => !v)}>
                  {verMas ? "Ver menos" : "Ver más profesionales"}
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${verMas ? "rotate-180" : ""}`} aria-hidden="true" />
                </Button>
              </div>
            )}
          </section>

          <ComoFunciona />
        </div>

        {/* Columna derecha: agendamiento (sticky en desktop) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <AgendamientoPanel
            area={area}
            selectedTemas={selectedTemas}
            onToggleTema={handleToggleTema}
            profesional={selectedProfesional}
            profesionales={profesionales}
            onSelectProfesional={setSelectedProfesional}
            onConfirm={handleConfirm}
          />
        </div>
      </div>

      <ProfesionalPerfilSheet
        area={area}
        profesional={perfilProfesional}
        open={perfilAbierto}
        onOpenChange={setPerfilAbierto}
        onElegir={elegirDesdePerfil}
      />

      <ConfirmacionDialog
        seleccion={confirmacion}
        open={confirmacionAbierta}
        onOpenChange={setConfirmacionAbierta}
      />
    </div>
  )
}
