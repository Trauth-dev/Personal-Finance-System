import Link from "next/link"
import { formatMoney } from "@/lib/currency"
import { getNombreCategoriaDisplay } from "@/lib/categorias-egreso"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { ErrorDeCarga, Panel } from "./indicador"

export function PresupuestoCategorias({ data }: { data: PersonalDashboardData }) {
  const { presupuesto, moneda, cajaId } = data
  const dinero = (n: number) => formatMoney(n, moneda)

  if (presupuesto.ok && !presupuesto.data.configurado) return null

  return (
    <Panel
      titulo="Presupuesto por categoría"
      accion={
        <div className="flex items-center gap-3">
          {cajaId && <span className="text-xs text-muted-foreground">Total personal</span>}
          <Link href="/dashboard/personal/presupuesto" className="text-xs font-medium text-accent hover:underline">
            Ver presupuesto
          </Link>
        </div>
      }
    >
      {!presupuesto.ok ? (
        <ErrorDeCarga />
      ) : (
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
          {presupuesto.data.lineas.map((linea) => {
            const excedido = linea.porcentaje > 100
            const cerca = !excedido && linea.porcentaje >= 85
            return (
              <li key={linea.categoria} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-foreground">
                    {getNombreCategoriaDisplay(linea.categoria)}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-semibold tabular-nums ${
                      excedido ? "text-destructive" : cerca ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {Math.round(linea.porcentaje)}% utilizado
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${excedido ? "bg-destructive" : cerca ? "bg-accent" : "bg-primary"}`}
                    style={{ width: `${Math.min(linea.porcentaje, 100)}%` }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                  <span className="text-muted-foreground">
                    {dinero(linea.utilizado)} de {dinero(linea.presupuestado)}
                  </span>
                  <span className={excedido ? "font-medium text-destructive" : "text-muted-foreground"}>
                    {excedido ? `Excedido por ${dinero(-linea.restante)}` : `${dinero(linea.restante)} disponibles`}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
