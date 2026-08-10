"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log completo para diagnóstico (visible en la consola del navegador).
    console.error("[v0] Dashboard error boundary:", error)
    console.error("[v0] Dashboard error message:", error?.message)
    console.error("[v0] Dashboard error stack:", error?.stack)
    if (error?.digest) console.error("[v0] Dashboard error digest:", error.digest)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground text-balance">
          Ocurrió un problema al mostrar esta sección
        </h2>
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          Tus datos están seguros. Podés reintentar y, si el problema continúa, recargá la página.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => reset()} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Reintentar
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recargar página
        </Button>
      </div>
      {error?.digest ? (
        <p className="text-xs text-muted-foreground">Código de referencia: {error.digest}</p>
      ) : null}
    </div>
  )
}
