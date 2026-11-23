"use client"

import { Check, CreditCard, Loader2, ShieldCheck, User, Layers, ArrowLeftRight, CalendarPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatMoney } from "@/lib/utils"
import { PLANES, type PlanId } from "@/lib/plans/catalogo"
import { useCheckoutBancard } from "@/hooks/use-checkout-bancard"
import { BancardCheckoutDialog } from "@/components/planes/bancard-checkout-dialog"

const BENEFICIOS_PERSONAL = [
  { nombre: "Dashboard Principal", desc: "Resumen visual de tus finanzas" },
  { nombre: "Carga de Ingreso y Egreso", desc: "Ingresos, egresos y presupuesto mensual" },
  { nombre: "Editar y Eliminar Cargas", desc: "Historial editable de movimientos" },
  { nombre: "Cajas de Ahorro", desc: "Organizá tu dinero por objetivos" },
  { nombre: "Deudas y Plan Anti-Deudas", desc: "Control, seguimiento y estrategia" },
  { nombre: "Presupuesto vs Realidad", desc: "Análisis financiero detallado" },
  { nombre: "Asesoramiento + Herramientas", desc: "Gráficos y calculadoras" },
  { nombre: "Metas y Plan de Acción", desc: "Hábitos, tareas y objetivos" },
]

const BENEFICIOS_TOTAL = [
  { nombre: "Todo lo del plan Personal", desc: "Tu perfil Personal completo" },
  { nombre: "Perfil Empresarial", desc: "Ventas, compras, inventario, proveedores y flujo" },
  { nombre: "CRM de clientes", desc: "Pipeline, seguimientos, agenda y cobranzas" },
  { nombre: "Reportes empresariales", desc: "Diagnóstico y análisis del negocio" },
  { nombre: "Cambio libre entre perfiles", desc: "Personal, Empresarial y CRM en una cuenta" },
]

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "long" })
}

interface PlanCardsProps {
  /** Plan vigente hoy (null si no tiene acceso). */
  planActual: PlanId | null
  /** Muestra únicamente estos planes (por defecto, ambos). */
  planes?: PlanId[]
  /** Cuenta con acceso Total habilitado sin pago: se muestran los planes sin permitir pagar. */
  accesoIncluido?: boolean
  /** Fecha en que empezaría un período nuevo (fin del pago o prueba vigente). Null = empieza hoy. */
  inicioProximo?: string | null
  /** Cambio de plan ya pagado que todavía no empezó. */
  cambio?: { plan: PlanId; desde: string } | null
  /** true si ya tiene un período pago vigente. */
  pagoVigente?: boolean
}

