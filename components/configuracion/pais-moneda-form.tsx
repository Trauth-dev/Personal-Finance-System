"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COUNTRIES, getCountryByCode, getCurrencyConfig, setCurrentCurrency } from "@/lib/currency"
import { CheckCircle2, AlertCircle } from "lucide-react"

interface PaisMonedaFormProps {
  paisInicial: string
  monedaInicial: string
}

export function PaisMonedaForm({ paisInicial, monedaInicial }: PaisMonedaFormProps) {
  const [paisCode, setPaisCode] = useState(paisInicial || "PY")
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle")

  const paisSeleccionado = getCountryByCode(paisCode)
  const monedaCfg = getCurrencyConfig(paisSeleccionado.currency)
  const cambio = paisSeleccionado.currency !== monedaInicial

  const handleGuardar = async () => {
    setIsSaving(true)
    setStatus("idle")
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { error } = await supabase
        .from("profiles")
        .update({
          pais: paisSeleccionado.code,
          moneda: paisSeleccionado.currency,
          zona_horaria: paisSeleccionado.timezone,
          codigo_telefono: paisSeleccionado.dialCode,
        })
        .eq("id", user.id)

      if (error) throw error

      // Activar la nueva moneda de inmediato en toda la app.
      setCurrentCurrency(paisSeleccionado.currency)
      setStatus("ok")
      // Recargar para que todas las pantallas reflejen la nueva moneda.
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      console.error("[v0] Error al guardar país/moneda:", err)
      setStatus("error")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-white">País</label>
        <Select value={paisCode} onValueChange={setPaisCode} disabled={isSaving}>
          <SelectTrigger className="bg-slate-800/50 border-blue-500/30 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <span className="text-base leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">({c.currency})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-blue-500/20 p-4 text-sm">
        <p className="text-slate-300">
          Moneda de la cuenta:{" "}
          <span className="font-semibold text-white">
            {monedaCfg.name} ({monedaCfg.symbol})
          </span>
        </p>
        <p className="text-slate-400 mt-1">
          Ejemplo de formato:{" "}
          <span className="font-mono text-white">
            {monedaCfg.symbol}{" "}
            {(1234567).toLocaleString(monedaCfg.locale, {
              minimumFractionDigits: monedaCfg.decimals,
              maximumFractionDigits: monedaCfg.decimals,
            })}
          </span>
        </p>
      </div>

      {cambio && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Cambiar de moneda solo afecta cómo se muestran los montos. Los valores numéricos de tus movimientos no se
            convierten automáticamente.
          </span>
        </div>
      )}

      {status === "ok" && (
        <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-sm text-green-300">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Guardado. Actualizando la app...</span>
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>No se pudo guardar. Intentá nuevamente.</span>
        </div>
      )}

      <Button
        onClick={handleGuardar}
        disabled={isSaving || paisCode === paisInicial}
        className="bg-blue-500 hover:bg-blue-600 text-white"
      >
        {isSaving ? "Guardando..." : "Guardar cambios"}
      </Button>
    </div>
  )
}
