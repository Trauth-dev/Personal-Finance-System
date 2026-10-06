"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatGuaranies } from "@/lib/utils"
import { actualizarPagoMinimo, notificarCambioFinanciero, registrarPagoDeuda } from "@/lib/finanzas/operaciones"

export interface Extracto {
  id: string
  deuda_id: string
  periodo_desde: string | null
  periodo_hasta: string | null
  fecha_corte: string
  fecha_vencimiento: string | null
  saldo_extracto: number
  pago_minimo: number | null
  monto_pagado: number
  estado: "abierto" | "parcial" | "pagado" | "vencido" | string
}

export interface Cuota {
  id: string
  deuda_id: string
  numero_cuota: number
  fecha_vencimiento: string | null
  capital_programado: number | null
  interes_programado: number | null
  cargos_programados: number | null
  total_programado: number
  total_pagado: number
  desglose_informado: boolean
  estado: string
}

export interface Caja {
  id: string
  nombre: string
  monto_actual: number
}

export interface DeudaPagable {
  id: string
  nombre: string
  tipo_deuda: string
  saldo_pendiente: number
}

const SIN_CUENTA = "__sin_cuenta__"

const separarMiles = (v: string | number) =>
  String(v ?? "")
    .replace(/\D/g, "")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")

const aNumero = (v: string) => Number(v.replace(/\./g, "")) || 0

function hoyLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function formatFecha(fecha: string | null | undefined) {
  if (!fecha) return "—"
  const [y, m, d] = fecha.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("es-PY", { day: "2-digit", month: "short", year: "numeric" })
}

export const restanteExtracto = (e: Extracto) => Math.max(0, Number(e.saldo_extracto) - Number(e.monto_pagado))
export const restanteCuota = (c: Cuota) => Math.max(0, Number(c.total_programado) - Number(c.total_pagado))

const ESTADO_EXTRACTO: Record<string, { label: string; className: string }> = {
  abierto: { label: "Abierto", className: "bg-blue-500/20 text-blue-300" },
  parcial: { label: "Pago parcial", className: "bg-amber-500/20 text-amber-300" },
  pagado: { label: "Pagado", className: "bg-green-500/20 text-green-300" },
  vencido: { label: "Vencido", className: "bg-red-500/20 text-red-300" },
}

