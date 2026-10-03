import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface VariacionProps {
  valor: number | null
  parcial: boolean
  /** En gastos, subir es negativo. */
  subirEsBueno?: boolean
  className?: string
}

export function etiquetaComparacion(parcial: boolean) {
  return parcial ? "vs mismo día del mes anterior" : "vs mes anterior"
}

export function Variacion({ valor, parcial, subirEsBueno = true, className }: VariacionProps) {
  if (valor === null) {
    return <p className={cn("mt-1 text-xs font-medium text-slate-500", className)}>Sin datos del mes anterior</p>
  }

  const sube = valor >= 0
  const positivo = sube === subirEsBueno
  const color = positivo ? "text-green-600" : "text-red-600"
  const Icono = sube ? ArrowUpRight : ArrowDownRight

  return (
    <div className={cn("mt-1 flex items-center gap-1", className)}>
      <Icono className={cn("h-3 w-3", color)} aria-hidden="true" />
      <p className={cn("text-xs font-medium", color)}>
        {Math.abs(valor).toFixed(1)}% {etiquetaComparacion(parcial)}
      </p>
    </div>
  )
}
