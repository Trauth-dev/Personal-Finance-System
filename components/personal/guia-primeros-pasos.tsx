"use client"

import { useState } from "react"
import Link from "next/link"
import { Check, ChevronDown, PiggyBank, ArrowLeftRight, CreditCard, PieChart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ProgresoGuia = {
  caja: boolean
  movimiento: boolean
  deuda: boolean
  presupuesto: boolean
}

const PASOS = [
  {
    clave: "caja",
    icono: PiggyBank,
    titulo: "Creá tu caja de ahorro",
    texto: "Es el lugar donde guardás tu plata: tu cuenta del banco, la billetera o el efectivo. Poné un nombre y cuánto tenés hoy.",
    href: "/dashboard/personal/cajas-ahorro",
    accion: "Crear caja",
  },
  {
    clave: "movimiento",
    icono: ArrowLeftRight,
    titulo: "Cargá un ingreso o un gasto",
    texto: "Cada vez que cobrás o pagás algo, anotalo. Elegí si es ingreso o egreso, el monto y la categoría. Toma 10 segundos.",
    href: "/dashboard/carga",
    accion: "Hacer una carga",
  },
  {
    clave: "deuda",
    icono: CreditCard,
    titulo: "Anotá tus deudas",
    texto: "Tarjetas, préstamos o lo que debas. Con el monto y las cuotas te mostramos cuánto falta y cómo salir más rápido. Si no tenés, ¡mejor!",
    href: "/dashboard/personal/deudas",
    accion: "Cargar deudas",
  },
  {
    clave: "presupuesto",
    icono: PieChart,
    titulo: "Armá tu presupuesto del mes",
    texto: "Decidí cuánto querés gastar en cada cosa (comida, transporte, ocio). Te avisamos cuando te estés pasando.",
    href: "/dashboard/personal/presupuesto",
    accion: "Armar presupuesto",
  },
] as const

export function GuiaPrimerosPasos({ progreso }: { progreso: ProgresoGuia }) {
  const hechos = PASOS.filter((p) => progreso[p.clave]).length
  const [abierta, setAbierta] = useState(hechos < 2)

  if (hechos === PASOS.length) return null

  const siguiente = PASOS.find((p) => !progreso[p.clave])

  return (
    <section aria-labelledby="guia-titulo" className="rounded-xl border border-primary/30 bg-card">
      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        aria-controls="guia-pasos"
        className="flex w-full items-center gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
      >
        <div className="flex flex-1 flex-col gap-1">
          <h2 id="guia-titulo" className="text-base font-semibold text-foreground text-balance">
            Primeros pasos: dejá todo listo en 4 pasos
          </h2>
          <p className="text-sm text-muted-foreground">
            {hechos} de {PASOS.length} completados
            {siguiente && !abierta ? ` · Siguiente: ${siguiente.titulo}` : ""}
          </p>
          <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(hechos / PASOS.length) * 100}%` }} />
          </div>
        </div>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", abierta && "rotate-180")} aria-hidden="true" />
      </button>

      {abierta && (
        <ol id="guia-pasos" className="flex flex-col gap-2 px-4 pb-4">
          {PASOS.map((p, i) => {
            const hecho = progreso[p.clave]
            const esSiguiente = siguiente?.clave === p.clave
            const Icono = p.icono
            return (
              <li
                key={p.clave}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center",
                  esSiguiente ? "border-primary/50 bg-primary/5" : "border-border",
                )}
              >
                <div className="flex flex-1 items-start gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      hecho ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}
                    aria-hidden="true"
                  >
                    {hecho ? <Check className="size-4" /> : i + 1}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className={cn("flex items-center gap-2 text-sm font-medium", hecho ? "text-muted-foreground line-through" : "text-foreground")}>
                      <Icono className="size-4" aria-hidden="true" />
                      {p.titulo}
                      {hecho && <span className="sr-only">(completado)</span>}
                    </h3>
                    {!hecho && <p className="text-sm leading-relaxed text-muted-foreground">{p.texto}</p>}
                  </div>
                </div>
                {!hecho && (
                  <Button asChild size="sm" variant={esSiguiente ? "default" : "outline"} className="sm:self-center">
                    <Link href={p.href}>{p.accion}</Link>
                  </Button>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
