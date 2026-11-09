"use client"

import Link from "next/link"
import useSWR from "swr"
import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type Estado = { estado?: string; entorno?: string; venceNuevo?: string | null; error?: string }

const fetcher = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json() as Promise<Estado>)
const FINALES = new Set(["pagado", "rechazado", "cancelado", "revertido", "error"])

export function ResultadoPago({ spid, cancelado }: { spid: string; cancelado: boolean }) {
  const { data } = useSWR(`/api/bancard/estado?spid=${encodeURIComponent(spid)}${cancelado ? "&cancelado=1" : ""}`, fetcher, {
    refreshInterval: (d) => (d?.estado && FINALES.has(d.estado)) || d?.error ? 0 : 4000,
    revalidateOnFocus: false,
  })

  const estado = data?.estado ?? (data?.error ? "error" : "pendiente")
  const pagado = estado === "pagado"
  const fallido = estado === "rechazado" || estado === "cancelado" || estado === "revertido" || estado === "error"

  const titulo = pagado
    ? "¡Pago confirmado!"
    : estado === "rechazado"
      ? "Pago rechazado"
      : estado === "cancelado"
        ? "Pago cancelado"
        : estado === "revertido"
          ? "Pago revertido"
          : estado === "error"
            ? "No pudimos verificar el pago"
            : "Verificando tu pago..."

  const detalle = pagado
    ? `Tu plan ya está activo${data?.venceNuevo ? ` hasta el ${new Date(data.venceNuevo).toLocaleDateString("es-PY")}` : ""}.`
    : fallido
      ? "No se realizó ningún cobro. Podés intentarlo de nuevo cuando quieras."
      : "Estamos confirmando el pago con Bancard. Esta página se actualiza sola."

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center" aria-live="polite">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          pagado ? "bg-emerald-500/15 text-emerald-400" : fallido ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
        }`}
      >
        {pagado ? <CheckCircle2 className="h-8 w-8" /> : fallido ? <XCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{detalle}</p>
        {data?.entorno === "staging" && <p className="text-xs text-amber-400">Operación de prueba (staging).</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
          <Link href="/dashboard/personal">Ir a mi panel</Link>
        </Button>
        {fallido && (
          <Button asChild variant="outline">
            <Link href="/dashboard/personal/mejorar-plan">Volver a planes</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
