"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Plus,
  Heart,
  Coins,
  Package,
  Home,
  CreditCard,
  Smile,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Landmark,
  Receipt,
  Info,
  Wallet,
  Building2,
  Banknote,
  ArrowRight,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTodayDate, formatGuaranies, getParaguayTimestamp } from "@/lib/utils"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { toast } from "sonner"

interface TipoCategoria {
  id: string
  nombre: string
  color: string
}

interface Categoria {
  id: string
  nombre: string
  tipo_categoria_id: string
}

interface Deuda {
  id: string
  nombre: string
  tipo_deuda: string
  monto_total: number
  monto_pagado: number
  cuotas_totales: number | null
  cuotas_pagadas: number
  monto_cuota: number | null
  acreedor: string
  estado: string
  limite_credito: number | null
  fecha_corte: number | null
  fecha_pago: number | null
}

interface CajaAhorro {
  id: string
  nombre: string
  monto_actual: number
  moneda: string
  color: string | null
  icono: string | null
}

const ICONOS_CATEGORIAS: Record<string, React.ElementType> = {
  Donación: Heart,
  "Ahorro 2025": Coins,
  Ahorro: Coins,
  "Gastos Varios": Package,
  "Gastos Fijos": Home,
  "Pago Deudas": CreditCard,
  Disfrute: Smile,
  Educación: GraduationCap,
  Sueños: Sparkles,
  "Libertad Financiera": TrendingUp,
}

const DISPLAY_NOMBRES: Record<string, string> = {
  "Ahorro 2025": "Ahorro",
}

