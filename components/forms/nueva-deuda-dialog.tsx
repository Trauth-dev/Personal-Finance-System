"use client"

import { useState } from "react"
import { CreditCard, Landmark } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { formatGuaranies, getTodayDate } from "@/lib/utils"
import { crearTarjeta, notificarCambioFinanciero } from "@/lib/finanzas/operaciones"

// Evento global que se emite cada vez que se registra una deuda desde este
// diálogo. Egresos y Presupuesto lo escuchan para mantenerse sincronizados.
export const DEUDAS_ACTUALIZADAS_EVENT = "deudas-actualizadas"

export type TipoDeuda = "prestamo" | "tarjeta_credito"

export interface DeudaCreada {
  id: string
  nombre: string
  tipo_deuda: TipoDeuda
  monto_cuota: number | null
  cuotas_totales: number | null
  [key: string]: unknown
}

interface NuevaDeudaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  perfilId: string | undefined
  onCreated?: (deuda: DeudaCreada) => void | Promise<void>
}

const formularioVacio = () => ({
  nombre: "",
  acreedor: "",
  monto_total: "",
  cuotas_totales: "",
  monto_cuota: "",
  tasa_interes: "",
  fecha_inicio: getTodayDate(),
  fecha_vencimiento: "",
  limite_credito: "",
  fecha_corte: "",
  fecha_pago: "",
  notas: "",
})

const formatNumberWithSeparators = (value: string): string => {
  const digits = value.replace(/[^0-9]/g, "")
  return digits ? Number(digits).toLocaleString("es-PY") : ""
}

const soloDigitos = (value: string): string => value.replace(/[^0-9]/g, "")

