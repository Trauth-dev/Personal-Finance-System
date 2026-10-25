"use client"

import { useEffect } from "react"

/** Abre el formulario de alta cuando la URL trae ?nueva=1 (accesos rápidos del panel). */
export function useAbrirNuevo(abrir: () => void, listo = true) {
  useEffect(() => {
    if (!listo) return
    const url = new URL(window.location.href)
    if (url.searchParams.get("nueva") !== "1") return
    url.searchParams.delete("nueva")
    window.history.replaceState(null, "", url.pathname + url.search)
    abrir()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo])
}
