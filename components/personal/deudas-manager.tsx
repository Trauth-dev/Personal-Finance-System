"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Plus,
  CreditCard,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Landmark,
  Trash2,
  Eye,
  Receipt,
  Building2,
  Pencil,
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { formatGuaranies } from "@/lib/utils"
import { toast } from "sonner"

interface Deuda {
  id: string
  nombre: string
  descripcion: string | null
  monto_total: number
  monto_pagado: number
  tasa_interes: number
  fecha_inicio: string
  fecha_vencimiento: string | null
  cuotas_totales: number | null
  cuotas_pagadas: number
  monto_cuota: number | null
  frecuencia_pago: string | null
  acreedor: string
  estado: string
  prioridad: string
  notas: string | null
  tipo_deuda: string
  limite_credito: number | null
  fecha_corte: number | null
  fecha_pago: number | null
}

interface PagoDeuda {
  id: string
  deuda_id: string
  monto: number
  fecha: string
  numero_cuota: number | null
  concepto: string | null
}

interface DeudasManagerProps {
  userId: string
  perfilId: string
}

const formatNumberWithSeparators = (value: string | number): string => {
  if (!value && value !== 0) return ""
  const num = typeof value === "string" ? value.replace(/\D/g, "") : value.toString()
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

const parseFormattedNumber = (value: string): string => {
  return value.replace(/\./g, "")
}

export function DeudasManager({ userId, perfilId }: DeudasManagerProps) {
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [pagos, setPagos] = useState<PagoDeuda[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedDeudaDetail, setSelectedDeudaDetail] = useState<string | null>(null)

  const [editingDeuda, setEditingDeuda] = useState<Deuda | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteConfirmDeuda, setDeleteConfirmDeuda] = useState<Deuda | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [tipoDeuda, setTipoDeuda] = useState<"prestamo" | "tarjeta_credito">("prestamo")

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    monto_total: "",
    tasa_interes: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    cuotas_totales: "",
    monto_cuota: "",
    frecuencia_pago: "mensual",
    acreedor: "",
    prioridad: "media",
    notas: "",
    limite_credito: "",
    fecha_corte: "",
    fecha_pago: "",
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    fetchDeudas()
    fetchPagos()
  }, [])

  const fetchDeudas = async () => {
    try {
      const { data, error } = await supabase
        .from("deudas")
        .select("*")
        .eq("user_id", userId)
        .eq("perfil_id", perfilId)
        .order("prioridad", { ascending: false })
        .order("fecha_vencimiento", { ascending: true })

      if (error) throw error
      setDeudas(data || [])
    } catch (error) {
      console.error("Error fetching deudas:", error)
      toast.error("Error al cargar las deudas")
    } finally {
      setLoading(false)
    }
  }

  const fetchPagos = async () => {
    try {
      const { data, error } = await supabase
        .from("egresos")
        .select("id, deuda_id, monto, fecha, numero_cuota, concepto")
        .eq("perfil_id", perfilId)
        .not("deuda_id", "is", null)
        .order("fecha", { ascending: false })

      if (error) throw error
      setPagos(data || [])
    } catch (error) {
      console.error("Error fetching pagos:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const deudaData: any = {
        user_id: userId,
        perfil_id: perfilId,
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        monto_total: Number.parseFloat(parseFormattedNumber(formData.monto_total)),
        tasa_interes: Number.parseFloat(formData.tasa_interes) || 0,
        fecha_inicio: formData.fecha_inicio,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        frecuencia_pago: formData.frecuencia_pago,
        acreedor: formData.acreedor,
        prioridad: formData.prioridad,
        notas: formData.notas || null,
        tipo_deuda: tipoDeuda,
      }

      if (tipoDeuda === "prestamo") {
        deudaData.cuotas_totales = formData.cuotas_totales ? Number.parseInt(formData.cuotas_totales) : null
        deudaData.monto_cuota = formData.monto_cuota
          ? Number.parseFloat(parseFormattedNumber(formData.monto_cuota))
          : null
      } else {
        deudaData.limite_credito = formData.limite_credito
          ? Number.parseFloat(parseFormattedNumber(formData.limite_credito))
          : null
        deudaData.fecha_corte = formData.fecha_corte ? Number.parseInt(formData.fecha_corte) : null
        deudaData.fecha_pago = formData.fecha_pago ? Number.parseInt(formData.fecha_pago) : null
      }

      const { error } = await supabase.from("deudas").insert(deudaData)

      if (error) throw error

      toast.success("Deuda registrada exitosamente")
      setShowForm(false)
      resetForm()
      fetchDeudas()
    } catch (error) {
      console.error("Error creating deuda:", error)
      toast.error("Error al registrar la deuda")
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeuda) return

    try {
      const deudaData: any = {
        nombre: formData.nombre,
        descripcion: formData.descripcion || null,
        monto_total: Number.parseFloat(parseFormattedNumber(formData.monto_total)),
        tasa_interes: Number.parseFloat(formData.tasa_interes) || 0,
        fecha_inicio: formData.fecha_inicio,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        frecuencia_pago: formData.frecuencia_pago,
        acreedor: formData.acreedor,
        prioridad: formData.prioridad,
        notas: formData.notas || null,
        tipo_deuda: tipoDeuda,
      }

      if (tipoDeuda === "prestamo") {
        deudaData.cuotas_totales = formData.cuotas_totales ? Number.parseInt(formData.cuotas_totales) : null
        deudaData.monto_cuota = formData.monto_cuota
          ? Number.parseFloat(parseFormattedNumber(formData.monto_cuota))
          : null
        deudaData.limite_credito = null
        deudaData.fecha_corte = null
        deudaData.fecha_pago = null
      } else {
        deudaData.limite_credito = formData.limite_credito
          ? Number.parseFloat(parseFormattedNumber(formData.limite_credito))
          : null
        deudaData.fecha_corte = formData.fecha_corte ? Number.parseInt(formData.fecha_corte) : null
        deudaData.fecha_pago = formData.fecha_pago ? Number.parseInt(formData.fecha_pago) : null
        deudaData.cuotas_totales = null
        deudaData.monto_cuota = null
      }

      const { error } = await supabase.from("deudas").update(deudaData).eq("id", editingDeuda.id)

      if (error) throw error

      toast.success("Deuda actualizada exitosamente")
      setShowEditModal(false)
      setEditingDeuda(null)
      resetForm()
      fetchDeudas()
    } catch (error) {
      console.error("Error updating deuda:", error)
      toast.error("Error al actualizar la deuda")
    }
  }

  const openEditModal = (deuda: Deuda) => {
    setEditingDeuda(deuda)
    setTipoDeuda(deuda.tipo_deuda === "tarjeta_credito" ? "tarjeta_credito" : "prestamo")
    setFormData({
      nombre: deuda.nombre,
      descripcion: deuda.descripcion || "",
      monto_total: formatNumberWithSeparators(deuda.monto_total),
      tasa_interes: deuda.tasa_interes?.toString() || "",
      fecha_inicio: deuda.fecha_inicio,
      fecha_vencimiento: deuda.fecha_vencimiento || "",
      cuotas_totales: deuda.cuotas_totales?.toString() || "",
      monto_cuota: deuda.monto_cuota ? formatNumberWithSeparators(deuda.monto_cuota) : "",
      frecuencia_pago: deuda.frecuencia_pago || "mensual",
      acreedor: deuda.acreedor,
      prioridad: deuda.prioridad,
      notas: deuda.notas || "",
      limite_credito: deuda.limite_credito ? formatNumberWithSeparators(deuda.limite_credito) : "",
      fecha_corte: deuda.fecha_corte?.toString() || "",
      fecha_pago: deuda.fecha_pago?.toString() || "",
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      monto_total: "",
      tasa_interes: "",
      fecha_inicio: new Date().toISOString().split("T")[0],
      fecha_vencimiento: "",
      cuotas_totales: "",
      monto_cuota: "",
      frecuencia_pago: "mensual",
      acreedor: "",
      prioridad: "media",
      notas: "",
      limite_credito: "",
      fecha_corte: "",
      fecha_pago: "",
    })
    setTipoDeuda("prestamo")
  }

  const confirmDeleteDeuda = (deuda: Deuda) => {
    setDeleteConfirmDeuda(deuda)
    setShowDeleteConfirm(true)
  }

  const handleDeleteDeuda = async () => {
    if (!deleteConfirmDeuda) return

    try {
      const { error } = await supabase.from("deudas").delete().eq("id", deleteConfirmDeuda.id)
      if (error) throw error
      toast.success("Deuda eliminada exitosamente")
      setShowDeleteConfirm(false)
      setDeleteConfirmDeuda(null)
      fetchDeudas()
    } catch (error) {
      console.error("Error deleting deuda:", error)
      toast.error("Error al eliminar la deuda")
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    const colors = {
      urgente: "bg-red-500",
      alta: "bg-orange-500",
      media: "bg-yellow-500",
      baja: "bg-green-500",
    }
    return colors[prioridad as keyof typeof colors] || colors.media
  }

  const getEstadoColor = (estado: string) => {
    const colors = {
      activa: "text-blue-400 bg-blue-500/20",
      pagada: "text-green-400 bg-green-500/20",
      vencida: "text-red-400 bg-red-500/20",
      refinanciada: "text-purple-400 bg-purple-500/20",
    }
    return colors[estado as keyof typeof colors] || colors.activa
  }

  // Separar deudas por tipo
  const prestamos = deudas.filter((d) => d.tipo_deuda !== "tarjeta_credito")
  const tarjetas = deudas.filter((d) => d.tipo_deuda === "tarjeta_credito")

  const totalDeudas = deudas.reduce((sum, d) => sum + Number(d.monto_total), 0)
  const totalPagado = deudas.reduce((sum, d) => sum + Number(d.monto_pagado), 0)
  const totalPendiente = totalDeudas - totalPagado
  const porcentajePagado = totalDeudas > 0 ? (totalPagado / totalDeudas) * 100 : 0

  if (loading) {
    return <div className="text-center py-8">Cargando deudas...</div>
  }

  const DeudaDetailCard = ({ deuda }: { deuda: Deuda }) => {
    const montoTotal = Number(deuda.monto_total) || 0
    const montoPagado = Number(deuda.monto_pagado) || 0
    const porcentaje = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0
    const pendiente = montoTotal - montoPagado
    const pagosDeuda = pagos.filter((p) => p.deuda_id === deuda.id)
    const Icon = deuda.tipo_deuda === "tarjeta_credito" ? CreditCard : Landmark

    const cuotaActual = deuda.cuotas_pagadas + 1
    const cuotasTotales = deuda.cuotas_totales || 0

    return (
      <Card className="border-2 hover:shadow-lg transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-full ${deuda.tipo_deuda === "tarjeta_credito" ? "bg-purple-500/20" : "bg-blue-500/20"}`}
              >
                <Icon
                  className={`w-6 h-6 ${deuda.tipo_deuda === "tarjeta_credito" ? "text-purple-400" : "text-blue-400"}`}
                />
              </div>
              <div>
                <CardTitle className="text-lg">{deuda.nombre}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{deuda.acreedor}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${deuda.tipo_deuda === "tarjeta_credito" ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"}`}
                  >
                    {deuda.tipo_deuda === "tarjeta_credito" ? "Tarjeta de Crédito" : "Préstamo"}
                  </span>
                  {deuda.tipo_deuda === "prestamo" && cuotasTotales > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold">
                      Cuota {Math.min(cuotaActual, cuotasTotales)} de {cuotasTotales}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className={`w-3 h-3 rounded-full ${getPrioridadColor(deuda.prioridad)}`} />
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${getEstadoColor(deuda.estado)}`}>
                {deuda.estado}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso de pago</span>
              <span className="font-semibold">{porcentaje.toFixed(1)}%</span>
            </div>
            <Progress value={porcentaje} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs text-muted-foreground">Monto Total</p>
              <p className="text-lg font-bold">{formatGuaranies(montoTotal)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10">
              <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
              <p className="text-lg font-bold text-red-400">{formatGuaranies(pendiente)}</p>
            </div>
          </div>

          {deuda.tipo_deuda === "prestamo" && cuotasTotales > 0 && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-300">Estado de Cuotas</span>
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-blue-400">Cuota {Math.min(cuotaActual, cuotasTotales)}</span>
                <span className="text-lg text-muted-foreground">de {cuotasTotales}</span>
              </div>
              {deuda.monto_cuota && (
                <p className="text-sm mt-2 text-muted-foreground">
                  Valor por cuota:{" "}
                  <span className="font-semibold text-foreground">{formatGuaranies(Number(deuda.monto_cuota))}</span>
                </p>
              )}
              <Progress value={(deuda.cuotas_pagadas / cuotasTotales) * 100} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {deuda.cuotas_pagadas} cuota(s) pagada(s) - {cuotasTotales - deuda.cuotas_pagadas} pendiente(s)
              </p>
            </div>
          )}

          {deuda.tipo_deuda === "tarjeta_credito" && (
            <div className="p-3 rounded-lg bg-purple-500/10 space-y-2">
              {deuda.limite_credito && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Límite de crédito</span>
                  <span className="font-semibold">{formatGuaranies(Number(deuda.limite_credito))}</span>
                </div>
              )}
              {deuda.fecha_corte && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha de corte</span>
                  <span className="font-semibold">Día {deuda.fecha_corte}</span>
                </div>
              )}
              {deuda.fecha_pago && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fecha de pago</span>
                  <span className="font-semibold">Día {deuda.fecha_pago}</span>
                </div>
              )}
            </div>
          )}

          {deuda.fecha_vencimiento && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Vence: {new Date(deuda.fecha_vencimiento).toLocaleDateString("es-ES")}</span>
            </div>
          )}

          {/* Historial de pagos */}
          {pagosDeuda.length > 0 && (
            <div className="border-t pt-4 mt-4">
              <button
                onClick={() => setSelectedDeudaDetail(selectedDeudaDetail === deuda.id ? null : deuda.id)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                <Eye className="w-4 h-4" />
                <span>Ver historial de pagos ({pagosDeuda.length})</span>
              </button>

              {selectedDeudaDetail === deuda.id && (
                <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                  {pagosDeuda.map((pago) => (
                    <div key={pago.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30 text-sm">
                      <div>
                        <p className="font-medium">{formatGuaranies(Number(pago.monto))}</p>
                        {pago.numero_cuota && (
                          <p className="text-xs text-muted-foreground">Cuota #{pago.numero_cuota}</p>
                        )}
                      </div>
                      <p className="text-muted-foreground">{new Date(pago.fecha).toLocaleDateString("es-ES")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditModal(deuda)}
              className="gap-1 border-orange-500 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400"
            >
              <Pencil className="w-4 h-4" />
              Editar
            </Button>
            <Button
              size="sm"
              onClick={() => confirmDeleteDeuda(deuda)}
              className="gap-1 bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const DeudaFormFields = () => (
    <>
      <div className="space-y-3">
        <Label>Tipo de Deuda</Label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setTipoDeuda("prestamo")}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              tipoDeuda === "prestamo" ? "border-blue-400 bg-blue-500/20" : "border-border/30 hover:border-blue-400/50"
            }`}
          >
            <div className="p-3 rounded-full bg-blue-500/20">
              <Landmark className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Préstamo</p>
              <p className="text-xs text-muted-foreground">Préstamos bancarios, personales, etc.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTipoDeuda("tarjeta_credito")}
            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
              tipoDeuda === "tarjeta_credito"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nombre">Nombre de la Deuda *</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder={tipoDeuda === "tarjeta_credito" ? "Ej: Visa Banco X" : "Ej: Préstamo Auto"}
            required
          />
        </div>

        <div>
          <Label htmlFor="acreedor">{tipoDeuda === "tarjeta_credito" ? "Banco Emisor *" : "Acreedor *"}</Label>
          <Input
            id="acreedor"
            value={formData.acreedor}
            onChange={(e) => setFormData({ ...formData, acreedor: e.target.value })}
            placeholder={tipoDeuda === "tarjeta_credito" ? "Ej: Banco Continental" : "Ej: Banco Itaú"}
            required
          />
        </div>

        <div>
          <Label htmlFor="monto_total">{tipoDeuda === "tarjeta_credito" ? "Saldo Actual *" : "Monto Total *"}</Label>
          <Input
            id="monto_total"
            value={formData.monto_total}
            onChange={(e) => {
              const raw = parseFormattedNumber(e.target.value)
              if (/^\d*$/.test(raw)) {
                setFormData({ ...formData, monto_total: formatNumberWithSeparators(raw) })
              }
            }}
            placeholder="Ej: 12.000.000"
            required
          />
        </div>

        <div>
          <Label htmlFor="tasa_interes">Tasa de Interés Anual (%)</Label>
          <Input
            id="tasa_interes"
            type="number"
            step="0.01"
            value={formData.tasa_interes}
            onChange={(e) => setFormData({ ...formData, tasa_interes: e.target.value })}
          />
        </div>

        {tipoDeuda === "prestamo" && (
          <>
            <div>
              <Label htmlFor="cuotas_totales">Número de Cuotas *</Label>
              <Input
                id="cuotas_totales"
                type="number"
                value={formData.cuotas_totales}
                onChange={(e) => setFormData({ ...formData, cuotas_totales: e.target.value })}
                placeholder="Ej: 24"
                required
              />
            </div>

            <div>
              <Label htmlFor="monto_cuota">Monto por Cuota *</Label>
              <Input
                id="monto_cuota"
                value={formData.monto_cuota}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value)
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, monto_cuota: formatNumberWithSeparators(raw) })
                  }
                }}
                placeholder="Ej: 500.000"
                required
              />
            </div>

            <div>
              <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento Final</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              />
            </div>
          </>
        )}

        {tipoDeuda === "tarjeta_credito" && (
          <>
            <div>
              <Label htmlFor="limite_credito">Límite de Crédito</Label>
              <Input
                id="limite_credito"
                value={formData.limite_credito}
                onChange={(e) => {
                  const raw = parseFormattedNumber(e.target.value)
                  if (/^\d*$/.test(raw)) {
                    setFormData({ ...formData, limite_credito: formatNumberWithSeparators(raw) })
                  }
                }}
                placeholder="Ej: 10.000.000"
              />
            </div>

            <div>
              <Label htmlFor="fecha_corte">Día de Corte (1-31)</Label>
              <Input
                id="fecha_corte"
                type="number"
                min="1"
                max="31"
                value={formData.fecha_corte}
                onChange={(e) => setFormData({ ...formData, fecha_corte: e.target.value })}
                placeholder="Ej: 15"
              />
            </div>

            <div>
              <Label htmlFor="fecha_pago">Día de Pago (1-31)</Label>
              <Input
                id="fecha_pago"
                type="number"
                min="1"
                max="31"
                value={formData.fecha_pago}
                onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                placeholder="Ej: 5"
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="fecha_inicio">Fecha de Inicio *</Label>
          <Input
            id="fecha_inicio"
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="frecuencia_pago">Frecuencia de Pago</Label>
          <Select
            value={formData.frecuencia_pago}
            onValueChange={(value) => setFormData({ ...formData, frecuencia_pago: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="quincenal">Quincenal</SelectItem>
              <SelectItem value="mensual">Mensual</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="prioridad">Prioridad</Label>
          <Select value={formData.prioridad} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="baja">Baja</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="descripcion">Descripción</Label>
        <Textarea
          id="descripcion"
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="notas">Notas adicionales</Label>
        <Textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          rows={2}
        />
      </div>
    </>
  )

  return (
    <div className="space-y-6">
      {/* Resumen de Deudas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-500/20 to-rose-500/10 border-2 border-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Total Deudas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{formatGuaranies(totalDeudas)}</div>
            <p className="text-xs font-semibold text-gray-400 mt-1">{deudas.length} deuda(s) registrada(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-2 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{formatGuaranies(totalPagado)}</div>
            <p className="text-xs font-semibold text-gray-400 mt-1">{porcentajePagado.toFixed(1)}% completado</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Saldo Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{formatGuaranies(totalPendiente)}</div>
            <Progress value={100 - porcentajePagado} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-2 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Deudas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{deudas.filter((d) => d.estado === "activa").length}</div>
            <p className="text-xs font-semibold text-gray-400 mt-1">Requieren atención</p>
          </CardContent>
        </Card>
      </div>

      {/* Botón Agregar Deuda */}
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="w-4 h-4" />
          {showForm ? "Cancelar" : "Agregar Deuda"}
        </Button>
      </div>

      {/* Formulario de Nueva Deuda */}
      {showForm && (
        <Card className="border-2 border-blue-500/30">
          <CardHeader>
            <CardTitle>Nueva Deuda</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <DeudaFormFields />
              <Button type="submit" className="w-full">
                Registrar Deuda
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-muted/80 border border-border">
          <TabsTrigger
            value="todos"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground"
          >
            <Building2 className="w-4 h-4" />
            Todos ({deudas.length})
          </TabsTrigger>
          <TabsTrigger
            value="prestamos"
            className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white text-foreground"
          >
            <Landmark className="w-4 h-4" />
            Préstamos ({prestamos.length})
          </TabsTrigger>
          <TabsTrigger
            value="tarjetas"
            className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-foreground"
          >
            <CreditCard className="w-4 h-4" />
            Tarjetas ({tarjetas.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {deudas.map((deuda) => (
              <DeudaDetailCard key={deuda.id} deuda={deuda} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prestamos" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {prestamos.map((deuda) => (
              <DeudaDetailCard key={deuda.id} deuda={deuda} />
            ))}
          </div>
          {prestamos.length === 0 && (
            <Card className="border-2 border-dashed border-muted">
              <CardContent className="py-12 text-center">
                <Landmark className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No tienes préstamos registrados</p>
                <Button
                  onClick={() => {
                    setShowForm(true)
                    setTipoDeuda("prestamo")
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Préstamo
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tarjetas" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tarjetas.map((deuda) => (
              <DeudaDetailCard key={deuda.id} deuda={deuda} />
            ))}
          </div>
          {tarjetas.length === 0 && (
            <Card className="border-2 border-dashed border-muted">
              <CardContent className="py-12 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No tienes tarjetas de crédito registradas</p>
                <Button
                  onClick={() => {
                    setShowForm(true)
                    setTipoDeuda("tarjeta_credito")
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Tarjeta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {deudas.length === 0 && !showForm && (
        <Card className="border-2 border-dashed border-muted">
          <CardContent className="py-12 text-center">
            <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No tienes deudas registradas</p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Agregar Primera Deuda
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Deuda</DialogTitle>
            <DialogDescription>
              Modifica los datos de la deuda. Los cambios se guardarán automáticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-6">
            <DeudaFormFields />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingDeuda(null)
                  resetForm()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la deuda <strong>"{deleteConfirmDeuda?.nombre}"</strong>? Esta acción
              no se puede deshacer y se perderá todo el historial de pagos asociado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteConfirmDeuda(null)
              }}
            >
              Cancelar
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteDeuda}>
              Sí, Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