export function NuevaDeudaDialog({ open, onOpenChange, perfilId, onCreated }: NuevaDeudaDialogProps) {
  const [tipo, setTipo] = useState<TipoDeuda>("prestamo")
  const [form, setForm] = useState(formularioVacio)
  const [guardando, setGuardando] = useState(false)

  const actualizar = (campo: keyof ReturnType<typeof formularioVacio>, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }))

  const faltanObligatorios = !form.nombre.trim() || !form.acreedor.trim() || !form.monto_total

  const cerrar = (abierto: boolean) => {
    if (!abierto && !guardando) {
      setForm(formularioVacio())
      setTipo("prestamo")
    }
    onOpenChange(abierto)
  }

  const registrar = async () => {
    if (!perfilId || faltanObligatorios) {
      toast.error("Completa los campos obligatorios: Nombre, Acreedor y Monto Total")
      return
    }
    const montoTotal = Number(form.monto_total)
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) {
      toast.error("El monto total debe ser mayor a 0")
      return
    }

    setGuardando(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("Tu sesión expiró. Vuelve a iniciar sesión.")
        return
      }

      const deudaData: Record<string, unknown> = {
        user_id: user.id,
        perfil_id: perfilId,
        nombre: form.nombre.trim(),
        acreedor: form.acreedor.trim(),
        monto_total: montoTotal,
        monto_pagado: 0,
        cuotas_pagadas: 0,
        tipo_deuda: tipo,
        tasa_interes: form.tasa_interes ? Number.parseFloat(form.tasa_interes) : 0,
        fecha_inicio: form.fecha_inicio,
        fecha_vencimiento: form.fecha_vencimiento || null,
        estado: "activa",
        prioridad: "media",
        frecuencia_pago: "mensual",
        notas: form.notas.trim() || null,
      }

      if (tipo === "prestamo") {
        deudaData.cuotas_totales = form.cuotas_totales ? Number.parseInt(form.cuotas_totales) : null
        deudaData.monto_cuota = form.monto_cuota ? Number(form.monto_cuota) : null
      } else {
        deudaData.limite_credito = form.limite_credito ? Number(form.limite_credito) : null
        deudaData.fecha_corte = form.fecha_corte ? Number.parseInt(form.fecha_corte) : null
        deudaData.fecha_pago = form.fecha_pago ? Number.parseInt(form.fecha_pago) : null
      }

  let data: Record<string, unknown> & { id: string }
  if (tipo === "tarjeta_credito") {
  // Las tarjetas se crean por la capa financiera para que el saldo utilizado
  // quede calculado igual que en la migración (límite − disponible).
  const limite = form.limite_credito ? Number(form.limite_credito) : null
  const deudaId = await crearTarjeta({
  perfilId,
  nombre: form.nombre.trim(),
  acreedor: form.acreedor.trim(),
  limiteCredito: limite ?? montoTotal,
  saldoInicial: limite ? Math.max(limite - montoTotal, 0) : 0,
  fechaCorte: form.fecha_corte ? Number.parseInt(form.fecha_corte) : null,
  diaVencimiento: form.fecha_pago ? Number.parseInt(form.fecha_pago) : null,
  tasaInteres: form.tasa_interes ? Number.parseFloat(form.tasa_interes) : null,
  notas: form.notas.trim() || null,
  })
  const { data: creada, error } = await supabase.from("deudas").select("*").eq("id", deudaId).single()
  if (error) throw error
  data = creada
  } else {
  const { data: creada, error } = await supabase.from("deudas").insert(deudaData).select().single()
  if (error) throw error
  data = creada
  }
  notificarCambioFinanciero()

      toast.success("Deuda registrada exitosamente")
      setForm(formularioVacio())
      setTipo("prestamo")
      onOpenChange(false)

      window.dispatchEvent(new CustomEvent(DEUDAS_ACTUALIZADAS_EVENT, { detail: { deudaId: data.id } }))
      await onCreated?.(data as DeudaCreada)
    } catch (error) {
      console.error("Error creating deuda:", error)
      toast.error("Error al registrar la deuda")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Registrar Nueva Deuda
          </DialogTitle>
          <DialogDescription>
            Agrega un nuevo préstamo o tarjeta de crédito para hacer seguimiento de tus pagos
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 pt-4">
          <div className="flex flex-col gap-3">
            <Label>Tipo de Deuda</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTipo("prestamo")}
                aria-pressed={tipo === "prestamo"}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  tipo === "prestamo" ? "border-blue-400 bg-blue-500/20" : "border-border/30 hover:border-blue-400/50"
                }`}
              >
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Landmark className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Préstamo</p>
                  <p className="text-xs text-muted-foreground">Préstamos bancarios, personales</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTipo("tarjeta_credito")}
                aria-pressed={tipo === "tarjeta_credito"}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  tipo === "tarjeta_credito"
                    ? "border-purple-400 bg-purple-500/20"
                    : "border-border/30 hover:border-purple-400/50"
                }`}
              >
                <div className="p-3 rounded-full bg-purple-500/20">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Tarjeta de Crédito</p>
                  <p className="text-xs text-muted-foreground">Tarjetas de crédito bancarias</p>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deuda-nombre">Nombre *</Label>
              <Input
                id="deuda-nombre"
                placeholder={tipo === "tarjeta_credito" ? "Visa Oro" : "Préstamo Personal"}
                value={form.nombre}
                onChange={(e) => actualizar("nombre", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="deuda-acreedor">Acreedor/Banco *</Label>
              <Input
                id="deuda-acreedor"
                placeholder="Banco Itaú"
                value={form.acreedor}
                onChange={(e) => actualizar("acreedor", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deuda-monto">{tipo === "tarjeta_credito" ? "Monto Disponible *" : "Monto Total *"}</Label>
              <Input
                id="deuda-monto"
                type="text"
                inputMode="numeric"
                placeholder="5.000.000"
                value={formatNumberWithSeparators(form.monto_total)}
                onChange={(e) => actualizar("monto_total", soloDigitos(e.target.value))}
              />
              {form.monto_total && (
                <p className="text-xs text-muted-foreground">{formatGuaranies(Number(form.monto_total))}</p>
              )}
            </div>
          </div>

          {tipo === "prestamo" && (
            <div className="flex flex-col gap-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 text-blue-400">
                <Landmark className="w-4 h-4" />
                <span className="font-medium text-sm">Datos del Préstamo</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-cuotas">Cantidad de Cuotas</Label>
                  <Input
                    id="deuda-cuotas"
                    type="number"
                    min="1"
                    placeholder="12"
                    value={form.cuotas_totales}
                    onChange={(e) => actualizar("cuotas_totales", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-monto-cuota">Monto por Cuota</Label>
                  <Input
                    id="deuda-monto-cuota"
                    type="text"
                    inputMode="numeric"
                    placeholder="450.000"
                    value={formatNumberWithSeparators(form.monto_cuota)}
                    onChange={(e) => actualizar("monto_cuota", soloDigitos(e.target.value))}
                  />
                  {form.monto_cuota && (
                    <p className="text-xs text-muted-foreground">{formatGuaranies(Number(form.monto_cuota))}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-fecha-inicio">Fecha de Inicio</Label>
                  <Input
                    id="deuda-fecha-inicio"
                    type="date"
                    value={form.fecha_inicio}
                    onChange={(e) => actualizar("fecha_inicio", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-fecha-vencimiento">Fecha de Vencimiento</Label>
                  <Input
                    id="deuda-fecha-vencimiento"
                    type="date"
                    value={form.fecha_vencimiento}
                    onChange={(e) => actualizar("fecha_vencimiento", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {tipo === "tarjeta_credito" && (
            <div className="flex flex-col gap-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 text-purple-400">
                <CreditCard className="w-4 h-4" />
                <span className="font-medium text-sm">Datos de la Tarjeta</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-limite">Límite de Crédito</Label>
                  <Input
                    id="deuda-limite"
                    type="text"
                    inputMode="numeric"
                    placeholder="10.000.000"
                    value={formatNumberWithSeparators(form.limite_credito)}
                    onChange={(e) => actualizar("limite_credito", soloDigitos(e.target.value))}
                  />
                  {form.limite_credito && (
                    <p className="text-xs text-muted-foreground">{formatGuaranies(Number(form.limite_credito))}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-corte">Día de Corte</Label>
                  <Input
                    id="deuda-corte"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={form.fecha_corte}
                    onChange={(e) => actualizar("fecha_corte", e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deuda-pago">Día de Pago</Label>
                  <Input
                    id="deuda-pago"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="25"
                    value={form.fecha_pago}
                    onChange={(e) => actualizar("fecha_pago", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="deuda-notas">Notas (Opcional)</Label>
            <Textarea
              id="deuda-notas"
              placeholder="Información adicional sobre la deuda..."
              value={form.notas}
              onChange={(e) => actualizar("notas", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => cerrar(false)} className="flex-1" disabled={guardando}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={registrar}
              disabled={guardando || faltanObligatorios}
              className={`flex-1 ${tipo === "prestamo" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
            >
              {guardando ? "Registrando..." : "Registrar Deuda"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
