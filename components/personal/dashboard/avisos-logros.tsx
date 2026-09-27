import { CalendarClock, CircleAlert, CircleCheck, Gauge, Trophy } from "lucide-react"
import { formatMoney } from "@/lib/currency"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import type { Aviso, PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { Panel } from "./indicador"

function contenidoAviso(aviso: Aviso, moneda: string) {
  switch (aviso.tipo) {
    case "presupuesto_excedido":
      return {
        icono: <CircleAlert className="size-4 text-destructive" aria-hidden="true" />,
        titulo: `${getNombreCategoriaDisplay(aviso.categoria)} superó su presupuesto`,
        detalle: `Excedido por ${formatMoney(aviso.excedente, moneda)}`,
      }
    case "presupuesto_cerca":
      return {
        icono: <Gauge className="size-4 text-accent" aria-hidden="true" />,
        titulo: `${getNombreCategoriaDisplay(aviso.categoria)} está cerca de su presupuesto`,
        detalle: `Te queda ${aviso.porcentajeRestante}% disponible`,
      }
    case "proximo_pago":
      return {
        icono: <CalendarClock className="size-4 text-accent" aria-hidden="true" />,
        titulo:
          aviso.dias === 0
            ? `${aviso.nombre} vence hoy`
            : `${aviso.nombre} vence en ${aviso.dias} ${aviso.dias === 1 ? "día" : "días"}`,
        detalle: formatMoney(aviso.monto, moneda),
      }
  }
}

export function AvisosYLogros({ data }: { data: PersonalDashboardData }) {
  const logros = data.logros.ok ? data.logros.data : []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel titulo="Para tener en cuenta">
        {data.avisos.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck className="size-4 text-emerald-400" aria-hidden="true" />
            Todo en orden este mes.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.avisos.map((aviso) => {
              const { icono, titulo, detalle } = contenidoAviso(aviso, data.moneda)
              return (
                <li key={aviso.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5">{icono}</span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm text-foreground">{titulo}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">{detalle}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {logros.length > 0 && (
        <Panel titulo="Logros recientes">
          <ul className="flex flex-col gap-3">
            {logros.map((logro) => (
              <li key={logro.id} className="flex items-start gap-2.5">
                <Trophy className="mt-0.5 size-4 text-primary" aria-hidden="true" />
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-foreground">{logro.titulo}</span>
                  {logro.descripcion && (
                    <span className="text-xs leading-relaxed text-muted-foreground">{logro.descripcion}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
