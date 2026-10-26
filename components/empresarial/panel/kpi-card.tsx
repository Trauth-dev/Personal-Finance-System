import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { formatGuaranies } from "@/lib/utils"
import { cn } from "@/lib/utils"

const TONOS = {
  violeta: { icono: "bg-violet-500/20 text-violet-300", barra: "bg-violet-400" },
  naranja: { icono: "bg-orange-500/20 text-orange-300", barra: "bg-orange-400" },
  verde: { icono: "bg-emerald-500/20 text-emerald-300", barra: "bg-emerald-400" },
  azul: { icono: "bg-blue-500/20 text-blue-300", barra: "bg-blue-400" },
} as const

type Props = {
  titulo: string
  valor: number
  icono: LucideIcon
  tono: keyof typeof TONOS
  /** Variación porcentual vs. mes anterior; null si no hay base de comparación. */
  variacion: number | null
  /** En costos, subir es negativo. */
  subirEsMalo?: boolean
  serie: number[]
}

export function KpiCard({ titulo, valor, icono: Icono, tono, variacion, subirEsMalo, serie }: Props) {
  const colores = TONOS[tono]
  const maximo = Math.max(...serie.map((v) => Math.abs(v)), 1)
  const sube = (variacion ?? 0) >= 0
  const positivo = subirEsMalo ? !sube : sube

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-card p-5 text-card-foreground shadow-lg">
      <div className="flex items-center gap-4">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", colores.icono)}>
          <Icono className="size-6" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm text-muted-foreground">{titulo}</span>
          <span className="truncate text-xl font-bold tabular-nums">{formatGuaranies(valor)}</span>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          {variacion === null ? (
            <span className="font-medium text-muted-foreground">Sin datos previos</span>
          ) : (
            <span
              className={cn(
                "flex items-center gap-1 font-semibold tabular-nums",
                positivo ? "text-emerald-400" : "text-red-400",
              )}
            >
              {sube ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
              {`${sube ? "+" : ""}${variacion}%`}
            </span>
          )}
          <span className="text-muted-foreground">vs. mes anterior</span>
        </div>
        <div className="flex h-9 items-end gap-1" aria-hidden="true">
          {serie.map((v, i) => (
            <span
              key={i}
              className={cn("w-1.5 rounded-full", colores.barra, i === serie.length - 1 ? "opacity-100" : "opacity-50")}
              style={{ height: `${Math.max(12, (Math.abs(v) / maximo) * 100)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
