import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Reintentar } from "./reintentar"

export type Tono = "positivo" | "negativo" | "neutral"

export const claseTono: Record<Tono, string> = {
  positivo: "text-emerald-400",
  negativo: "text-destructive",
  neutral: "text-foreground",
}

export function ErrorDeCarga({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)} role="status">
      <span className="text-sm text-muted-foreground">No pudimos cargar este dato</span>
      <Reintentar />
    </div>
  )
}

export function Panel({
  titulo,
  accion,
  children,
  className,
}: {
  titulo: string
  accion?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-xl border border-border bg-card p-4 md:p-5", className)}>
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{titulo}</h2>
        {accion}
      </header>
      {children}
    </section>
  )
}

interface IndicadorProps {
  etiqueta: string
  alcance?: string
  error?: boolean
  valor?: ReactNode
  tono?: Tono
  detalle?: ReactNode
}

export function Indicador({ etiqueta, alcance, error, valor, tono = "neutral", detalle }: IndicadorProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
        {alcance && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
            {alcance}
          </span>
        )}
      </div>
      {error ? (
        <ErrorDeCarga />
      ) : (
        <>
          <p className={cn("break-words text-xl font-semibold tabular-nums leading-tight md:text-2xl", claseTono[tono])}>
            {valor}
          </p>
          {detalle && <div className="text-xs leading-relaxed text-muted-foreground">{detalle}</div>}
        </>
      )}
    </div>
  )
}
