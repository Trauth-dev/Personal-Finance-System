"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import {
  PiggyBank,
  Plus,
  Target,
  Heart,
  Home,
  Plane,
  GraduationCap,
  Car,
  Sparkles,
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  Landmark,
  Wallet,
  Smartphone,
  Pencil,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatGuaranies } from "@/lib/utils"

type CajaAhorro = {
  id: string
  nombre: string
  descripcion: string | null
  meta_monto: number
  monto_actual: number
  icono: string
  color: string
  prioridad: number
  created_at: string
  tipo_cuenta: string | null
  banco: string | null
  numero_cuenta: string | null
  moneda: string | null
}

type MovimientoCaja = {
  id: string
  caja_id: string
  tipo: "deposito" | "retiro"
  monto: number
  descripcion: string | null
  fecha: string
}

const iconosDisponibles = [
  { value: "piggy-bank", label: "Alcancía", icon: PiggyBank },
  { value: "heart", label: "Sueños", icon: Heart },
  { value: "home", label: "Casa", icon: Home },
  { value: "plane", label: "Viajes", icon: Plane },
  { value: "graduation-cap", label: "Educación", icon: GraduationCap },
  { value: "car", label: "Vehículo", icon: Car },
  { value: "sparkles", label: "Emergencias", icon: Sparkles },
  { value: "target", label: "Objetivo", icon: Target },
]

const tiposCuenta = [
  { value: "cuenta_bancaria", label: "Cuenta Bancaria", icon: Landmark },
  { value: "billetera_digital", label: "Billetera Digital", icon: Smartphone },
  { value: "ahorro_personal", label: "Ahorro Personal / Efectivo", icon: Wallet },
  { value: "otro", label: "Otro", icon: PiggyBank },
]

const coloresDisponibles = [
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "purple", label: "Morado", class: "bg-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "orange", label: "Naranja", class: "bg-orange-500" },
  { value: "teal", label: "Turquesa", class: "bg-teal-500" },
  { value: "amber", label: "Ámbar", class: "bg-amber-500" },
  { value: "red", label: "Rojo", class: "bg-red-500" },
]