export function EgresoForm() {
  const { perfilActual } = usePerfil()
  const [tiposCategorias, setTiposCategorias] = useState<TipoCategoria[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [selectedTipo, setSelectedTipo] = useState<string>("")
  const [selectedCategoria, setSelectedCategoria] = useState<string>("")
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [concepto, setConcepto] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [esPagoDeudas, setEsPagoDeudas] = useState(false)
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [selectedDeuda, setSelectedDeuda] = useState<string>("")
  const [numeroCuota, setNumeroCuota] = useState("")

  // Origen de fondos
  const [cajasAhorro, setCajasAhorro] = useState<CajaAhorro[]>([])
  const [tarjetasCredito, setTarjetasCredito] = useState<Deuda[]>([])
  const [origenTipo, setOrigenTipo] = useState<string>("")
  const [origenId, setOrigenId] = useState<string>("")

  const [showNewCategoria, setShowNewCategoria] = useState(false)
  const [newCategoriaNombre, setNewCategoriaNombre] = useState("")

  const [showAddDeudaModal, setShowAddDeudaModal] = useState(false)
  const [tipoNuevaDeuda, setTipoNuevaDeuda] = useState<"prestamo" | "tarjeta_credito">("prestamo")
  const [nuevaDeudaForm, setNuevaDeudaForm] = useState({
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
  const [isAddingDeuda, setIsAddingDeuda] = useState(false)

  const router = useRouter()

  useEffect(() => {
    setFecha(getTodayDate())
    if (perfilActual?.id) {
      loadTiposCategorias()
      loadOrigenFondos()
    }
  }, [perfilActual])

  useEffect(() => {
    if (selectedTipo) {
      loadCategorias(selectedTipo)

      const tipoSeleccionado = tiposCategorias.find((t) => t.id === selectedTipo)
      if (tipoSeleccionado?.nombre === "Pago Deudas") {
        setEsPagoDeudas(true)
        loadDeudas()
        autoSelectOrCreatePagoDeudaCategoria(selectedTipo)
      } else {
        setEsPagoDeudas(false)
        setSelectedDeuda("")
        setNumeroCuota("")
      }
    } else {
      setCategorias([])
      setSelectedCategoria("")
      setEsPagoDeudas(false)
    }
  }, [selectedTipo, tiposCategorias])

  const loadTiposCategorias = async () => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data, error: fetchError } = await supabase
        .from("tipos_categoria_egreso")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .order("nombre")

      if (!fetchError && data) {
        setTiposCategorias(data)
      }
    } catch (error) {
      setTiposCategorias([])
    }
  }

  const loadCategorias = async (tipoId: string) => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from("categorias_egreso")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .eq("tipo_categoria_id", tipoId)
        .order("nombre")

      if (!fetchError && data) {
        setCategorias(data)
      }
    } catch (error) {
      setCategorias([])
    }
  }

  const autoSelectOrCreatePagoDeudaCategoria = async (tipoId: string) => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Buscar si existe una categoría por defecto para Pago Deudas
      const { data: existingCats, error: fetchError } = await supabase
        .from("categorias_egreso")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .eq("tipo_categoria_id", tipoId)
        .order("nombre")

      if (!fetchError && existingCats && existingCats.length > 0) {
        // Auto-seleccionar la primera categoría existente
        setSelectedCategoria(existingCats[0].id)
      } else {
        // Crear categoría por defecto "Pago de Deuda"
        const { data: newCat, error: insertError } = await supabase
          .from("categorias_egreso")
          .insert({
            user_id: user.id,
            perfil_id: perfilActual.id,
            tipo_categoria_id: tipoId,
            nombre: "Pago de Deuda",
          })
          .select()

        if (!insertError && newCat && newCat[0]) {
          setSelectedCategoria(newCat[0].id)
          await loadCategorias(tipoId)
        }
      }
    } catch (error) {
      console.error("Error auto-selecting categoria:", error)
    }
  }

  const loadDeudas = async () => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: fetchError } = await supabase
        .from("deudas")
        .select("*")
        .eq("user_id", user.id)
        .eq("perfil_id", perfilActual.id)
        .eq("estado", "activa")
        .order("nombre")

      if (!fetchError && data) {
        setDeudas(data)
      }
    } catch (error) {
      setDeudas([])
    }
  }

  const loadOrigenFondos = async () => {
    if (!perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Cargar cajas de ahorro activas
      const { data: cajasData } = await supabase
        .from("cajas_ahorro")
        .select("id, nombre, monto_actual, moneda, color, icono")
        .eq("perfil_id", perfilActual.id)
        .eq("activa", true)
        .order("nombre")

      if (cajasData) setCajasAhorro(cajasData)

      // Cargar tarjetas de credito activas (para usar como origen de fondos)
      const { data: tarjetasData } = await supabase
        .from("deudas")
        .select("*")
        .eq("perfil_id", perfilActual.id)
        .eq("tipo_deuda", "tarjeta_credito")
        .eq("estado", "activa")
        .order("nombre")

      if (tarjetasData) setTarjetasCredito(tarjetasData)
    } catch (error) {
      setCajasAhorro([])
      setTarjetasCredito([])
    }
  }

  const handleAddCategoria = async () => {
    if (!newCategoriaNombre.trim() || !selectedTipo || !perfilActual?.id) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: insertError } = await supabase
        .from("categorias_egreso")
        .insert({
          user_id: user.id,
          perfil_id: perfilActual.id,
          tipo_categoria_id: selectedTipo,
          nombre: newCategoriaNombre.trim(),
        })
        .select()

      if (!insertError && data && data[0]) {
        await loadCategorias(selectedTipo)
        setSelectedCategoria(data[0].id)
        setNewCategoriaNombre("")
        setShowNewCategoria(false)
      } else if (insertError) {
        setError("Error al agregar descripción")
      }
    } catch (error) {
      setError("Error al agregar descripción")
    }
  }

  const handleAddDeuda = async () => {
    if (!perfilActual?.id || !nuevaDeudaForm.nombre || !nuevaDeudaForm.monto_total || !nuevaDeudaForm.acreedor) {
      toast.error("Completa los campos obligatorios: Nombre, Acreedor y Monto Total")
      return
    }

    setIsAddingDeuda(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const deudaData: any = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        nombre: nuevaDeudaForm.nombre,
        acreedor: nuevaDeudaForm.acreedor,
        monto_total: Number.parseFloat(nuevaDeudaForm.monto_total),
        monto_pagado: 0,
        cuotas_pagadas: 0,
        tipo_deuda: tipoNuevaDeuda,
        tasa_interes: nuevaDeudaForm.tasa_interes ? Number.parseFloat(nuevaDeudaForm.tasa_interes) : 0,
        fecha_inicio: nuevaDeudaForm.fecha_inicio,
        fecha_vencimiento: nuevaDeudaForm.fecha_vencimiento || null,
        estado: "activa",
        prioridad: "media",
        frecuencia_pago: "mensual",
        notas: nuevaDeudaForm.notas || null,
      }

      if (tipoNuevaDeuda === "prestamo") {
        deudaData.cuotas_totales = nuevaDeudaForm.cuotas_totales ? Number.parseInt(nuevaDeudaForm.cuotas_totales) : null
        deudaData.monto_cuota = nuevaDeudaForm.monto_cuota ? Number.parseFloat(nuevaDeudaForm.monto_cuota) : null
      } else {
        deudaData.limite_credito = nuevaDeudaForm.limite_credito
          ? Number.parseFloat(nuevaDeudaForm.limite_credito)
          : null
        deudaData.fecha_corte = nuevaDeudaForm.fecha_corte ? Number.parseInt(nuevaDeudaForm.fecha_corte) : null
        deudaData.fecha_pago = nuevaDeudaForm.fecha_pago ? Number.parseInt(nuevaDeudaForm.fecha_pago) : null
      }

      const { data, error: insertError } = await supabase.from("deudas").insert(deudaData).select()

      if (insertError) throw insertError

      toast.success("Deuda registrada exitosamente")

      // Resetear formulario
      setNuevaDeudaForm({
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
      setTipoNuevaDeuda("prestamo")
      setShowAddDeudaModal(false)

      // Recargar deudas y seleccionar la nueva
      await loadDeudas()
      if (data && data[0]) {
        setSelectedDeuda(data[0].id)
        if (data[0].monto_cuota) {
          setMonto(String(data[0].monto_cuota))
        }
        if (data[0].cuotas_totales) {
          setNumeroCuota("1")
        }
      }
    } catch (error) {
      console.error("Error creating deuda:", error)
      toast.error("Error al registrar la deuda")
    } finally {
      setIsAddingDeuda(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Usuario no autenticado")
      }

      if (!selectedTipo || !selectedCategoria) {
        throw new Error("Debes seleccionar un tipo de categoría y una descripción")
      }

      if (esPagoDeudas && !selectedDeuda) {
        throw new Error("Debes seleccionar una deuda para registrar el pago")
      }

      const montoNumerico = Number.parseFloat(monto)

      // Validar saldo disponible en el origen seleccionado
      if (origenTipo && origenId) {
        if (origenTipo === "caja_ahorro") {
          const cajaOrigen = cajasAhorro.find((c) => c.id === origenId)
          if (cajaOrigen && montoNumerico > Number(cajaOrigen.monto_actual)) {
            throw new Error(`Saldo insuficiente en "${cajaOrigen.nombre}". Disponible: ${formatGuaranies(Number(cajaOrigen.monto_actual))}`)
          }
        } else if (origenTipo === "tarjeta_credito") {
          const tarjetaOrigen = tarjetasCredito.find((t) => t.id === origenId)
          if (tarjetaOrigen && montoNumerico > Number(tarjetaOrigen.monto_total)) {
            throw new Error(`Crédito insuficiente en "${tarjetaOrigen.nombre}". Disponible: ${formatGuaranies(Number(tarjetaOrigen.monto_total))}`)
          }
        }
      }

      const egresoData: any = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        tipo_categoria_id: selectedTipo,
        categoria_id: selectedCategoria,
        monto: montoNumerico,
        fecha: fecha,
        concepto: concepto || null,
        origen_tipo: origenTipo || null,
        origen_id: origenId || null,
      }

      if (esPagoDeudas && selectedDeuda) {
        egresoData.deuda_id = selectedDeuda
        if (numeroCuota) {
          egresoData.numero_cuota = Number.parseInt(numeroCuota)
        }
      }

      const { error: insertError } = await supabase.from("egresos").insert(egresoData).select()

      if (insertError) {
        throw insertError
      }

      // Descontar del origen de fondos
      if (origenTipo && origenId) {
        if (origenTipo === "caja_ahorro") {
          // Descontar de la caja de ahorro
          const cajaOrigen = cajasAhorro.find((c) => c.id === origenId)
          if (cajaOrigen) {
            const nuevoMonto = Number(cajaOrigen.monto_actual) - montoNumerico

            await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: nuevoMonto })
              .eq("id", origenId)

            // Registrar movimiento de retiro
            await supabase.from("movimientos_caja").insert({
              caja_id: origenId,
              perfil_id: perfilActual.id,
              user_id: user.id,
              tipo: "retiro",
              monto: montoNumerico,
              descripcion: `Egreso: ${concepto || selectedTipoData?.nombre || "Gasto"}`,
              fecha: fecha,
            })
          }
        } else if (origenTipo === "tarjeta_credito") {
          // Descontar del credito disponible de la tarjeta
          const tarjetaOrigen = tarjetasCredito.find((t) => t.id === origenId)
          if (tarjetaOrigen) {
            const nuevoDisponible = Number(tarjetaOrigen.monto_total) - montoNumerico
            await supabase
              .from("deudas")
              .update({
                monto_total: nuevoDisponible,
                updated_at: getParaguayTimestamp(),
              })
              .eq("id", origenId)
          }
        }
      }

      if (esPagoDeudas && selectedDeuda) {
        const deudaSeleccionada = deudas.find((d) => d.id === selectedDeuda)
        if (deudaSeleccionada) {
          const montoPago = Number.parseFloat(monto)
          const nuevoMontoPagado = Number(deudaSeleccionada.monto_pagado) + montoPago
          const nuevasCuotasPagadas = deudaSeleccionada.cuotas_pagadas + (numeroCuota ? 1 : 0)
          
          let estaPagada = false
          let nuevoMontoTotal = Number(deudaSeleccionada.monto_total)

          if (deudaSeleccionada.tipo_deuda === "tarjeta_credito") {
            // Para tarjetas: al pagar, aumenta el monto disponible
            nuevoMontoTotal = Number(deudaSeleccionada.monto_total) + montoPago
            const limiteCredito = Number(deudaSeleccionada.limite_credito) || 0
            // La tarjeta está "pagada" solo si el disponible alcanza el límite
            estaPagada = nuevoMontoTotal >= limiteCredito
          } else {
            // Para préstamos: verificar si se pagó todo el monto total
            estaPagada = nuevoMontoPagado >= Number(deudaSeleccionada.monto_total)
          }

          await supabase
            .from("deudas")
            .update({
              monto_total: nuevoMontoTotal,
              monto_pagado: nuevoMontoPagado,
              cuotas_pagadas: nuevasCuotasPagadas,
              estado: estaPagada ? "pagada" : "activa",
              updated_at: getParaguayTimestamp(),
            })
            .eq("id", selectedDeuda)
        }
      }

      setSuccess(true)
      setSelectedTipo("")
      setSelectedCategoria("")
      setMonto("")
      setFecha(getTodayDate())
      setConcepto("")
      setSelectedDeuda("")
      setNumeroCuota("")
      setEsPagoDeudas(false)
      setOrigenTipo("")
      setOrigenId("")

      // Recargar saldos de cajas y tarjetas para reflejar el descuento inmediatamente
      await loadOrigenFondos()

      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar egreso")
    } finally {
      setIsLoading(false)
    }
  }

  const getDeudaIcon = (tipo: string) => {
    return tipo === "tarjeta_credito" ? CreditCard : Landmark
  }

  if (!perfilActual) {
    return (
      <Card className="max-w-2xl mx-auto glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  const selectedTipoData = tiposCategorias.find((t) => t.id === selectedTipo)
  const selectedDeudaData = deudas.find((d) => d.id === selectedDeuda)

  return (
    <Card className="max-w-2xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Registrar Egreso</CardTitle>
            <CardDescription>Completa los datos de tu egreso para {perfilActual.nombre}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Tipo de Categoría</Label>

            {tiposCategorias.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {tiposCategorias.map((tipo) => {
                  const Icon = ICONOS_CATEGORIAS[tipo.nombre] || Package
                  const isSelected = selectedTipo === tipo.id

                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      onClick={() => setSelectedTipo(tipo.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected ? "border-white scale-105 shadow-lg" : "border-border/30 hover:border-border/60"
                      }`}
                      style={{
                        backgroundColor: isSelected ? `${tipo.color}20` : "transparent",
                      }}
                    >
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="p-3 rounded-full" style={{ backgroundColor: `${tipo.color}30` }}>
                          <Icon className="w-5 h-5" style={{ color: tipo.color }} />
                        </div>
                        <span className="text-sm font-medium">{tipo.nombre}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-4 text-center bg-background/30 rounded-lg border border-border/50">
                No tienes tipos de categoría. Por favor contacta al administrador.
              </p>
            )}
          </div>

          {esPagoDeudas && (
            <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent border border-red-500/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-red-500/20">
                    <CreditCard className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <Label className="text-base font-semibold text-red-400">Pago de Deuda</Label>
                    <p className="text-xs text-muted-foreground">Selecciona la deuda que deseas abonar</p>
                  </div>
                </div>

                {/* Modal para agregar nueva deuda */}
                <Dialog open={showAddDeudaModal} onOpenChange={setShowAddDeudaModal}>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs bg-transparent border-green-500/30 hover:bg-green-500/10 text-green-400"
                    >
                      <Plus className="w-3 h-3" />
                      Nueva Deuda
                    </Button>
                  </DialogTrigger>
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

                    <div className="space-y-6 pt-4">
                      {/* Tipo de deuda */}
                      <div className="space-y-3">
                        <Label>Tipo de Deuda</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setTipoNuevaDeuda("prestamo")}
                            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                              tipoNuevaDeuda === "prestamo"
                                ? "border-blue-400 bg-blue-500/20"
                                : "border-border/30 hover:border-blue-400/50"
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
                            onClick={() => setTipoNuevaDeuda("tarjeta_credito")}
                            className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                              tipoNuevaDeuda === "tarjeta_credito"
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

                      {/* Campos comunes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="deuda-nombre">Nombre *</Label>
                          <Input
                            id="deuda-nombre"
                            placeholder={tipoNuevaDeuda === "tarjeta_credito" ? "Visa Oro" : "Préstamo Personal"}
                            value={nuevaDeudaForm.nombre}
                            onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, nombre: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deuda-acreedor">Acreedor/Banco *</Label>
                          <Input
                            id="deuda-acreedor"
                            placeholder="Banco Itaú"
                            value={nuevaDeudaForm.acreedor}
                            onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, acreedor: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="deuda-monto">
                            {tipoNuevaDeuda === "tarjeta_credito" ? "Monto Disponible *" : "Monto Total *"}
                          </Label>
                          <Input
                            id="deuda-monto"
                            type="text"
                            inputMode="numeric"
                            placeholder="5000000"
                            value={nuevaDeudaForm.monto_total}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, "")
                              setNuevaDeudaForm({ ...nuevaDeudaForm, monto_total: value })
                            }}
                          />
                          {nuevaDeudaForm.monto_total && (
                            <p className="text-xs text-muted-foreground">
                              {formatGuaranies(Number(nuevaDeudaForm.monto_total))}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deuda-interes">Tasa de Interés (%)</Label>
                          <Input
                            id="deuda-interes"
                            type="number"
                            step="0.01"
                            placeholder="12.5"
                            value={nuevaDeudaForm.tasa_interes}
                            onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, tasa_interes: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Campos específicos para préstamo */}
                      {tipoNuevaDeuda === "prestamo" && (
                        <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <div className="flex items-center gap-2 text-blue-400">
                            <Landmark className="w-4 h-4" />
                            <span className="font-medium text-sm">Datos del Préstamo</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="deuda-cuotas">Cantidad de Cuotas</Label>
                              <Input
                                id="deuda-cuotas"
                                type="number"
                                placeholder="12"
                                value={nuevaDeudaForm.cuotas_totales}
                                onChange={(e) =>
                                  setNuevaDeudaForm({ ...nuevaDeudaForm, cuotas_totales: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="deuda-monto-cuota">Monto por Cuota</Label>
                              <Input
                                id="deuda-monto-cuota"
                                type="text"
                                inputMode="numeric"
                                placeholder="450000"
                                value={nuevaDeudaForm.monto_cuota}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "")
                                  setNuevaDeudaForm({ ...nuevaDeudaForm, monto_cuota: value })
                                }}
                              />
                              {nuevaDeudaForm.monto_cuota && (
                                <p className="text-xs text-muted-foreground">
                                  {formatGuaranies(Number(nuevaDeudaForm.monto_cuota))}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="deuda-fecha-inicio">Fecha de Inicio</Label>
                              <Input
                                id="deuda-fecha-inicio"
                                type="date"
                                value={nuevaDeudaForm.fecha_inicio}
                                onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, fecha_inicio: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="deuda-fecha-vencimiento">Fecha de Vencimiento</Label>
                              <Input
                                id="deuda-fecha-vencimiento"
                                type="date"
                                value={nuevaDeudaForm.fecha_vencimiento}
                                onChange={(e) =>
                                  setNuevaDeudaForm({ ...nuevaDeudaForm, fecha_vencimiento: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Campos específicos para tarjeta de crédito */}
                      {tipoNuevaDeuda === "tarjeta_credito" && (
                        <div className="space-y-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <div className="flex items-center gap-2 text-purple-400">
                            <CreditCard className="w-4 h-4" />
                            <span className="font-medium text-sm">Datos de la Tarjeta</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="deuda-limite">Límite de Crédito</Label>
                              <Input
                                id="deuda-limite"
                                type="text"
                                inputMode="numeric"
                                placeholder="10000000"
                                value={nuevaDeudaForm.limite_credito}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/[^0-9]/g, "")
                                  setNuevaDeudaForm({ ...nuevaDeudaForm, limite_credito: value })
                                }}
                              />
                              {nuevaDeudaForm.limite_credito && (
                                <p className="text-xs text-muted-foreground">
                                  {formatGuaranies(Number(nuevaDeudaForm.limite_credito))}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="deuda-corte">Día de Corte</Label>
                              <Input
                                id="deuda-corte"
                                type="number"
                                min="1"
                                max="31"
                                placeholder="15"
                                value={nuevaDeudaForm.fecha_corte}
                                onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, fecha_corte: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="deuda-pago">Día de Pago</Label>
                              <Input
                                id="deuda-pago"
                                type="number"
                                min="1"
                                max="31"
                                placeholder="25"
                                value={nuevaDeudaForm.fecha_pago}
                                onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, fecha_pago: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notas */}
                      <div className="space-y-2">
                        <Label htmlFor="deuda-notas">Notas (Opcional)</Label>
                        <Textarea
                          id="deuda-notas"
                          placeholder="Información adicional sobre la deuda..."
                          value={nuevaDeudaForm.notas}
                          onChange={(e) => setNuevaDeudaForm({ ...nuevaDeudaForm, notas: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Botones */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAddDeudaModal(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddDeuda}
                          disabled={
                            isAddingDeuda ||
                            !nuevaDeudaForm.nombre ||
                            !nuevaDeudaForm.monto_total ||
                            !nuevaDeudaForm.acreedor
                          }
                          className={`flex-1 ${tipoNuevaDeuda === "prestamo" ? "bg-blue-600 hover:bg-blue-700" : "bg-purple-600 hover:bg-purple-700"}`}
                        >
                          {isAddingDeuda ? "Registrando..." : "Registrar Deuda"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {deudas.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {deudas.map((deuda) => {
                      const Icon = getDeudaIcon(deuda.tipo_deuda)
                      const isSelected = selectedDeuda === deuda.id
                      const esTarjeta = deuda.tipo_deuda === "tarjeta_credito"
                      // Para tarjetas: Pendiente = Límite de Crédito - Monto Disponible (monto_total)
                      // Para préstamos: Pendiente = Monto Total - Monto Pagado
                      const pendiente = esTarjeta
                        ? (Number(deuda.limite_credito) || 0) - Number(deuda.monto_total)
                        : Number(deuda.monto_total) - Number(deuda.monto_pagado)
                      // Para tarjetas: Porcentaje = (Pagado / (Pendiente + Pagado)) * 100
                      // Para préstamos: Porcentaje = (Pagado / Monto Total) * 100 (igual que en sección Deudas)
                      const totalDeuda = esTarjeta ? pendiente : Number(deuda.monto_total)
                      const porcentaje = esTarjeta 
                        ? (totalDeuda > 0 ? (Number(deuda.monto_pagado) / (totalDeuda + Number(deuda.monto_pagado))) * 100 : 0)
                        : (Number(deuda.monto_total) > 0 ? (Number(deuda.monto_pagado) / Number(deuda.monto_total)) * 100 : 0)

                      return (
                        <button
                          key={deuda.id}
                          type="button"
                          onClick={() => {
                            setSelectedDeuda(deuda.id)
                            if (deuda.monto_cuota && !monto) {
                              setMonto(String(deuda.monto_cuota))
                            }
                            if (deuda.cuotas_totales) {
                              setNumeroCuota(String(deuda.cuotas_pagadas + 1))
                            }
                          }}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? esTarjeta
                                ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/10"
                                : "border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/10"
                              : "border-border/30 hover:border-border/60 bg-background/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`p-2.5 rounded-xl ${esTarjeta ? "bg-purple-500/20" : "bg-blue-500/20"}`}>
                                <Icon className={`w-5 h-5 ${esTarjeta ? "text-purple-400" : "text-blue-400"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold truncate">{deuda.nombre}</p>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                                      esTarjeta ? "bg-purple-500/20 text-purple-300" : "bg-blue-500/20 text-blue-300"
                                    }`}
                                  >
                                    {esTarjeta ? "Tarjeta" : "Préstamo"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{deuda.acreedor}</p>

                                <div className="mt-2.5">
                                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                    <span>Pagado: {formatGuaranies(Number(deuda.monto_pagado))}</span>
                                    <span>{porcentaje.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        esTarjeta
                                          ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                          : "bg-gradient-to-r from-blue-500 to-cyan-500"
                                      }`}
                                      style={{ width: `${porcentaje}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-lg font-bold text-red-400">
                                {formatGuaranies(pendiente)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">pendiente</p>
                              {deuda.cuotas_totales && (
                                <p className="text-xs text-muted-foreground mt-1 bg-background/50 px-2 py-0.5 rounded-full">
                                  Cuota {deuda.cuotas_pagadas + 1}/{deuda.cuotas_totales}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedDeudaData && (
                    <div className="p-4 rounded-xl bg-background/50 border border-border/50 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span>Detalles del pago para: {selectedDeudaData.nombre}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {selectedDeudaData.tipo_deuda === "prestamo" && selectedDeudaData.cuotas_totales && (
                          <div className="space-y-2">
                            <Label htmlFor="numeroCuota" className="flex items-center gap-2 text-sm">
                              <Receipt className="w-4 h-4 text-blue-400" />
                              Número de Cuota
                            </Label>
                            <Input
                              id="numeroCuota"
                              type="number"
                              min="1"
                              max={selectedDeudaData.cuotas_totales}
                              value={numeroCuota}
                              onChange={(e) => setNumeroCuota(e.target.value)}
                              placeholder={`1 - ${selectedDeudaData.cuotas_totales}`}
                              className="bg-background/50 border-border/50"
                            />
                            <p className="text-xs text-muted-foreground">
                              Pagadas: {selectedDeudaData.cuotas_pagadas} de {selectedDeudaData.cuotas_totales}
                            </p>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Monto sugerido</Label>
                          {selectedDeudaData.monto_cuota ? (
                            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                              <p className="text-xl font-bold text-green-400">
                                {formatGuaranies(Number(selectedDeudaData.monto_cuota))}
                              </p>
                              <p className="text-xs text-muted-foreground">por cuota</p>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-muted/30">
                              <p className="text-sm text-muted-foreground">Sin cuota fija definida</p>
                              <p className="text-xs text-muted-foreground">Ingresa el monto a pagar</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                        {(() => {
                          const esTarjeta = selectedDeudaData.tipo_deuda === "tarjeta_credito"
                          const montoPagado = Number(selectedDeudaData.monto_pagado)
                          const limiteCredito = Number(selectedDeudaData.limite_credito) || 0
                          const montoDisponible = Number(selectedDeudaData.monto_total)
                          
                          // Para tarjetas: Total Deuda = Límite de Crédito - Monto Disponible
                          // Para préstamos: Total Deuda = Monto Total
                          const totalDeuda = esTarjeta
                            ? limiteCredito - montoDisponible
                            : montoDisponible
                          
                          // Para tarjetas: Pendiente = Total Deuda (mismo valor, sin restar pagado)
                          // Para préstamos: Pendiente = Total Deuda - Pagado
                          const pendienteActual = esTarjeta ? totalDeuda : totalDeuda - montoPagado
                          
                          return (
                            <>
                              <div className="text-center p-2 rounded-lg bg-muted/20">
                                <p className="text-xs text-muted-foreground">
                                  {esTarjeta ? "Límite de Crédito" : "Total deuda"}
                                </p>
                                <p className="text-sm font-semibold">
                                  {formatGuaranies(esTarjeta ? limiteCredito : totalDeuda)}
                                </p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-green-500/10">
                                <p className="text-xs text-muted-foreground">Pagado</p>
                                <p className="text-sm font-semibold text-green-400">
                                  {formatGuaranies(montoPagado)}
                                </p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-red-500/10">
                                <p className="text-xs text-muted-foreground">Pendiente</p>
                                <p className="text-sm font-semibold text-red-400">
                                  {formatGuaranies(pendienteActual)}
                                </p>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/30 flex items-center justify-center">
                    <CreditCard className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">No tienes deudas activas</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Registra tus préstamos y tarjetas de crédito para hacer seguimiento
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-2 bg-transparent border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => setShowAddDeudaModal(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Primera Deuda
                  </Button>
                </div>
              )}
            </div>
          )}

          {selectedTipo && !esPagoDeudas && (
            <div className="space-y-3">
              <Label>Descripción</Label>

              {categorias.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {categorias.map((cat) => {
                    const isSelected = selectedCategoria === cat.id

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoria(cat.id)}
                        className={`p-3 rounded-lg border-2 transition-all text-sm ${
                          isSelected ? "border-white" : "border-border/30 hover:border-border/60"
                        }`}
                        style={{
                          backgroundColor: isSelected ? `${selectedTipoData?.color}20` : "transparent",
                          color: isSelected ? selectedTipoData?.color : "inherit",
                        }}
                      >
                        {cat.nombre}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground p-4 text-center rounded-lg border"
                  style={{
                    backgroundColor: `${selectedTipoData?.color}10`,
                    borderColor: `${selectedTipoData?.color}40`,
                  }}
                >
                  No hay descripciones en este tipo. Agrega una abajo.
                </p>
              )}

              {!showNewCategoria ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewCategoria(true)}
                  className="w-full gap-2"
                  style={{
                    borderColor: `${selectedTipoData?.color}40`,
                    color: selectedTipoData?.color,
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Agregar descripción a {selectedTipoData?.nombre}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre de la descripción..."
                    value={newCategoriaNombre}
                    onChange={(e) => setNewCategoriaNombre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddCategoria()
                      }
                    }}
                    className="bg-background/50"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={handleAddCategoria}
                    style={{ backgroundColor: selectedTipoData?.color }}
                  >
                    Agregar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewCategoria(false)
                      setNewCategoriaNombre("")
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Selector de Origen de Fondos */}
          {selectedTipo && (
            <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <Wallet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <Label className="text-base font-semibold text-emerald-400">Origen del Dinero</Label>
                  <p className="text-xs text-muted-foreground">Selecciona de donde sale el dinero (opcional)</p>
                </div>
              </div>

              {/* Tipo de origen */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setOrigenTipo(""); setOrigenId("") }}
                  className={`p-3 rounded-lg border-2 transition-all text-center text-xs ${
                    !origenTipo
                      ? "border-emerald-400 bg-emerald-500/20"
                      : "border-border/30 hover:border-border/60"
                  }`}
                >
                  <Banknote className="w-5 h-5 mx-auto mb-1 text-emerald-400" />
                  <span className="font-medium">Sin especificar</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOrigenTipo("caja_ahorro"); setOrigenId("") }}
                  className={`p-3 rounded-lg border-2 transition-all text-center text-xs ${
                    origenTipo === "caja_ahorro"
                      ? "border-blue-400 bg-blue-500/20"
                      : "border-border/30 hover:border-border/60"
                  }`}
                >
                  <Building2 className="w-5 h-5 mx-auto mb-1 text-blue-400" />
                  <span className="font-medium">Caja de Ahorro</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setOrigenTipo("tarjeta_credito"); setOrigenId("") }}
                  className={`p-3 rounded-lg border-2 transition-all text-center text-xs ${
                    origenTipo === "tarjeta_credito"
                      ? "border-purple-400 bg-purple-500/20"
                      : "border-border/30 hover:border-border/60"
                  }`}
                >
                  <CreditCard className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                  <span className="font-medium">Tarjeta Crédito</span>
                </button>
              </div>

              {/* Seleccionar caja de ahorro */}
              {origenTipo === "caja_ahorro" && (
                <div className="space-y-2">
                  {cajasAhorro.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {cajasAhorro.map((caja) => {
                        const isSelected = origenId === caja.id
                        const saldoInsuficiente = monto && Number(caja.monto_actual) < Number(monto)
                        return (
                          <button
                            key={caja.id}
                            type="button"
                            onClick={() => setOrigenId(caja.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                              isSelected
                                ? "border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/10"
                                : "border-border/30 hover:border-border/60 bg-background/50"
                            } ${saldoInsuficiente ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-blue-500/20">
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{caja.nombre}</p>
                                <p className="text-xs text-muted-foreground">{caja.moneda}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${saldoInsuficiente ? "text-red-400" : "text-emerald-400"}`}>
                                {formatGuaranies(Number(caja.monto_actual))}
                              </p>
                              {saldoInsuficiente && (
                                <p className="text-[10px] text-red-400">Saldo insuficiente</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg border border-border/50">
                      No tienes cajas de ahorro activas. Crea una desde la seccion Cajas de Ahorro.
                    </p>
                  )}
                </div>
              )}

              {/* Seleccionar tarjeta de crédito */}
              {origenTipo === "tarjeta_credito" && (
                <div className="space-y-2">
                  {tarjetasCredito.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {tarjetasCredito.map((tarjeta) => {
                        const isSelected = origenId === tarjeta.id
                        const disponible = Number(tarjeta.monto_total)
                        const limite = Number(tarjeta.limite_credito) || 0
                        const creditoInsuficiente = monto && disponible < Number(monto)
                        return (
                          <button
                            key={tarjeta.id}
                            type="button"
                            onClick={() => setOrigenId(tarjeta.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-left flex items-center justify-between ${
                              isSelected
                                ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/10"
                                : "border-border/30 hover:border-border/60 bg-background/50"
                            } ${creditoInsuficiente ? "opacity-60" : ""}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-purple-500/20">
                                <CreditCard className="w-4 h-4 text-purple-400" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{tarjeta.nombre}</p>
                                <p className="text-xs text-muted-foreground">{tarjeta.acreedor}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold text-sm ${creditoInsuficiente ? "text-red-400" : "text-emerald-400"}`}>
                                {formatGuaranies(disponible)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Limite: {formatGuaranies(limite)}
                              </p>
                              {creditoInsuficiente && (
                                <p className="text-[10px] text-red-400">Credito insuficiente</p>
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 bg-background/30 rounded-lg border border-border/50">
                      No tienes tarjetas de credito activas. Registra una desde la seccion Deudas.
                    </p>
                  )}
                </div>
              )}

              {/* Resumen del origen seleccionado */}
              {origenTipo && origenId && monto && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Se descontara <span className="font-bold">{formatGuaranies(Number(monto))}</span> de{" "}
                    <span className="font-bold">
                      {origenTipo === "caja_ahorro"
                        ? cajasAhorro.find((c) => c.id === origenId)?.nombre
                        : tarjetasCredito.find((t) => t.id === origenId)?.nombre}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="monto" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monto (Guaranies)
            </Label>
            <Input
              id="monto"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="500000"
              value={monto}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, "")
                setMonto(value)
              }}
              required
              className="bg-background/50"
            />
            {monto && <p className="text-sm text-muted-foreground">{formatGuaranies(Number.parseFloat(monto) || 0)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha
            </Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto (Opcional)</Label>
            <Textarea
              id="concepto"
              placeholder="Descripción adicional del egreso"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="bg-background/50"
              rows={3}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <p className="text-sm text-green-500">Egreso registrado correctamente</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !selectedTipo || !selectedCategoria || !monto || (esPagoDeudas && !selectedDeuda) || (origenTipo && !origenId)}
            style={{
              backgroundColor: selectedTipoData?.color || undefined,
            }}
          >
            {isLoading ? "Registrando..." : "Registrar Egreso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
