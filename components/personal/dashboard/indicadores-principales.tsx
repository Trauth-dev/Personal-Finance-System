import Link from "next/link"
import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatMoney, getCurrencySymbol } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"
import { ErrorDeCarga, Indicador } from "./indicador"

const porcentaje = (valor: number) =>
  `${valor.toLocaleString("es-PY", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`

export function IndicadoresPrincipales({ data }: { data: PersonalDashboardData }) {
  const { moneda, movimientos, disponible, deuda, presupuesto, cajaId, cajaNombre } = data
  const dinero = (n: number) => formatMoney(n, moneda)
  const alcanceGeneral = cajaId ? "Total personal" : undefined
  const resumen = movimientos.ok ? movimientos.data.resumen : null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Indicador
          etiqueta="Ingresos del mes"
          error={!movimientos.ok}
          valor={resumen && dinero(resumen.ingresos)}
          detalle={
            movimientos.ok &&
            (movimientos.data.variacionIngresos === null ? (
              resumen?.cantidadIngresos === 0 ? (
                "Sin ingresos registrados"
              ) : (
                "Sin datos comparables del mes anterior"
              )
            ) : (
              <span className="inline-flex items-center gap-1">
                {movimientos.data.variacionIngresos >= 0 ? (
                  <ArrowUpRight className="size-3.5 text-emerald-400" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="size-3.5 text-destructive" aria-hidden="true" />
                )}
                <span className="text-foreground">{porcentaje(Math.abs(movimientos.data.variacionIngresos))}</span>
                {movimientos.data.comparacionParcial ? "vs. mismo período del mes anterior" : "vs. mes anterior"}
              </span>
            ))
          }
        />

        <Indicador
          etiqueta="Gastos del mes"
          error={!movimientos.ok}
          valor={resumen && dinero(resumen.gastos)}
          detalle={
            resumen &&
            (resumen.pagosDeuda > 0
              ? `No incluye ${dinero(resumen.pagosDeuda)} en pagos de deudas`
              : resumen.cantidadGastos === 0
                ? "Sin gastos registrados"
                : `${resumen.cantidadGastos} ${resumen.cantidadGastos === 1 ? "movimiento" : "movimientos"}`)
          }
        />

        <Indicador
          etiqueta="Resultado del mes"
          error={!movimientos.ok}
          tono={!resumen || resumen.resultado === 0 ? "neutral" : resumen.resultado > 0 ? "positivo" : "negativo"}
          valor={resumen && dinero(resumen.resultado)}
          detalle={
            resumen &&
            (resumen.cantidadIngresos === 0 && resumen.cantidadGastos === 0
              ? "Sin movimientos en el mes"
              : resumen.resultado > 0
                ? "Superávit: ingresaste más de lo que gastaste"
                : resumen.resultado < 0
                  ? "Déficit: gastaste más de lo que ingresaste"
                  : "Equilibrado")
          }
        />

        <Indicador
          etiqueta="Disponible hoy"
          alcance="Hoy"
          error={!disponible.ok}
          valor={disponible.ok && formatMoney(disponible.data[0].total, disponible.data[0].moneda)}
          tono={disponible.ok && disponible.data[0].total < 0 ? "negativo" : "neutral"}
          detalle={
            disponible.ok && (
              <div className="flex flex-col gap-0.5">
                {disponible.data.slice(1).map((s) => (
                  <span key={s.moneda} className="tabular-nums text-foreground">
                    + {formatMoney(s.total, s.moneda)}
                  </span>
                ))}
                <span>{cajaNombre ?? "Total en tus cuentas y cajas"}</span>
              </div>
            )
          }
        />

        <Indicador
          etiqueta="Deuda pendiente"
          alcance={alcanceGeneral}
          error={!deuda.ok}
          valor={deuda.ok && dinero(deuda.data.total)}
          detalle={
            deuda.ok &&
            (deuda.data.activas === 0
              ? "Sin deudas activas"
              : `${deuda.data.activas} ${deuda.data.activas === 1 ? "deuda activa" : "deudas activas"}`)
          }
        />

        <Indicador
          etiqueta="Presupuesto disponible"
          alcance={alcanceGeneral}
          error={!presupuesto.ok}
          tono={presupuesto.ok && presupuesto.data.configurado && presupuesto.data.disponible < 0 ? "negativo" : "neutral"}
          valor={
            presupuesto.ok &&
            (presupuesto.data.configurado ? (
              dinero(presupuesto.data.disponible)
            ) : (
              <span className="text-base font-medium text-muted-foreground">No configurado</span>
            ))
          }
          detalle={
            presupuesto.ok &&
            (!presupuesto.data.configurado ? (
              <Link href="/dashboard/personal/presupuesto" className="font-medium text-accent hover:underline">
                Configurar presupuesto
              </Link>
            ) : presupuesto.data.disponible < 0 ? (
              `Excedido por ${dinero(-presupuesto.data.disponible)}`
            ) : (
              `${Math.round((presupuesto.data.utilizado / presupuesto.data.total) * 100)}% utilizado de ${dinero(presupuesto.data.total)}`
            ))
          }
        />
      </div>

      <MargenDelMes data={data} />
    </div>
  )
}

function MargenDelMes({ data }: { data: PersonalDashboardData }) {
  const simbolo = getCurrencySymbol(data.moneda)

  if (!data.movimientos.ok) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Margen del mes</span>
        <ErrorDeCarga />
      </div>
    )
  }

  const margen = data.movimientos.data.margen
  const ancho = margen === null ? 0 : Math.min(Math.max(margen, 0), 100)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Margen del mes</span>
        {margen !== null && (
          <span className={`text-lg font-semibold tabular-nums ${margen >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {porcentaje(margen)}
          </span>
        )}
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
        {margen === null
          ? "Sin ingresos en el mes para calcular el margen."
          : margen >= 0
            ? `De cada ${simbolo} 100 que ingresaron, te quedaron ${simbolo} ${Math.round(margen)}.`
            : `De cada ${simbolo} 100 que ingresaron, gastaste ${simbolo} ${Math.round(100 - margen)}.`}
      </p>
      {margen !== null && (
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted sm:w-40"
          role="img"
          aria-label={`Margen del ${porcentaje(margen)}`}
        >
          <div
            className={`h-full rounded-full ${margen >= 0 ? "bg-emerald-400" : "bg-destructive"}`}
            style={{ width: `${margen < 0 ? 100 : ancho}%` }}
          />
        </div>
      )}
    </div>
  )
}
