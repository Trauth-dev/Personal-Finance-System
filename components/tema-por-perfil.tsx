"use client"

import { useEffect } from "react"
import { usePerfil } from "@/lib/contexts/perfil-context"

/**
 * El perfil Empresarial usa un área de trabajo clara. Se aplica sobre <html>
 * para que también la tomen los diálogos y menús que se renderizan en portales.
 */
export function TemaPorPerfil() {
  const { perfilActual } = usePerfil()
  const claro = perfilActual?.tipo === "empresarial"

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("tema-claro", claro)
    return () => root.classList.remove("tema-claro")
  }, [claro])

  return null
}
