"use client"

import { useState } from "react"
import { CalendarClock, Gift, Loader2, RotateCcw } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { PLANES } from "@/lib/plans/catalogo"
import type { useSuscripcion } from "@/hooks/use-suscripcion"

type Suscripcion = ReturnType<typeof useSuscripcion>

function formatFecha(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PY", { day: "2-digit", month: "long", year: "numeric" })
}

function dias(n: number): string {
  return `${n} día${n === 1 ? "" : "s"}`
}

export function EstadoSuscripcion({ s }: { s: Suscripcion }) {
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cambiarBaja = async (accion: "cancelar" | "reactivar") => {
    setGuardando(true)
    setError(null)
    try {
      const res = await fetch("/api/suscripcion/baja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      if (!res.ok) setError(data.message ?? "No pudimos guardar el cambio.")
      await s.refresh()
    } catch {
      setError("Ocurrió un error de conexión. Intentá nuevamente.")
    } finally {
      setGuardando(false)
    }
  }

  if (s.exento) {
    return (
      <Tarjeta tono="ok" titulo="Acceso Total habilitado">
        Tu cuenta tiene acceso completo sin vencimiento.
      </Tarjeta>
    )
  }

  if (!s.activa) {
    return (
      <Tarjeta tono="alerta" titulo={s.pruebaTerminada ? "Tu prueba gratuita terminó" : "Sin suscripción activa"}>
        Elegí un plan para desbloquear las herramientas.
      </Tarjeta>
    )
  }

  const nombrePlan = PLANES[s.plan ?? "personal"].nombre

  return (
    <div className="flex flex-col gap-3">
      {s.prueba && (
        <Tarjeta tono={s.diasPrueba <= 7 ? "alerta" : "ok"} titulo="Prueba gratuita" icono="regalo">
          Te quedan <strong className="text-white">{dias(s.diasPrueba)}</strong> de prueba gratuita (hasta el{" "}
          {formatFecha(s.pruebaVence)}).
        </Tarjeta>
      )}

      {s.pagoVigente ? (
        <Tarjeta tono={s.cancelada ? "alerta" : "ok"} titulo={`${nombrePlan} ${s.cancelada ? "· baja programada" : "activo"}`}>
          {s.cancelada
            ? `Te diste de baja. Seguís con acceso hasta el ${formatFecha(s.vence)} (${dias(s.diasRestantes)}).`
            : `Pagado hasta el ${formatFecha(s.vence)} · ${dias(s.diasRestantes)} restante${s.diasRestantes === 1 ? "" : "s"}.`}
          {s.cambio && (
            <span className="mt-1 block text-sky-300">
              Cambia a {PLANES[s.cambio.plan].nombre} el {formatFecha(s.cambio.desde)}.
            </span>
          )}
        </Tarjeta>
      ) : (
        s.sinCobro && (
          <Tarjeta tono="ok" titulo={`${nombrePlan} activo`}>
            Sin costo por ahora. Podés pagar tu plan cuando quieras.
          </Tarjeta>
        )
      )}

      {s.pagoVigente && (
        <div className="flex flex-col items-center gap-2">
          {s.cancelada ? (
            <Button
              variant="outline"
              size="sm"
              disabled={guardando}
              onClick={() => cambiarBaja("reactivar")}
              className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Reactivar suscripción
            </Button>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={guardando}
                  className="text-slate-400 hover:bg-slate-800 hover:text-red-300"
                >
                  {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Darse de baja
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Dar de baja tu plan?</AlertDialogTitle>
                  <AlertDialogDescription className="leading-relaxed">
                    No se te cobrará de nuevo. Vas a seguir usando {nombrePlan} con normalidad hasta el{" "}
                    {formatFecha(s.vence)}; después tu cuenta queda sin plan pago. Podés reactivarlo cuando quieras.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mantener mi plan</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cambiarBaja("cancelar")}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Darme de baja
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {error && (
            <p role="alert" className="text-center text-xs text-red-300">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Tarjeta({
  tono,
  titulo,
  icono = "calendario",
  children,
}: {
  tono: "ok" | "alerta"
  titulo: string
  icono?: "calendario" | "regalo"
  children: React.ReactNode
}) {
  const Icono = icono === "regalo" ? Gift : CalendarClock
  const ok = tono === "ok"
  return (
    <div
      className={
        ok
          ? "flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"
          : "flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
      }
    >
      <div
        className={
          ok
            ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400"
            : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400"
        }
      >
        <Icono className="h-5 w-5" />
      </div>
      <div className="min-w-0 text-left">
        <p className={ok ? "text-sm font-semibold text-emerald-400" : "text-sm font-semibold text-amber-400"}>{titulo}</p>
        <p className="text-xs leading-relaxed text-slate-400">{children}</p>
      </div>
    </div>
  )
}