export function PlanCards({
  planActual,
  planes = ["personal", "total"],
  accesoIncluido = false,
  inicioProximo = null,
  cambio = null,
  pagoVigente = false,
}: PlanCardsProps) {
  const { iniciarPago, procesando, error, noConfigurado, sesion, cerrarSesion, habilitado, modoPrueba } =
    useCheckoutBancard()
  const pagosNoDisponibles = !accesoIncluido && !habilitado

  return (
    <div className="flex flex-col gap-5">
      {modoPrueba && !accesoIncluido && (
        <p className="mx-auto w-full max-w-xl rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-300">
          Modo de prueba de Bancard activo para tu cuenta: los pagos no son reales.
        </p>
      )}
      <div
        className={cn(
          "mx-auto grid w-full gap-5",
          planes.length > 1 ? "max-w-4xl md:grid-cols-2" : "max-w-md",
        )}
      >
        {planes.map((planId) => (
          <PlanCard
            key={planId}
            planId={planId}
            destacado={planId === "total"}
            icono={planId === "total" ? <Layers className="h-5 w-5" /> : <User className="h-5 w-5" />}
            beneficios={planId === "total" ? BENEFICIOS_TOTAL : BENEFICIOS_PERSONAL}
            planActual={planActual}
            accesoIncluido={accesoIncluido}
            pagosNoDisponibles={pagosNoDisponibles}
            inicioProximo={inicioProximo}
            cambio={cambio}
            pagoVigente={pagoVigente}
            procesando={procesando}
            onPagar={iniciarPago}
          />
        ))}
      </div>

      <BancardCheckoutDialog sesion={sesion} modoPrueba={modoPrueba} onClose={cerrarSesion} />

      {noConfigurado && (
        <div className="mx-auto w-full max-w-xl rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-400">Pago en configuración</p>
          <p className="mt-1 leading-relaxed text-slate-400">
            Estamos terminando de conectar la pasarela Bancard. En breve vas a poder completar el pago con
            tarjeta, QR o transferencia.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mx-auto w-full max-w-xl rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-center text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        {pagosNoDisponibles
          ? "Los pagos con Bancard todavía no están disponibles para tu cuenta."
          : "Pago mensual seguro con Bancard Paraguay — tarjetas, QR y transferencias. Sin renovación automática."}
      </p>
    </div>
  )
}

interface PlanCardProps {
  planId: PlanId
  icono: React.ReactNode
  beneficios: { nombre: string; desc: string }[]
  planActual: PlanId | null
  procesando: PlanId | null
  onPagar: (planId: PlanId) => void
  destacado?: boolean
  accesoIncluido: boolean
  pagosNoDisponibles: boolean
  inicioProximo: string | null
  cambio: { plan: PlanId; desde: string } | null
  pagoVigente: boolean
}

function PlanCard({
  planId,
  icono,
  beneficios,
  planActual,
  procesando,
  onPagar,
  destacado,
  accesoIncluido,
  pagosNoDisponibles,
  inicioProximo,
  cambio,
  pagoVigente,
}: PlanCardProps) {
  const plan = PLANES[planId]
  const nombreCorto = plan.nombre.replace("Prospera+ ", "")
  const esActual = planActual === planId
  const esCambioProgramado = cambio?.plan === planId
  // Solo puede haber un cambio programado; el otro plan se habilita cuando empiece.
  const bloqueadoPorCambio = Boolean(cambio) && !esCambioProgramado
  const cargando = procesando === planId
  const deshabilitado = accesoIncluido || pagosNoDisponibles || bloqueadoPorCambio || procesando !== null
  // Plan que regirá al terminar el período actual (el cambio programado o el actual).
  const planAlFinal = cambio?.plan ?? planActual
  const esCambio = !accesoIncluido && planAlFinal !== null && planAlFinal !== planId

  let etiqueta: string
  let Icono = CreditCard
  let nota: string | null = null

  if (accesoIncluido) {
    etiqueta = esActual ? "Incluido en tu cuenta" : "Ya incluido en tu acceso Total"
    Icono = Check
  } else if (bloqueadoPorCambio) {
    etiqueta = esActual ? "Tu plan actual" : nombreCorto
    Icono = Check
    nota = `Ya programaste el cambio a ${PLANES[cambio!.plan].nombre.replace("Prospera+ ", "")}.`
  } else if (esCambioProgramado) {
    etiqueta = `Sumar 30 días a ${nombreCorto}`
    Icono = CalendarPlus
    nota = `Tu plan ${nombreCorto} empieza el ${fechaCorta(cambio!.desde)}.`
  } else if (esCambio) {
    etiqueta = `Cambiar a ${nombreCorto}`
    Icono = ArrowLeftRight
    nota = inicioProximo
      ? `El cambio se aplica el ${fechaCorta(inicioProximo)}, cuando termina tu período actual.`
      : "Se activa al instante por 30 días."
  } else if (esActual || planAlFinal === planId) {
    etiqueta = pagoVigente ? "Renovar 30 días" : `Pagar ${nombreCorto} · 30 días`
    Icono = CalendarPlus
    nota = inicioProximo ? `Los 30 días se suman desde el ${fechaCorta(inicioProximo)}.` : null
  } else {
    etiqueta = `Elegir ${nombreCorto}`
  }

  if (pagosNoDisponibles && !accesoIncluido) {
    Icono = Check
    etiqueta = esActual ? "Tu plan actual" : nombreCorto
    nota = null
  }

  return (
    <article
      aria-label={plan.nombre}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-slate-900 p-6 sm:p-7",
        destacado
          ? "border-[#D4AF37]/60 shadow-[0_0_40px_-12px_rgba(212,175,55,0.45)]"
          : "border-slate-700/80",
      )}
    >
      {esActual ? (
        <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950">
          Tu plan actual
        </span>
      ) : esCambioProgramado ? (
        <span className="absolute -top-3 left-6 rounded-full bg-sky-400 px-3 py-1 text-xs font-bold text-slate-950">
          Desde el {fechaCorta(cambio!.desde)}
        </span>
      ) : (
        destacado && (
          <span className="absolute -top-3 left-6 rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold text-slate-950">
            Más completo
          </span>
        )
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            destacado ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "bg-[#0055A4]/25 text-[#5b9bd5]",
          )}
        >
          {icono}
        </div>
        <div className="min-w-0">
          <h3 className={cn("text-lg font-bold", destacado ? "text-[#D4AF37]" : "text-white")}>{plan.nombre}</h3>
          <p className="text-sm text-slate-400">{plan.resumen}</p>
        </div>
      </div>

      <div className="mt-6 flex items-end gap-1">
        <span className="text-4xl font-extrabold tracking-tight text-white">{formatMoney(plan.monto, "PYG")}</span>
        <span className="pb-1 text-sm text-slate-400">/mes</span>
      </div>

      <Button
        onClick={() => onPagar(planId)}
        disabled={deshabilitado}
        className={cn(
          "mt-6 w-full font-semibold",
          destacado
            ? "bg-[#D4AF37] text-slate-950 hover:bg-[#c9a430]"
            : "bg-emerald-500 text-white hover:bg-emerald-600",
        )}
      >
        {cargando ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparando pago...
          </>
        ) : (
          <>
            <Icono className="mr-2 h-4 w-4" />
            {etiqueta}
          </>
        )}
      </Button>
      {nota && <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">{nota}</p>}

      <div className="mt-6 border-t border-slate-800 pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Qué incluye</p>
        <ul className="flex flex-col gap-3">
          {beneficios.map((b) => (
            <li key={b.nombre} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  destacado ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-emerald-500/15 text-emerald-400",
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-200">{b.nombre}</span>
                <span className="block text-xs leading-relaxed text-slate-500">{b.desc}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
