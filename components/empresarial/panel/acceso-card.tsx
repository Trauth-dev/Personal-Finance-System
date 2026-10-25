import Image from "next/image"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronRight, Clock } from "lucide-react"
import type { ReactNode } from "react"

type Accion = { label: string; href: string; secundaria?: boolean }

type Props = {
  titulo: string
  descripcion: string
  href: string
  icono: LucideIcon
  imagen: string
  acciones?: Accion[]
  extra?: ReactNode
}

export function AccesoCard({ titulo, descripcion, href, icono: Icono, imagen, acciones = [], extra }: Props) {
  return (
    <article className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <Image
        src={imagen}
        alt=""
        width={120}
        height={120}
        className="pointer-events-none absolute bottom-3 right-3 size-24 object-contain mix-blend-multiply sm:size-28"
      />
      <Link href={href} className="group relative flex items-start gap-4 rounded-lg">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
          <Icono className="size-6" aria-hidden="true" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 pr-6">
          <h3 className="text-lg font-bold text-foreground">{titulo}</h3>
          <p className="max-w-[16rem] text-sm leading-relaxed text-muted-foreground">{descripcion}</p>
        </div>
        <ChevronRight
          className="absolute right-0 top-1 size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>

      {extra}

      {acciones.length > 0 && (
        <div className="relative mt-auto flex flex-wrap gap-3">
          {acciones.map((a) =>
            a.secundaria ? (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Clock className="size-4" aria-hidden="true" />
                {a.label}
              </Link>
            ) : (
              <Link
                key={a.href}
                href={a.href}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                {a.label}
                <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ),
          )}
        </div>
      )}
    </article>
  )
}
