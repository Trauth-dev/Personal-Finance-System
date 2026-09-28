import Link from "next/link"
import { formatMoney } from "@/lib/currency"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import { formatearFechaCorta } from "@/lib/dashboard/fechas"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { ErrorDeCarga, Panel } from "./indicador"

const vacio = <p className="text-sm text-muted-foreground">Sin gastos registrados en este período.</p>

export function DistribucionGastos({ data }: { data: PersonalDashboardData }) {
  const { movimientos, moneda } = data
  return (
    <Panel
      titulo="Distribución de gastos"
      accion={
        movimientos.ok &&
        movimientos.data.resumen.gastos > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            Total {formatMoney(movimientos.data.resumen.gastos, moneda)}
          </span>
        )
      }
    >
      {!movimientos.ok ? (
        <ErrorDeCarga />
      ) : movimientos.data.distribucion.length === 0 ? (
        vacio
      ) : (
        <ul className="flex flex-col gap-3">
          {movimientos.data.distribucion.map((c) => (
            <li key={c.categoria} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-foreground">{getNombreCategoriaDisplay(c.categoria)}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="text-foreground">{formatMoney(c.monto, moneda)}</span> ·{" "}
                  {c.porcentaje.toLocaleString("es-PY", { maximumFractionDigits: 1 })}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${c.porcentaje}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

export function PrincipalesGastos({ data }: { data: PersonalDashboardData }) {
  const { movimientos, moneda } = data
  return (
    <Panel
      titulo="Principales gastos"
      accion={
        <Link href="/dashboard/personal/historial" className="text-xs font-medium text-accent hover:underline">
          Ver historial
        </Link>
      }
    >
      {!movimientos.ok ? (
        <ErrorDeCarga />
      ) : movimientos.data.principales.length === 0 ? (
        vacio
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {movimientos.data.principales.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm text-foreground">
                  {g.concepto || g.subcategoria || getNombreCategoriaDisplay(g.categoria) || "Sin concepto"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {getNombreCategoriaDisplay(g.categoria) || "Sin categoría"} · {formatearFechaCorta(g.fecha)}
                </span>
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {formatMoney(g.monto, moneda)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  )
}
