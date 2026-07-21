import type { SVGProps } from "react"

/**
 * Icono a medida para el area de Psicologia: silueta de cabeza de perfil
 * con el contorno del cerebro. No existe un equivalente en lucide-react,
 * por lo que se dibuja con el mismo estilo de linea (stroke) de lucide para
 * mantener coherencia visual con el resto de los iconos.
 */
export function HeadBrainIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Contorno de la cabeza de perfil (mirando a la izquierda) */}
      <path d="M6.8 20v-2.7c-2.3-1.1-3.8-3.4-3.8-6C3 7.3 6.6 3.8 11 3.8c4.1 0 7.2 2.9 7.2 6.7 0 1.5-.5 2.8-1.4 3.9-.5.6-.8 1.2-.8 2v.9c0 .8-.7 1.5-1.5 1.5h-1.3V20" />
      {/* Contorno del cerebro (pliegues) */}
      <path d="M8.2 11.2c-.7 0-1.2-.6-1.2-1.3 0-.7.5-1.3 1.2-1.4.1-.8.8-1.4 1.6-1.4.5 0 1 .2 1.3.6" />
      <path d="M11.1 7.3c.3-.5.9-.8 1.5-.8 1 0 1.8.8 1.8 1.8 0 .2 0 .4-.1.6" />
      <path d="M11.2 7.4v5.1c0 .9-.7 1.6-1.6 1.6-.8 0-1.4-.5-1.6-1.2" />
      <path d="M11.2 10.3c.4.4 1 .7 1.6.7" />
    </svg>
  )
}
