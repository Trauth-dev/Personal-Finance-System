import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfesionalAvatarProps {
  nombre: string
  // clase de fondo del acento del area (ej. "bg-emerald-600")
  bgClass: string
  className?: string
  iconClassName?: string
  // Foto real del profesional (ruta en /public). Si no se pasa, se usa el icono neutro.
  fotoUrl?: string
}

/**
 * Avatar de profesionales.
 * - Profesionales reales: muestra su foto de perfil (fotoUrl).
 * - Profesionales de ejemplo: icono neutro sobre el color del area
 *   (evitamos fotos de personas ficticias).
 */
export function ProfesionalAvatar({ nombre, bgClass, className, iconClassName, fotoUrl }: ProfesionalAvatarProps) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl || "/placeholder.svg"}
        alt={`Foto de ${nombre}`}
        className={cn("rounded-full object-cover object-top shrink-0", className)}
      />
    )
  }

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
