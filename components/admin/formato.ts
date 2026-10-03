import type { EstadoCuenta } from "@/lib/admin/config"
import type { EstadoPago, NivelAviso, Segmento } from "@/lib/admin/datos"

const TZ = "America/Asuncion"

const gs = new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 })
export const fmtGs = (n: number) => `${gs.format(n)} Gs`
export const fmtNum = (n: number) => gs.format(n)

export function fmtFecha(iso: string | null, conHora = false): string {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(iso))
}

export function fmtRelativo(iso: string | null): string {
  if (!iso) return "Nunca"
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Recién"
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return "Ayer"
  if (d < 30) return `Hace ${d} días`
  const m = Math.floor(d / 30)
  if (m < 12) return `Hace ${m} ${m === 1 ? "mes" : "meses"}`
  return `Hace ${Math.floor(m / 12)} año(s)`
}

export function fmtMes(clave: string): string {
  const [y, m] = clave.split("-").map(Number)
  return new Intl.DateTimeFormat("es-PY", { month: "short", year: "2-digit", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 15)),
  )
}

export const ESTADO_CUENTA_INFO: Record<EstadoCuenta, { label: string; clase: string }> = {
  activo: { label: "Activo", clase: "border-[hsl(var(--chart-4)/0.4)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]" },
  pausado: { label: "Pausado", clase: "border-accent/40 bg-accent/10 text-accent" },
  bloqueado: { label: "Bloqueado", clase: "border-destructive/40 bg-destructive/10 text-destructive" },
}

export const ESTADO_PAGO_INFO: Record<EstadoPago, { label: string; clase: string }> = {
  exento: { label: "Exento", clase: "text-primary" },
  activa: { label: "Al día", clase: "text-[hsl(var(--chart-4))]" },
  libre_temporal: { label: "Acceso libre", clase: "text-muted-foreground" },
  vencida: { label: "Vencida", clase: "text-destructive" },
  sin_pago: { label: "Sin pago", clase: "text-destructive" },
}

export const SEGMENTO_INFO: Record<Segmento, { label: string; descripcion: string }> = {
  nuevo: { label: "Nuevo", descripcion: "Alta en los últimos 7 días" },
  activo: { label: "Activo", descripcion: "Usó la app en los últimos 14 días" },
  en_riesgo: { label: "En riesgo", descripcion: "Entre 15 y 30 días sin uso" },
  inactivo: { label: "Inactivo", descripcion: "Más de 30 días sin uso" },
  sin_activar: { label: "Sin activar", descripcion: "Se registró pero nunca cargó datos" },
}

export const AVISO_CLASE: Record<NivelAviso, string> = {
  alto: "bg-destructive",
  medio: "bg-accent",
  info: "bg-muted-foreground",
}

export const ACCION_LABEL: Record<string, string> = {
  estado_activo: "Reactivó la cuenta",
  estado_pausado: "Pausó la cuenta",
  estado_bloqueado: "Bloqueó la cuenta",
  observaciones: "Editó observaciones",
  suscripcion_extendida: "Extendió la suscripción",
  suscripcion_anulada: "Anuló la suscripción",
}
