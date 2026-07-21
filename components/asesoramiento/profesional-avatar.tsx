import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfesionalAvatarProps {
  nombre: string
  // clase de fondo del acento del area (ej. "bg-emerald-600")
  bgClass: string
  className?: string
  iconClassName?: string
}

/**
 * Avatar neutro para profesionales de ejemplo.
 * Evitamos fotos de personas ficticias: usamos un icono sobre el color del area.
 * Cuando existan profesionales reales, se reemplaza por su foto.
 */
export function ProfesionalAvatar({ nombre, bgClass, className, iconClassName }: ProfesionalAvatarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white shrink-0",
        bgClass,
        className,
      )}
      role="img"
      aria-label={`Avatar de ${nombre}`}
    >
      <UserRound className={cn("w-1/2 h-1/2", iconClassName)} aria-hidden="true" />
    </div>
  )
}
