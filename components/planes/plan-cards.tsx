"use client"

import { Check, CreditCard, Loader2, ShieldCheck, User, Layers, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn, formatMoney } from "@/lib/utils"
import { PLANES, type PlanId } from "@/lib/plans/catalogo"
import { useCheckoutPagopar } from "@/hooks/use-checkout-pagopar"

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

interface PlanCardsProps {
  /** Plan vigente del usuario (null si no tiene suscripción activa). */
  planActual: PlanId | null
  /** Muestra únicamente estos planes (por defecto, ambos). */
  planes?: PlanId[]
  /** Cuenta con acceso Total habilitado sin pago: se muestran los planes sin permitir pagar. */
  accesoIncluido?: boolean
}

export function PlanCards({ planActual, planes = ["personal", "total"], accesoIncluido = false }: PlanCardsProps) {
  const { iniciarPago, procesando, error, noConfigurado } = useCheckoutPagopar()

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "mx-auto grid w-full gap-5",
          planes.length > 1 ? "max-w-4xl md:grid-cols-2" : "max-w-md",
        )}
      >
        {planes.includes("personal") && (
          <PlanCard
            planId="personal"
            icono={<User className="h-5 w-5" />}
            beneficios={BENEFICIOS_PERSONAL}
            planActual={planActual}
            accesoIncluido={accesoIncluido}
            procesando={procesando}
            onPagar={iniciarPago}
          />
        )}
        {planes.includes("total") && (
          <PlanCard
            planId="total"
            destacado
            icono={<Layers className="h-5 w-5" />}
            beneficios={BENEFICIOS_TOTAL}
            planActual={planActual}
            accesoIncluido={accesoIncluido}
            procesando={procesando}
            onPagar={iniciarPago}
          />
        )}
      </div>

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
        Pago mensual seguro con Bancard Paraguay — tarjetas, QR y transferencias
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
  accesoIncluido?: boolean
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
}: PlanCardProps) {
  const plan = PLANES[planId]
  const esActual = planActual === planId
  // Bajar de Total a Personal a mitad de ciclo haría perder el acceso Total ya pagado.
  const bajaBloqueada = planId === "personal" && planActual === "total"
  const cargando = procesando === planId

  const etiquetaBoton = accesoIncluido
    ? esActual
      ? "Incluido en tu cuenta"
      : "Ya incluido en tu acceso Total"
    : esActual
      ? "Renovar 30 días"
      : planId === "total" && planActual === "personal"
        ? "Mejorar a Total"
        : `Elegir ${plan.nombre.replace("Prospera+ ", "")}`

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
      {destacado && !esActual && (
        <span className="absolute -top-3 left-6 rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-bold text-slate-950">
          Más completo
        </span>
      )}
      {esActual && (
        <span className="absolute -top-3 left-6 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-slate-950">
          Tu plan actual
        </span>
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
        disabled={accesoIncluido || procesando !== null || bajaBloqueada}
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
            Redirigiendo a Bancard...
          </>
        ) : (
          <>
            {accesoIncluido ? (
              <Check className="mr-2 h-4 w-4" />
            ) : planId === "total" && planActual === "personal" ? (
              <ArrowUpRight className="mr-2 h-4 w-4" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {etiquetaBoton}
          </>
        )}
      </Button>
      {bajaBloqueada && !accesoIncluido && (
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
          Disponible cuando venza tu plan Total vigente.
        </p>
      )}
      {planId === "total" && planActual === "personal" && (
        <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
          El acceso Total se activa al instante y suma 30 días a tu vencimiento.
        </p>
      )}

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
