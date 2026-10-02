import type { ResumenAdmin } from "@/lib/admin/datos"
import { fmtGs, fmtNum } from "@/components/admin/formato"

function Kpi({ label, valor, detalle }: { label: string; valor: string; detalle: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">{valor}</span>
      <span className="text-xs leading-relaxed text-muted-foreground">{detalle}</span>
    </div>
  )
}

export function ResumenKpis({ resumen }: { resumen: ResumenAdmin }) {
  return (
    <section aria-label="Indicadores generales" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Kpi label="Usuarios" valor={fmtNum(resumen.total)} detalle={`+${resumen.nuevos30} en los últimos 30 días`} />
      <Kpi
        label="Activos 7 días"
        valor={fmtNum(resumen.activos7)}
        detalle={`${resumen.activos30} usaron la app en 30 días`}
      />
      <Kpi
        label="Activación"
        valor={`${resumen.tasaActivacion}%`}
        detalle={`${resumen.conDatos} cargaron al menos un dato`}
      />
      <Kpi
        label="Requieren atención"
        valor={fmtNum(resumen.sinActivar + resumen.enRiesgo + resumen.inactivos)}
        detalle={`${resumen.sinActivar} sin activar · ${resumen.enRiesgo} en riesgo · ${resumen.inactivos} inactivos`}
      />
      <Kpi
        label="Restringidas"
        valor={fmtNum(resumen.pausados + resumen.bloqueados)}
        detalle={`${resumen.pausados} pausadas · ${resumen.bloqueados} bloqueadas`}
      />
      <Kpi
        label="Recaudado"
        valor={fmtGs(resumen.recaudadoTotal)}
        detalle={resumen.pagosPendientes ? `${resumen.pagosPendientes} pagos sin confirmar` : "Pagos confirmados"}
      />
    </section>
  )
}
