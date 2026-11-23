"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSuscripcion } from "@/hooks/use-suscripcion"

interface Aviso {
  id: string
  titulo: string
  texto: string
}

/** Avisos del plan: prueba gratuita a 7 días y a 1 día de terminar. */
function useAvisos(): Aviso[] {
  const s = useSuscripcion()
  if (s.isLoading || !s.prueba || s.diasPrueba > 7) return []
  const hito = s.diasPrueba <= 1 ? 1 : 7
  return [
    {
      id: `prueba-${hito}-${s.pruebaVence}`,
      titulo: hito === 1 ? "Tu prueba gratuita termina mañana" : "Tu prueba gratuita termina en 7 días",
      texto:
        hito === 1
          ? "Elegí un plan hoy para no perder el acceso a tus herramientas."
          : `Te quedan ${s.diasPrueba} días gratis. Elegí tu plan para seguir sin interrupciones.`,
    },
  ]
}

const CLAVE_VISTOS = "prospera_avisos_vistos"

export function NotificacionesPlan() {
  const avisos = useAvisos()
  const [vistos, setVistos] = useState<string[]>([])

  useEffect(() => {
    try {
      setVistos(JSON.parse(localStorage.getItem(CLAVE_VISTOS) ?? "[]"))
    } catch {
      setVistos([])
    }
  }, [])

  const sinLeer = avisos.filter((a) => !vistos.includes(a.id))

  const marcarVistos = (abierto: boolean) => {
    if (!abierto || sinLeer.length === 0) return
    const nuevos = [...vistos, ...sinLeer.map((a) => a.id)]
    setVistos(nuevos)
    localStorage.setItem(CLAVE_VISTOS, JSON.stringify(nuevos))
  }

  return (
    <DropdownMenu onOpenChange={marcarVistos}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 sm:h-9 sm:w-9"
          aria-label={sinLeer.length ? `Notificaciones (${sinLeer.length} sin leer)` : "Notificaciones"}
        >
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {sinLeer.length > 0 && (
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary sm:right-1 sm:top-1 sm:h-2 sm:w-2" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {avisos.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">No tenés notificaciones nuevas.</p>
        ) : (
          avisos.map((a) => (
            <DropdownMenuItem key={a.id} asChild className="cursor-pointer items-start gap-3 py-2.5">
              <Link href="/dashboard/personal/mejorar-plan">
                <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium">{a.titulo}</span>
                  <span className="text-xs leading-relaxed text-muted-foreground">{a.texto}</span>
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
