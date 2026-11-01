"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { ResumenIA } from "@/lib/admin/ia"
import { eliminarCargaCreditosIA, registrarCreditosIA } from "@/app/admin/actions"
import { fmtFecha, fmtNum, fmtUsd } from "@/components/admin/formato"

function hoyLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Asuncion" }).format(new Date())
}

function Dato({ label, valor, detalle }: { label: string; valor: string; detalle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="font-mono text-lg font-semibold tabular-nums text-foreground">{valor}</span>
      {detalle && <span className="text-xs leading-relaxed text-muted-foreground">{detalle}</span>}
    </div>
  )
}

export function CreditosIA({ ia }: { ia: ResumenIA }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(hoyLocal)
  const [nota, setNota] = useState("")
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const intervalo = window.setInterval(refrescar, 60_000)
    document.addEventListener("visibilitychange", refrescar)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener("visibilitychange", refrescar)
    }
  }, [router])

  const sinCarga = ia.saldoEstimadoUsd === null
  const saldoBajo = !sinCarga && ia.cargadoUsd > 0 && (ia.saldoEstimadoUsd ?? 0) / ia.cargadoUsd < 0.15
  const costoPorCarga = ia.solicitudesMes > 0 ? ia.gastadoMesUsd / ia.solicitudesMes : 0
  const cargasRestantes =
    !sinCarga && costoPorCarga > 0 ? Math.floor((ia.saldoEstimadoUsd ?? 0) / costoPorCarga) : null

  const registrar = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = Number(monto.replace(",", "."))
    startTransition(async () => {
      const r = await registrarCreditosIA(valor, `${fecha}T12:00:00-03:00`, nota)
      setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
      if (r.ok) {
        setMonto("")
        setNota("")
        router.refresh()
      }
    })
  }

  const eliminar = (id: number) =>
    startTransition(async () => {
      const r = await eliminarCargaCreditosIA(id)
      setMensaje(r.ok ? { ok: true, texto: r.mensaje } : { ok: false, texto: r.error })
      if (r.ok) router.refresh()
    })

  return (
    <section aria-labelledby="creditos-ia-titulo" className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
        <h2 id="creditos-ia-titulo" className="text-base font-semibold text-foreground">
          Créditos de OpenAI · Carga con IA
        </h2>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          En vivo · se actualiza cada minuto ·{" "}
          {ia.gastadoMesRealUsd !== null ? "gasto real sincronizado con OpenAI" : "gasto estimado por solicitud"}
        </span>
      </div>

      {ia.sinCreditos && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          OpenAI rechazó solicitudes por falta de créditos en las últimas 24 h. La carga con IA no funciona hasta recargar saldo.
        </p>
      )}
      {ia.error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          No se pudo leer el uso de IA: {ia.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Saldo disponible</span>
          <span
            className={cn(
              "font-mono text-2xl font-semibold tabular-nums",
              ia.sinCreditos || saldoBajo ? "text-destructive" : "text-primary",
            )}
          >
            {sinCarga ? "—" : fmtUsd(ia.saldoEstimadoUsd ?? 0)}
          </span>
          <span className="text-xs leading-relaxed text-muted-foreground">
            {sinCarga
              ? "Registrá tu saldo actual para calcularlo"
              : `de ${fmtUsd(ia.cargadoUsd)} cargados${cargasRestantes !== null ? ` · ~${fmtNum(cargasRestantes)} cargas` : ""}`}
          </span>
        </div>
        <Dato
          label="Gasto este mes"
          valor={fmtUsd(ia.gastadoMesRealUsd ?? ia.gastadoMesUsd)}
          detalle={
            ia.gastadoMesRealUsd !== null
              ? `Estimado por la app: ${fmtUsd(ia.gastadoMesUsd)}`
              : `Total histórico: ${fmtUsd(ia.gastadoTotalUsd)}`
          }
        />
        <Dato
          label="Cargas con IA (mes)"
          valor={fmtNum(ia.solicitudesMes)}
          detalle={`${ia.usuariosMes} usuarios · ${costoPorCarga > 0 ? `${fmtUsd(costoPorCarga)} c/u` : "sin uso aún"}`}
        />
        <Dato
          label="Errores (mes)"
          valor={fmtNum(ia.erroresMes)}
          detalle={ia.ultimoError ? `Último: ${fmtFecha(ia.ultimoError.fecha, true)}` : "Sin errores"}
        />
      </div>

      <form onSubmit={registrar} className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-end">
        <div className="flex flex-col gap-1.5 md:w-36">
          <Label htmlFor="ia-monto">Saldo cargado (USD)</Label>
          <Input
            id="ia-monto"
            inputMode="decimal"
            placeholder="10.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value.replace(/[^\d.,]/g, ""))}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5 md:w-44">
          <Label htmlFor="ia-fecha">Fecha</Label>
          <Input id="ia-fecha" type="date" value={fecha} max={hoyLocal()} onChange={(e) => setFecha(e.target.value)} required />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="ia-nota">Nota (opcional)</Label>
          <Input id="ia-nota" maxLength={200} placeholder="Recarga en platform.openai.com" value={nota} onChange={(e) => setNota(e.target.value)} />
        </div>
        <Button type="submit" disabled={pendiente || !monto}>
          {pendiente && <Loader2 className="size-4 animate-spin" />}
          Registrar carga
        </Button>
      </form>
      <p className="text-xs leading-relaxed text-muted-foreground">
        OpenAI no permite consultar el saldo desde una API key. Cada vez que recargues en platform.openai.com/settings/organization/billing,
        registrá el monto acá: el saldo se calcula restando el consumo de la app desde la primera carga registrada.
      </p>

      {mensaje && (
        <p role="status" className={cn("text-sm", mensaje.ok ? "text-primary" : "text-destructive")}>
          {mensaje.texto}
        </p>
      )}

      {ia.cargas.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {ia.cargas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-foreground">
                <span className="font-mono tabular-nums">{fmtUsd(c.montoUsd)}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {fmtFecha(c.fecha)}
                  {c.nota ? ` · ${c.nota}` : ""}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={pendiente}
                onClick={() => eliminar(c.id)}
                aria-label={`Eliminar carga de ${fmtUsd(c.montoUsd)}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