export function EstadoExtractoBadge({ estado }: { estado: string }) {
  const e = ESTADO_EXTRACTO[estado] ?? ESTADO_EXTRACTO.abierto
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.className}`}>{e.label}</span>
}

type OpcionPago = "minimo" | "extracto" | "cuota" | "total" | "otro"

interface PagarDeudaDialogProps {
  deuda: DeudaPagable | null
  extracto: Extracto | null
  proximaCuota: Cuota | null
  cajas: Caja[]
  perfilId: string
  onOpenChange: (open: boolean) => void
  onPagado: () => void
}

export function PagarDeudaDialog({
  deuda,
  extracto,
  proximaCuota,
  cajas,
  perfilId,
  onOpenChange,
  onPagado,
}: PagarDeudaDialogProps) {
  const esTarjeta = deuda?.tipo_deuda === "tarjeta_credito"

  const opciones = useMemo(() => {
    const lista: { id: OpcionPago; label: string; monto: number | null; detalle?: string }[] = []
    if (!deuda) return lista
    if (esTarjeta) {
      if (extracto && restanteExtracto(extracto) > 0) {
        const minimo = extracto.pago_minimo != null ? Number(extracto.pago_minimo) : null
        if (minimo && minimo > Number(extracto.monto_pagado)) {
          lista.push({
            id: "minimo",
            label: "Pago mínimo",
            monto: Math.max(0, minimo - Number(extracto.monto_pagado)),
          })
        }
        lista.push({
          id: "extracto",
          label: "Saldo del extracto",
          monto: restanteExtracto(extracto),
          detalle: `Corte ${formatFecha(extracto.fecha_corte)}`,
        })
      }
      if (deuda.saldo_pendiente > 0) {
        lista.push({ id: "total", label: "Saldo total utilizado", monto: deuda.saldo_pendiente })
      }
    } else if (proximaCuota) {
      lista.push({
        id: "cuota",
        label: `Cuota #${proximaCuota.numero_cuota}`,
        monto: restanteCuota(proximaCuota),
        detalle: proximaCuota.fecha_vencimiento ? `Vence ${formatFecha(proximaCuota.fecha_vencimiento)}` : undefined,
      })
    }
    lista.push({ id: "otro", label: "Otro monto", monto: null })
    return lista
  }, [deuda, esTarjeta, extracto, proximaCuota])

  const [opcion, setOpcion] = useState<OpcionPago>("otro")
  const [monto, setMonto] = useState("")
  const [cajaId, setCajaId] = useState<string>(SIN_CUENTA)
  const [fecha, setFecha] = useState(hoyLocal())
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!deuda) return
    const inicial = opciones[0]
    setOpcion(inicial?.id ?? "otro")
    setMonto(inicial?.monto ? separarMiles(Math.round(inicial.monto)) : "")
    setCajaId(cajas[0]?.id ?? SIN_CUENTA)
    setFecha(hoyLocal())
  }, [deuda, opciones, cajas])

  const elegirOpcion = (id: OpcionPago) => {
    setOpcion(id)
    const o = opciones.find((x) => x.id === id)
    setMonto(o?.monto ? separarMiles(Math.round(o.monto)) : "")
  }

  const cajaSeleccionada = cajas.find((c) => c.id === cajaId)
  const montoNum = aNumero(monto)
  const saldoInsuficiente = !!cajaSeleccionada && montoNum > Number(cajaSeleccionada.monto_actual)

  const pagar = async () => {
    if (!deuda) return
    if (montoNum <= 0) {
      toast.error("Ingresá un monto mayor a 0")
      return
    }
    setGuardando(true)
    try {
      await registrarPagoDeuda({
        perfilId,
        deudaId: deuda.id,
        monto: montoNum,
        fecha,
        origenCajaId: cajaId === SIN_CUENTA ? null : cajaId,
        extractoId: esTarjeta ? extracto?.id ?? null : null,
        cuotaId: !esTarjeta ? proximaCuota?.id ?? null : null,
      })
      notificarCambioFinanciero()
      toast.success("Pago registrado")
      onPagado()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo registrar el pago")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={!!deuda} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagar {deuda?.nombre}</DialogTitle>
          <DialogDescription>
            {esTarjeta
              ? "Elegí cuánto querés pagar y desde qué cuenta sale el dinero."
              : "El pago se aplica a la próxima cuota pendiente."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium mb-2">¿Cuánto?</legend>
            {opciones.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => elegirOpcion(o.id)}
                aria-pressed={opcion === o.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                  opcion === o.id ? "border-green-500 bg-green-500/10" : "border-border hover:bg-muted/40"
                }`}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{o.label}</span>
                  {o.detalle && <span className="text-xs text-muted-foreground">{o.detalle}</span>}
                </span>
                {o.monto != null && <span className="text-sm font-semibold">{formatGuaranies(o.monto)}</span>}
              </button>
            ))}
            {esTarjeta && extracto && restanteExtracto(extracto) > 0 && extracto.pago_minimo == null && (
              <p className="text-xs text-muted-foreground">Pago mínimo no informado</p>
            )}
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pago-monto">Monto</Label>
            <Input
              id="pago-monto"
              inputMode="numeric"
              value={monto}
              onChange={(e) => {
                setOpcion("otro")
                setMonto(separarMiles(e.target.value))
              }}
              placeholder="0"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>¿Desde dónde?</Label>
            <Select value={cajaId} onValueChange={setCajaId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegí una cuenta" />
              </SelectTrigger>
              <SelectContent>
                {cajas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} · {formatGuaranies(Number(c.monto_actual))}
                  </SelectItem>
                ))}
                <SelectItem value={SIN_CUENTA}>Efectivo (sin descontar de una cuenta)</SelectItem>
              </SelectContent>
            </Select>
            {saldoInsuficiente && (
              <p className="text-xs text-amber-400">La cuenta elegida no tiene saldo suficiente.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pago-fecha">Fecha</Label>
            <Input id="pago-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={pagar} disabled={guardando || montoNum <= 0} className="bg-green-600 hover:bg-green-700 text-white">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Pagar {montoNum > 0 ? formatGuaranies(montoNum) : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PagoMinimoDialogProps {
  extracto: Extracto | null
  onOpenChange: (open: boolean) => void
  onGuardado: () => void
}

export function PagoMinimoDialog({ extracto, onOpenChange, onGuardado }: PagoMinimoDialogProps) {
  const [valor, setValor] = useState("")
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setValor(extracto?.pago_minimo != null ? separarMiles(Math.round(Number(extracto.pago_minimo))) : "")
  }, [extracto])

  const guardar = async () => {
    if (!extracto) return
    setGuardando(true)
    try {
      await actualizarPagoMinimo(extracto.id, valor ? aNumero(valor) : null)
      toast.success("Pago mínimo actualizado")
      onGuardado()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el pago mínimo")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={!!extracto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pago mínimo del extracto</DialogTitle>
          <DialogDescription>
            Copialo de tu extracto bancario. Cada banco lo calcula distinto, por eso no lo estimamos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="pago-minimo">Monto</Label>
          <Input
            id="pago-minimo"
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(separarMiles(e.target.value))}
            placeholder="Dejalo vacío si no lo sabés"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ESTADO_CUOTA: Record<string, string> = {
  pagada: "text-green-400",
  parcial: "text-amber-400",
  vencida: "text-red-400",
}

export function CronogramaCuotas({ cuotas }: { cuotas: Cuota[] }) {
  if (cuotas.length === 0) return null
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-blue-300">Cronograma de cuotas</p>
      <div className="max-h-72 overflow-auto rounded-lg border border-border/50">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-muted text-muted-foreground">
            <tr>
              <th scope="col" className="px-2 py-2 text-left font-medium">#</th>
              <th scope="col" className="px-2 py-2 text-left font-medium">Vence</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Cuota</th>
              <th scope="col" className="px-2 py-2 text-right font-medium">Pagado</th>
            </tr>
          </thead>
          <tbody>
            {cuotas.map((c) => (
              <tr key={c.id} className="border-t border-border/40">
                <td className="px-2 py-1.5">{c.numero_cuota}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{formatFecha(c.fecha_vencimiento)}</td>
                <td className="px-2 py-1.5 text-right font-medium">{formatGuaranies(Number(c.total_programado))}</td>
                <td className={`px-2 py-1.5 text-right ${ESTADO_CUOTA[c.estado] ?? "text-muted-foreground"}`}>
                  {Number(c.total_pagado) > 0 ? formatGuaranies(Number(c.total_pagado)) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