export function CajasAhorroManager() {
  const [cajas, setCajas] = useState<CajaAhorro[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isMovimientoDialogOpen, setIsMovimientoDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [cajaAEliminar, setCajaAEliminar] = useState<CajaAhorro | null>(null)
  const [cajaSeleccionada, setCajaSeleccionada] = useState<CajaAhorro | null>(null)
  const [editData, setEditData] = useState({
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
  })
  const { perfilActual } = usePerfil()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
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
  })

  const [movimientoData, setMovimientoData] = useState({
    tipo: "deposito" as "deposito" | "retiro",
    monto: "",
    descripcion: "",
  })

  // Helpers para separador de miles
  const formatMiles = (value: string) => {
    const num = value.replace(/\D/g, "")
    if (!num) return ""
    return Number(num).toLocaleString("es-PY")
  }

  const parseMiles = (value: string) => {
    return value.replace(/\D/g, "")
  }

  useEffect(() => {
    if (perfilActual) {
      loadCajas()
    }
  }, [perfilActual])

  const loadCajas = async () => {
    if (!perfilActual) return

    const supabase = createClient()
    setIsLoading(true)

    const { data, error } = await supabase
      .from("cajas_ahorro")
      .select("*")
      .eq("perfil_id", perfilActual.id)
      .order("prioridad", { ascending: true })

    if (!error && data) {
      setCajas(data)
    }

    setIsLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!perfilActual) return

    const supabase = createClient()

    const { data, error } = await supabase.from("cajas_ahorro").insert({
      perfil_id: perfilActual.id,
      user_id: perfilActual.user_id,
      nombre: formData.nombre,
      descripcion: formData.descripcion || null,
      tipo: 'otro',
      meta_monto: Number.parseFloat(formData.meta_monto || "0"),
      monto_actual: 0,
      icono: formData.icono,
      color: formData.color,
      prioridad: Number.parseInt(formData.prioridad),
      tipo_cuenta: formData.tipo_cuenta,
      banco: formData.banco || null,
      numero_cuenta: formData.numero_cuenta || null,
      moneda: formData.moneda || "PYG",
    }).select()

    if (!error) {
      toast({
        title: "Caja creada",
        description: "Tu caja de ahorro ha sido creada exitosamente",
      })
      setIsDialogOpen(false)
      setFormData({
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
      })
      loadCajas()
    } else {
      toast({
        title: "Error",
        description: "No se pudo crear la caja de ahorro",
        variant: "destructive",
      })
    }
  }

  const handleMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cajaSeleccionada) return

    const supabase = createClient()
    const monto = Number.parseFloat(movimientoData.monto)

    const { data: movData, error: movimientoError } = await supabase.from("movimientos_caja").insert({
      caja_id: cajaSeleccionada.id,
      tipo: movimientoData.tipo,
      monto: monto,
      concepto: movimientoData.descripcion || null,
      fecha: new Date().toISOString().split("T")[0],
    }).select()

    if (movimientoError) {
      toast({
        title: "Error",
        description: "No se pudo registrar el movimiento",
        variant: "destructive",
      })
      return
    }

    const nuevoMonto =
      movimientoData.tipo === "deposito" ? cajaSeleccionada.monto_actual + monto : cajaSeleccionada.monto_actual - monto

    const { error: updateError } = await supabase
      .from("cajas_ahorro")
      .update({ monto_actual: nuevoMonto })
      .eq("id", cajaSeleccionada.id)

    if (!updateError) {
      toast({
        title: "Movimiento registrado",
        description: `${movimientoData.tipo === "deposito" ? "Depósito" : "Retiro"} realizado exitosamente`,
      })
      setIsMovimientoDialogOpen(false)
      setCajaSeleccionada(null)
      setMovimientoData({
        tipo: "deposito",
        monto: "",
        descripcion: "",
      })
      loadCajas()
    } else {
      toast({
        title: "Error",
        description: "No se pudo actualizar la caja",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()

    const { error } = await supabase.from("cajas_ahorro").delete().eq("id", id)

    if (!error) {
      toast({
        title: "Caja eliminada",
        description: "La caja de ahorro ha sido eliminada",
      })
      setIsDeleteConfirmOpen(false)
      setCajaAEliminar(null)
      loadCajas()
    }
  }

  const openEditDialog = (caja: CajaAhorro) => {
    setEditData({
      nombre: caja.nombre,
      descripcion: caja.descripcion || "",
      meta_monto: caja.meta_monto > 0 ? String(caja.meta_monto) : "",
      icono: caja.icono || "piggy-bank",
      color: caja.color || "blue",
      prioridad: String(caja.prioridad || 1),
      tipo_cuenta: caja.tipo_cuenta || "cuenta_bancaria",
      banco: caja.banco || "",
      numero_cuenta: caja.numero_cuenta || "",
      moneda: caja.moneda || "PYG",
    })
    setCajaSeleccionada(caja)
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cajaSeleccionada) return

    const supabase = createClient()

    const { error } = await supabase
      .from("cajas_ahorro")
      .update({
        nombre: editData.nombre,
        descripcion: editData.descripcion || null,
        meta_monto: Number.parseFloat(editData.meta_monto || "0"),
        icono: editData.icono,
        color: editData.color,
        prioridad: Number.parseInt(editData.prioridad),
        tipo_cuenta: editData.tipo_cuenta,
        banco: editData.banco || null,
        numero_cuenta: editData.numero_cuenta || null,
        moneda: editData.moneda || "PYG",
      })
      .eq("id", cajaSeleccionada.id)

    if (!error) {
      toast({
        title: "Caja actualizada",
        description: `"${editData.nombre}" se ha editado exitosamente`,
      })
      setIsEditDialogOpen(false)
      setCajaSeleccionada(null)
      loadCajas()
    } else {
      toast({
        title: "Error",
        description: "No se pudo actualizar la caja de ahorro",
        variant: "destructive",
      })
    }
  }

  const getIconComponent = (iconName: string) => {
    const iconObj = iconosDisponibles.find((i) => i.value === iconName)
    return iconObj ? iconObj.icon : PiggyBank
  }

  const getColorClass = (colorName: string) => {
    const colorObj = coloresDisponibles.find((c) => c.value === colorName)
    return colorObj ? colorObj.class : "bg-blue-500"
  }

  const totalAhorrado = cajas.reduce((sum, caja) => sum + caja.monto_actual, 0)
  const totalMetas = cajas.reduce((sum, caja) => sum + caja.meta_monto, 0)
  const porcentajeTotal = totalMetas > 0 ? (totalAhorrado / totalMetas) * 100 : 0

  if (isLoading) {
    return (
      <Card className="glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">Cargando cajas de ahorro...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="glass-effect border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Resumen de Ahorros</CardTitle>
              <CardDescription>Distribución de tu dinero en diferentes objetivos</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nueva Caja
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-effect max-w-md">
                <DialogHeader>
                  <DialogTitle>Crear Caja de Ahorro</DialogTitle>
                  <DialogDescription>Define un nuevo objetivo de ahorro</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre de la Caja</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Vacaciones, Casa, Emergencias"
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipo de Cuenta</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {tiposCuenta.map((tipo) => {
                        const TipoIcon = tipo.icon
                        const isSelected = formData.tipo_cuenta === tipo.value
                        return (
                          <button
                            key={tipo.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo_cuenta: tipo.value })}
                            className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 text-xs ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border/50 hover:border-border"
                            }`}
                          >
                            <TipoIcon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>{tipo.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {formData.tipo_cuenta === "cuenta_bancaria" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="banco">Banco</Label>
                        <Input
                          id="banco"
                          value={formData.banco}
                          onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                          placeholder="Ej: Banco Continental"
                        />
                      </div>
                      <div>
                        <Label htmlFor="numero_cuenta">Nro. Cuenta (opcional)</Label>
                        <Input
                          id="numero_cuenta"
                          value={formData.numero_cuenta}
                          onChange={(e) => setFormData({ ...formData, numero_cuenta: e.target.value })}
                          placeholder="Ej: ****1234"
                        />
                      </div>
                    </div>
                  )}

                  {formData.tipo_cuenta === "billetera_digital" && (
                    <div>
                      <Label htmlFor="banco">Nombre de Billetera</Label>
                      <Input
                        id="banco"
                        value={formData.banco}
                        onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                        placeholder="Ej: Tigo Money, Personal Pay"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Moneda</Label>
                    <Select
                      value={formData.moneda}
                      onValueChange={(value) => setFormData({ ...formData, moneda: value })}
                    >
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
                    <Label htmlFor="descripcion">Descripcion (opcional)</Label>
                    <Textarea
                      id="descripcion"
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
                    <div>
                      <Label htmlFor="meta_monto">Meta de Ahorro (opcional)</Label>
                      <Input
                        id="meta_monto"
                        type="text"
                        inputMode="numeric"
                        value={formatMiles(formData.meta_monto)}
                        onChange={(e) => setFormData({ ...formData, meta_monto: parseMiles(e.target.value) })}
                        placeholder="Ej: 5.000.000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="icono">Icono</Label>
                        <Select
                          value={formData.icono}
                          onValueChange={(value) => setFormData({ ...formData, icono: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {iconosDisponibles.map((icono) => {
                              const Icon = icono.icon
                              return (
                                <SelectItem key={icono.value} value={icono.value}>
                                  <div className="flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    {icono.label}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="color">Color</Label>
                        <Select
                          value={formData.color}
                          onValueChange={(value) => setFormData({ ...formData, color: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {coloresDisponibles.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded ${color.class}`} />
                                  {color.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="prioridad">Prioridad</Label>
                      <Select
                        value={formData.prioridad}
                        onValueChange={(value) => setFormData({ ...formData, prioridad: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Alta</SelectItem>
                          <SelectItem value="2">Media</SelectItem>
                          <SelectItem value="3">Baja</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">Crear Caja</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
              <PiggyBank className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm text-green-700 font-medium mb-1">Monto Ahorrado</p>
              <p className="text-2xl font-bold text-green-700">{formatGuaranies(totalAhorrado)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <Target className="w-8 h-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm text-blue-700 font-medium mb-1">Meta Total</p>
              <p className="text-2xl font-bold text-blue-700">{formatGuaranies(totalMetas)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm text-purple-700 font-medium mb-1">Logro Alcanzado</p>
              <p className="text-2xl font-bold text-purple-700">{porcentajeTotal.toFixed(1)}%</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progreso hacia tus metas</span>
              <span className="font-medium">{formatGuaranies(totalAhorrado)} / {formatGuaranies(totalMetas)}</span>
            </div>
            <Progress value={Math.min(100, porcentajeTotal)} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {cajas.length === 0 ? (
        <Card className="glass-effect border-border/50">
          <CardContent className="py-12 text-center">
            <PiggyBank className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No tienes cajas de ahorro</h3>
            <p className="text-muted-foreground mb-4">Crea tu primera caja para empezar a organizar tus ahorros</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Caja
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cajas.map((caja) => {
            const Icon = getIconComponent(caja.icono)
            const colorClass = getColorClass(caja.color)
            const porcentaje = caja.meta_monto > 0 ? (caja.monto_actual / caja.meta_monto) * 100 : 0
            const prioridadLabel = caja.prioridad === 1 ? "Alta" : caja.prioridad === 2 ? "Media" : "Baja"
            const prioridadColor =
              caja.prioridad === 1 ? "bg-red-500" : caja.prioridad === 2 ? "bg-yellow-500" : "bg-green-500"

            return (
              <Card key={caja.id} className="glass-effect border-border/50 hover:glow-effect transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{caja.nombre}</CardTitle>
                        <Badge className={`${prioridadColor} text-white mt-1`}>{prioridadLabel}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(caja)}
                        className="text-muted-foreground hover:text-blue-500 h-8 w-8"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCajaAEliminar(caja)
                          setIsDeleteConfirmOpen(true)
                        }}
                        className="text-destructive hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {caja.descripcion && <CardDescription className="mt-2">{caja.descripcion}</CardDescription>}
                  {/* Info de cuenta */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {caja.tipo_cuenta && (
                      <Badge variant="outline" className="text-[10px] gap-1 py-0.5">
                        {caja.tipo_cuenta === "cuenta_bancaria" && <Landmark className="w-3 h-3" />}
                        {caja.tipo_cuenta === "billetera_digital" && <Smartphone className="w-3 h-3" />}
                        {caja.tipo_cuenta === "ahorro_personal" && <Wallet className="w-3 h-3" />}
                        {caja.tipo_cuenta === "otro" && <PiggyBank className="w-3 h-3" />}
                        {tiposCuenta.find((t) => t.value === caja.tipo_cuenta)?.label || caja.tipo_cuenta}
                      </Badge>
                    )}
                    {caja.banco && (
                      <Badge variant="secondary" className="text-[10px] py-0.5">
                        {caja.banco}
                      </Badge>
                    )}
                    {caja.moneda && caja.moneda !== "PYG" && (
                      <Badge variant="secondary" className="text-[10px] py-0.5">
                        {caja.moneda}
                      </Badge>
                    )}
                    {caja.numero_cuenta && (
                      <span className="text-[10px] text-muted-foreground">{caja.numero_cuenta}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Monto Ahorrado destacado */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">Monto Ahorrado</p>
                    <p className="text-2xl font-bold text-green-700">{formatGuaranies(caja.monto_actual)}</p>
                  </div>

                  {/* Barra de progreso con porcentaje */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progreso hacia la meta</span>
                      <span className={`font-bold ${porcentaje >= 100 ? 'text-green-600' : porcentaje >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {porcentaje.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(100, porcentaje)} className="h-3" />
                  </div>

                  {/* Meta */}
                  <div className="flex justify-between items-center pt-2 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground">Meta</p>
                      <p className="text-lg font-semibold">{formatGuaranies(caja.meta_monto)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Falta</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {formatGuaranies(Math.max(0, caja.meta_monto - caja.monto_actual))}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        setCajaSeleccionada(caja)
                        setMovimientoData({ ...movimientoData, tipo: "deposito" })
                        setIsMovimientoDialogOpen(true)
                      }}
                    >
                      <ArrowUpCircle className="w-4 h-4 mr-1" />
                      Depositar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        setCajaSeleccionada(caja)
                        setMovimientoData({ ...movimientoData, tipo: "retiro" })
                        setIsMovimientoDialogOpen(true)
                      }}
                    >
                      <ArrowDownCircle className="w-4 h-4 mr-1" />
                      Retirar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialog de Movimiento */}
      <Dialog open={isMovimientoDialogOpen} onOpenChange={setIsMovimientoDialogOpen}>
        <DialogContent className="glass-effect max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {movimientoData.tipo === "deposito" ? "Depositar en" : "Retirar de"} {cajaSeleccionada?.nombre}
            </DialogTitle>
            <DialogDescription>
              {movimientoData.tipo === "deposito"
                ? "Agrega dinero a esta caja de ahorro"
                : "Retira dinero de esta caja de ahorro"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMovimiento} className="space-y-3">
            <div>
                  <Label htmlFor="monto">Monto</Label>
                  <Input
                    id="monto"
                    type="text"
                    inputMode="numeric"
                    value={formatMiles(movimientoData.monto)}
                    onChange={(e) => setMovimientoData({ ...movimientoData, monto: parseMiles(e.target.value) })}
                    placeholder="Ej: 500.000"
                    required
                  />
            </div>

            <div>
              <Label htmlFor="descripcion_movimiento">Descripcion (opcional)</Label>
              <Textarea
                id="descripcion_movimiento"
                value={movimientoData.descripcion}
                onChange={(e) => setMovimientoData({ ...movimientoData, descripcion: e.target.value })}
                placeholder="Ej: Ahorro mensual, Regalo, etc."
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsMovimientoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{movimientoData.tipo === "deposito" ? "Depositar" : "Retirar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edicion */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="glass-effect max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" />
              Editar Caja de Ahorro
            </DialogTitle>
            <DialogDescription>Modifica los datos de tu caja. El monto ahorrado no se altera.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_nombre">Nombre de la Caja</Label>
              <Input
                id="edit_nombre"
                value={editData.nombre}
                onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                placeholder="Ej: Vacaciones, Casa, Emergencias"
                required
              />
            </div>

            <div>
              <Label>Tipo de Cuenta</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {tiposCuenta.map((tipo) => {
                  const TipoIcon = tipo.icon
                  const isSelected = editData.tipo_cuenta === tipo.value
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => setEditData({ ...editData, tipo_cuenta: tipo.value })}
                      className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 text-xs ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <TipoIcon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`font-medium ${isSelected ? "text-primary" : ""}`}>{tipo.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {editData.tipo_cuenta === "cuenta_bancaria" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit_banco">Banco</Label>
                  <Input
                    id="edit_banco"
                    value={editData.banco}
                    onChange={(e) => setEditData({ ...editData, banco: e.target.value })}
                    placeholder="Ej: Banco Continental"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_numero_cuenta">Nro. Cuenta (opcional)</Label>
                  <Input
                    id="edit_numero_cuenta"
                    value={editData.numero_cuenta}
                    onChange={(e) => setEditData({ ...editData, numero_cuenta: e.target.value })}
                    placeholder="Ej: ****1234"
                  />
                </div>
              </div>
            )}

            {editData.tipo_cuenta === "billetera_digital" && (
              <div>
                <Label htmlFor="edit_billetera">Nombre de Billetera</Label>
                <Input
                  id="edit_billetera"
                  value={editData.banco}
                  onChange={(e) => setEditData({ ...editData, banco: e.target.value })}
                  placeholder="Ej: Tigo Money, Personal Pay"
                />
              </div>
            )}

            <div>
              <Label>Moneda</Label>
              <Select
                value={editData.moneda}
                onValueChange={(value) => setEditData({ ...editData, moneda: value })}
              >
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
              <Label htmlFor="edit_descripcion">Descripcion (opcional)</Label>
              <Textarea
                id="edit_descripcion"
                value={editData.descripcion}
                onChange={(e) => setEditData({ ...editData, descripcion: e.target.value })}
                placeholder="Describe tu objetivo de ahorro"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit_meta_monto">Meta de Ahorro (opcional)</Label>
              <Input
                id="edit_meta_monto"
                type="text"
                inputMode="numeric"
                value={formatMiles(editData.meta_monto)}
                onChange={(e) => setEditData({ ...editData, meta_monto: parseMiles(e.target.value) })}
                placeholder="Ej: 5.000.000"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_icono">Icono</Label>
                <Select
                  value={editData.icono}
                  onValueChange={(value) => setEditData({ ...editData, icono: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconosDisponibles.map((icono) => {
                      const Icon = icono.icon
                      return (
                        <SelectItem key={icono.value} value={icono.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {icono.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_color">Color</Label>
                <Select
                  value={editData.color}
                  onValueChange={(value) => setEditData({ ...editData, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coloresDisponibles.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit_prioridad">Prioridad</Label>
              <Select
                value={editData.prioridad}
                onValueChange={(value) => setEditData({ ...editData, prioridad: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Alta</SelectItem>
                  <SelectItem value="2">Media</SelectItem>
                  <SelectItem value="3">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmacion de Eliminacion */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="glass-effect max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Caja de Ahorro
            </DialogTitle>
            <DialogDescription>
              {"Esta accion no se puede deshacer. Se eliminara la caja "}
              <span className="font-semibold text-foreground">{cajaAEliminar?.nombre}</span>
              {" y todos sus movimientos asociados."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => {
              setIsDeleteConfirmOpen(false)
              setCajaAEliminar(null)
            }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => cajaAEliminar && handleDelete(cajaAEliminar.id)}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
