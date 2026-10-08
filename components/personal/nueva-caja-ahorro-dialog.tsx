"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { usePerfil } from "@/lib/contexts/perfil-context"
import { useToast } from "@/hooks/use-toast"
import {
  PiggyBank,
  Target,
  Heart,
  Home,
  Plane,
  GraduationCap,
  Car,
  Sparkles,
  Landmark,
  Wallet,
  Smartphone,
  Loader2,
} from "lucide-react"

export const iconosDisponibles = [
  { value: "piggy-bank", label: "Alcancía", icon: PiggyBank },
  { value: "heart", label: "Sueños", icon: Heart },
  { value: "home", label: "Casa", icon: Home },
  { value: "plane", label: "Viajes", icon: Plane },
  { value: "graduation-cap", label: "Educación", icon: GraduationCap },
  { value: "car", label: "Vehículo", icon: Car },
  { value: "sparkles", label: "Emergencias", icon: Sparkles },
  { value: "target", label: "Objetivo", icon: Target },
]

export const tiposCuenta = [
  { value: "cuenta_bancaria", label: "Cuenta Bancaria", icon: Landmark },
  { value: "billetera_digital", label: "Billetera Digital", icon: Smartphone },
  { value: "ahorro_personal", label: "Ahorro Personal / Efectivo", icon: Wallet },
  { value: "otro", label: "Otro", icon: PiggyBank },
]

export const coloresDisponibles = [
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "purple", label: "Morado", class: "bg-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "orange", label: "Naranja", class: "bg-orange-500" },
  { value: "teal", label: "Turquesa", class: "bg-teal-500" },
  { value: "amber", label: "Ámbar", class: "bg-amber-500" },
  { value: "red", label: "Rojo", class: "bg-red-500" },
]

export type CajaAhorroCreada = {
  id: string
  nombre: string
  monto_actual: number
  moneda: string | null
  color: string | null
  icono: string | null
  tipo_cuenta: string | null
  banco: string | null
}

const formInicial = {
  nombre: "",
  descripcion: "",
  meta_monto: "",
  icono: "piggy-bank",
  color: "blue",
  prioridad: "1",
  tipo_cuenta: "cuenta_bancaria",
  banco: "",
  numero_cuenta: "",
  moneda: "PYG",
}

const formatMiles = (value: string) => {
  const num = value.replace(/\D/g, "")
  if (!num) return ""
  return Number(num).toLocaleString("es-PY")
}

const parseMiles = (value: string) => value.replace(/\D/g, "")

interface NuevaCajaAhorroDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (caja: CajaAhorroCreada) => void
}

export function NuevaCajaAhorroDialog({ open, onOpenChange, onCreated }: NuevaCajaAhorroDialogProps) {
  const { perfilActual } = usePerfil()
  const { toast } = useToast()
  const [formData, setFormData] = useState(formInicial)
  const [isSaving, setIsSaving] = useState(false)

  const handleOpenChange = (value: boolean) => {
    if (!value && !isSaving) setFormData(formInicial)
    onOpenChange(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // El diálogo se renderiza en un portal, pero los eventos de React igualmente
    // burbujean por el árbol de componentes: evita disparar el submit del
    // formulario padre (p. ej. la carga de egresos).
    e.stopPropagation()
    if (!perfilActual || isSaving) return

    setIsSaving(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("cajas_ahorro")
      .insert({
        perfil_id: perfilActual.id,
        user_id: perfilActual.user_id,
        nombre: formData.nombre.trim(),
        descripcion: formData.descripcion || null,
        tipo: "otro",
        meta_monto: Number.parseFloat(formData.meta_monto || "0"),
        monto_actual: 0,
        icono: formData.icono,
        color: formData.color,
        prioridad: Number.parseInt(formData.prioridad),
        tipo_cuenta: formData.tipo_cuenta,
        banco: formData.banco || null,
        numero_cuenta: formData.numero_cuenta || null,
        moneda: formData.moneda || "PYG",
      })
      .select("id, nombre, monto_actual, moneda, color, icono, tipo_cuenta, banco")
      .single()
    setIsSaving(false)

    if (error || !data) {
      toast({
        title: "Error",
        description: "No se pudo crear la caja de ahorro",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Caja creada",
      description: "Tu caja de ahorro ha sido creada exitosamente",
    })
    setFormData(formInicial)
    onOpenChange(false)
    onCreated?.(data as CajaAhorroCreada)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="glass-effect max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Caja de Ahorro</DialogTitle>
          <DialogDescription>Define un nuevo objetivo de ahorro</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nueva-caja-nombre">Nombre de la Caja</Label>
            <Input
              id="nueva-caja-nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: Vacaciones, Casa, Emergencias"
              required
            />
          </div>

          <div>
            <Label>Tipo de Cuenta</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {tiposCuenta.map((tipo) => {
                const TipoIcon = tipo.icon
                const isSelected = formData.tipo_cuenta === tipo.value
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setFormData({ ...formData, tipo_cuenta: tipo.value })}
                    className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 text-xs ${
                      isSelected ? "border-primary bg-primary/10" : "border-border/50 hover:border-border"
                    }`}
                  >
                    <TipoIcon className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>{tipo.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {formData.tipo_cuenta === "cuenta_bancaria" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="nueva-caja-banco">Banco</Label>
                <Input
                  id="nueva-caja-banco"
                  value={formData.banco}
                  onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                  placeholder="Ej: Banco Continental"
                />
              </div>
              <div>
                <Label htmlFor="nueva-caja-numero">Nro. Cuenta (opcional)</Label>
                <Input
                  id="nueva-caja-numero"
                  value={formData.numero_cuenta}
                  onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                  placeholder="Ej: ****1234"
                />
              </div>
            </div>
          )}

          {formData.tipo_cuenta === "billetera_digital" && (
            <div>
              <Label htmlFor="nueva-caja-billetera">Nombre de Billetera</Label>
              <Input
                id="nueva-caja-billetera"
                value={formData.banco}
                onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                placeholder="Ej: Tigo Money, Personal Pay"
              />
            </div>
          )}

          <div>
            <Label>Moneda</Label>
            <Select value={formData.moneda} onValueChange={(value) => setFormData({ ...formData, moneda: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PYG">Guaranies (PYG)</SelectItem>
                <SelectItem value="USD">Dolares (USD)</SelectItem>
                <SelectItem value="BRL">Reales (BRL)</SelectItem>
                <SelectItem value="ARS">Pesos Argentinos (ARS)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="nueva-caja-descripcion">Descripcion (opcional)</Label>
            <Textarea
              id="nueva-caja-descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Describe tu objetivo de ahorro"
              rows={2}
            />
          </div>

          {/* Campos ocultos visualmente (Meta de Ahorro, Icono, Color, Prioridad).
              Se conservan en el estado con sus valores por defecto para que la
              creacion siga siendo 100% funcional. */}
          <div className="hidden">
            <Input
              type="text"
              inputMode="numeric"
              value={formatMiles(formData.meta_monto)}
              onChange={(e) => setFormData({ ...formData, meta_monto: parseMiles(e.target.value) })}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Crear Caja
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
