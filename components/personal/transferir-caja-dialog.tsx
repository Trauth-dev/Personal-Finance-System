"use client"

import type React from "react"
import { useState } from "react"
import { ArrowLeftRight, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatGuaranies } from "@/lib/utils"

export type CajaTransferible = {
  id: string
  nombre: string
  monto_actual: number
  moneda: string | null
}

interface TransferirCajaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cajas: CajaTransferible[]
  origenInicialId?: string | null
  onTransferred: () => void
}

const monedaDe = (caja?: CajaTransferible) => caja?.moneda || "PYG"

const formatMonto = (monto: number, moneda: string) =>
  moneda === "PYG" ? formatGuaranies(monto) : `${moneda} ${monto.toLocaleString("es-PY")}`

const formatMiles = (value: string) => (value ? Number(value).toLocaleString("es-PY") : "")

export function TransferirCajaDialog({
  open,
  onOpenChange,
  cajas,
  origenInicialId,
  onTransferred,
}: TransferirCajaDialogProps) {
  const { toast } = useToast()
  const [origenId, setOrigenId] = useState("")
  const [destinoId, setDestinoId] = useState("")
  const [monto, setMonto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastOpen, setLastOpen] = useState(false)

  // Reset the form each time the dialog opens, preselecting the origin it was opened from.
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      const origen = origenInicialId ?? cajas.find((c) => c.monto_actual > 0)?.id ?? cajas[0]?.id ?? ""
      setOrigenId(origen)
      setDestinoId("")
      setMonto("")
      setError(null)
    }
  }

  const origen = cajas.find((c) => c.id === origenId)
  const moneda = monedaDe(origen)
  const destinos = cajas.filter((c) => c.id !== origenId && monedaDe(c) === moneda)
  const destino = destinos.find((c) => c.id === destinoId)
  const montoNum = Number(monto) || 0
  const disponible = origen?.monto_actual ?? 0
  const excede = montoNum > disponible

  const handleOrigenChange = (id: string) => {
    setOrigenId(id)
    setError(null)
    const nuevaMoneda = monedaDe(cajas.find((c) => c.id === id))
    const destinoActual = cajas.find((c) => c.id === destinoId)
    if (destinoId === id || monedaDe(destinoActual) !== nuevaMoneda) setDestinoId("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!origen || !destino || montoNum <= 0 || excede || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc("fin_transferir_caja", {
      p_origen: origen.id,
      p_destino: destino.id,
      p_monto: montoNum,
    })
    setIsSubmitting(false)

    if (rpcError) {
      setError(rpcError.message || "No se pudo realizar la transferencia. Intentá de nuevo.")
      return
    }

    toast({
      title: "Transferencia realizada",
      description: `${formatMonto(montoNum, moneda)} de ${origen.nombre} a ${destino.nombre}.`,
    })
    onOpenChange(false)
    onTransferred()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" aria-hidden="true" />
            Transferir entre cuentas
          </DialogTitle>
          <DialogDescription>
            Mové dinero de una caja a otra. No se registra como ingreso ni egreso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-origen">Desde</Label>
            <Select value={origenId} onValueChange={handleOrigenChange}>
              <SelectTrigger id="transfer-origen" className="w-full">
                <SelectValue placeholder="Elegí la cuenta de origen" />
              </SelectTrigger>
              <SelectContent>
                {cajas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} · {formatMonto(c.monto_actual, monedaDe(c))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center text-muted-foreground" aria-hidden="true">
            <ArrowDown className="w-5 h-5" />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="transfer-destino">Hacia</Label>
            <Select value={destinoId} onValueChange={(id) => { setDestinoId(id); setError(null) }} disabled={destinos.length === 0}>
              <SelectTrigger id="transfer-destino" className="w-full">
                <SelectValue placeholder={destinos.length === 0 ? "No hay otra cuenta disponible" : "Elegí la cuenta de destino"} />
              </SelectTrigger>
              <SelectContent>
                {destinos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre} · {formatMonto(c.monto_actual, monedaDe(c))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinos.length === 0 && origen && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {`Necesitás otra caja en ${moneda} para transferir desde "${origen.nombre}".`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="transfer-monto">Monto</Label>
              {origen && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                  onClick={() => setMonto(String(Math.max(0, Math.floor(disponible))))}
                  disabled={disponible <= 0}
                >
                  {`Disponible: ${formatMonto(disponible, moneda)}`}
                </button>
              )}
            </div>
            <Input
              id="transfer-monto"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={formatMiles(monto)}
              onChange={(e) => { setMonto(e.target.value.replace(/\D/g, "")); setError(null) }}
              placeholder="Ej: 500.000"
              aria-invalid={excede}
              aria-describedby="transfer-monto-ayuda"
              required
            />
            <p id="transfer-monto-ayuda" className={`text-xs leading-relaxed ${excede ? "text-destructive" : "text-muted-foreground"}`}>
              {excede
                ? "El monto supera el saldo disponible en la cuenta de origen."
                : "Tocá el saldo disponible para transferir todo."}
            </p>
          </div>

          {origen && destino && montoNum > 0 && !excede && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm leading-relaxed">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{origen.nombre} quedará con</span>
                <span className="font-semibold">{formatMonto(disponible - montoNum, moneda)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">{destino.nombre} quedará con</span>
                <span className="font-semibold">{formatMonto(destino.monto_actual + montoNum, moneda)}</span>
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive leading-relaxed">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="gap-2" disabled={!origen || !destino || montoNum <= 0 || excede || isSubmitting}>
              <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
              {isSubmitting ? "Transfiriendo..." : "Transferir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
