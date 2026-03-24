"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  ShoppingCart, 
  User,
  Trash2,
  Edit2,
  DollarSign,
  CreditCard,
  Calendar,
  Eye
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Cliente {
  id: string
  nombre: string
  apellido: string | null
}

interface Venta {
  id: string
  user_id: string
  perfil_id: string
  cliente_id: string
  descripcion: string
  tipo_pago: "contado" | "cuotas"
  monto_total: number
  monto_inicial: number | null
  num_cuotas: number | null
  monto_cuota: number | null
  fecha_venta: string
  fecha_inicio_cuotas: string | null
  estado: "pendiente" | "en_curso" | "completada" | "cancelada"
  notas: string | null
  created_at: string
  clientes?: Cliente
}

interface PagoCuota {
  id: string
  venta_id: string
  numero_cuota: number
  monto_pagado: number | null
  fecha_vencimiento: string
  fecha_pago: string | null
  estado: "pendiente" | "pagada" | "vencida"
}

const TIPOS_PAGO = [
  { value: "contado", label: "Contado" },
  { value: "cuotas", label: "Cuotas" },
]

const ESTADOS_VENTA = [
  { value: "pendiente", label: "Pendiente", color: "bg-yellow-500" },
  { value: "en_curso", label: "En curso", color: "bg-blue-500" },
  { value: "completada", label: "Completada", color: "bg-green-500" },
  { value: "cancelada", label: "Cancelada", color: "bg-red-500" },
]

export function VentasManager({ perfilId }: { perfilId: string }) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVenta, setEditingVenta] = useState<Venta | null>(null)
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null)
  const [pagos, setPagos] = useState<PagoCuota[]>([])
  const [isPagosDialogOpen, setIsPagosDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    cliente_id: "",
    descripcion: "",
    tipo_pago: "contado" as "contado" | "cuotas",
    monto_total: "",
    monto_inicial: "",
    num_cuotas: "",
    monto_cuota: "",
    fecha_venta: format(new Date(), "yyyy-MM-dd"),
    fecha_inicio_cuotas: "",
    notas: "",
  })

  useEffect(() => {
    fetchData()
  }, [perfilId])

  const fetchData = async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: clientesData } = await supabase
      .from("clientes")
      .select("id, nombre, apellido")
      .eq("user_id", user.id)
      .order("nombre")

    setClientes(clientesData || [])

    const { data: ventasData, error } = await supabase
      .from("crm_ventas")
      .select(`
        *,
        clientes:cliente_id (id, nombre, apellido)
      `)
      .eq("perfil_id", perfilId)
      .order("fecha_venta", { ascending: false })

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas",
        variant: "destructive",
      })
    } else {
      setVentas(ventasData || [])
    }
    setIsLoading(false)
  }

  const resetForm = () => {
    setFormData({
      cliente_id: "",
      descripcion: "",
      tipo_pago: "contado",
      monto_total: "",
      monto_inicial: "",
      num_cuotas: "",
      monto_cuota: "",
      fecha_venta: format(new Date(), "yyyy-MM-dd"),
      fecha_inicio_cuotas: "",
      notas: "",
    })
    setEditingVenta(null)
  }

  const calcularMontoCuota = () => {
    const total = parseFloat(formData.monto_total) || 0
    const inicial = parseFloat(formData.monto_inicial) || 0
    const numCuotas = parseInt(formData.num_cuotas) || 1
    const restante = total - inicial
    return restante > 0 ? (restante / numCuotas).toFixed(2) : "0"
  }

  const handleOpenDialog = (venta?: Venta) => {
    if (venta) {
      setEditingVenta(venta)
      setFormData({
        cliente_id: venta.cliente_id,
        descripcion: venta.descripcion,
        tipo_pago: venta.tipo_pago,
        monto_total: venta.monto_total.toString(),
        monto_inicial: venta.monto_inicial?.toString() || "",
        num_cuotas: venta.num_cuotas?.toString() || "",
        monto_cuota: venta.monto_cuota?.toString() || "",
        fecha_venta: venta.fecha_venta,
        fecha_inicio_cuotas: venta.fecha_inicio_cuotas || "",
        notas: venta.notas || "",
      })
    } else {
      resetForm()
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ventaData = {
      user_id: user.id,
      perfil_id: perfilId,
      cliente_id: formData.cliente_id,
      descripcion: formData.descripcion,
      tipo_pago: formData.tipo_pago,
      monto_total: parseFloat(formData.monto_total),
      monto_inicial: formData.tipo_pago === "cuotas" ? parseFloat(formData.monto_inicial) || 0 : null,
      num_cuotas: formData.tipo_pago === "cuotas" ? parseInt(formData.num_cuotas) : null,
      monto_cuota: formData.tipo_pago === "cuotas" ? parseFloat(formData.monto_cuota || calcularMontoCuota()) : null,
      fecha_venta: formData.fecha_venta,
      fecha_inicio_cuotas: formData.tipo_pago === "cuotas" ? formData.fecha_inicio_cuotas : null,
      estado: formData.tipo_pago === "contado" ? "completada" : "en_curso",
      notas: formData.notas || null,
    }

    if (editingVenta) {
      const { error } = await supabase
        .from("crm_ventas")
        .update({ ...ventaData, updated_at: new Date().toISOString() })
        .eq("id", editingVenta.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la venta",
          variant: "destructive",
        })
      } else {
        toast({ title: "Venta actualizada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    } else {
      const { data: nuevaVenta, error } = await supabase
        .from("crm_ventas")
        .insert([ventaData])
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo crear la venta",
          variant: "destructive",
        })
      } else {
        // Si es a cuotas, crear los registros de pagos
        if (formData.tipo_pago === "cuotas" && nuevaVenta) {
          const numCuotas = parseInt(formData.num_cuotas)
          const montoCuota = parseFloat(formData.monto_cuota || calcularMontoCuota())
          const fechaInicio = new Date(formData.fecha_inicio_cuotas)

          const pagosData = Array.from({ length: numCuotas }, (_, i) => {
            const fechaVenc = new Date(fechaInicio)
            fechaVenc.setMonth(fechaVenc.getMonth() + i)
            return {
              user_id: user.id,
              venta_id: nuevaVenta.id,
              numero_cuota: i + 1,
              monto_pagado: null,
              fecha_vencimiento: format(fechaVenc, "yyyy-MM-dd"),
              fecha_pago: null,
              estado: "pendiente",
            }
          })

          await supabase.from("crm_pagos_cuotas").insert(pagosData)
        }

        toast({ title: "Venta registrada" })
        fetchData()
        setIsDialogOpen(false)
        resetForm()
      }
    }
  }

  const handleVerPagos = async (venta: Venta) => {
    setSelectedVenta(venta)
    const { data } = await supabase
      .from("crm_pagos_cuotas")
      .select("*")
      .eq("venta_id", venta.id)
      .order("numero_cuota")

    setPagos(data || [])
    setIsPagosDialogOpen(true)
  }

  const handleRegistrarPago = async (pagoId: string) => {
    const { error } = await supabase
      .from("crm_pagos_cuotas")
      .update({
        estado: "pagada",
        fecha_pago: format(new Date(), "yyyy-MM-dd"),
        monto_pagado: selectedVenta?.monto_cuota,
      })
      .eq("id", pagoId)

    if (!error) {
      handleVerPagos(selectedVenta!)
      
      // Verificar si todas las cuotas estan pagadas
      const { data: pagosRestantes } = await supabase
        .from("crm_pagos_cuotas")
        .select("id")
        .eq("venta_id", selectedVenta!.id)
        .eq("estado", "pendiente")

      if (pagosRestantes?.length === 0) {
        await supabase
          .from("crm_ventas")
          .update({ estado: "completada" })
          .eq("id", selectedVenta!.id)
        fetchData()
      }

      toast({ title: "Pago registrado" })
    }
  }

  const handleDelete = async (id: string) => {
    // Primero eliminar los pagos asociados
    await supabase.from("crm_pagos_cuotas").delete().eq("venta_id", id)
    
    const { error } = await supabase
      .from("crm_ventas")
      .delete()
      .eq("id", id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la venta",
        variant: "destructive",
      })
    } else {
      toast({ title: "Venta eliminada" })
      fetchData()
    }
  }

  const totalVentas = ventas.reduce((acc, v) => acc + v.monto_total, 0)
  const ventasCompletadas = ventas.filter((v) => v.estado === "completada")
  const totalCompletado = ventasCompletadas.reduce((acc, v) => acc + v.monto_total, 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Estadisticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Ventas</CardDescription>
            <CardTitle className="text-2xl">{ventas.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monto Total</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ${totalVentas.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {ventasCompletadas.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cobrado</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              ${totalCompletado.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Ventas
              </CardTitle>
              <CardDescription>
                Registra y gestiona tus ventas con sistema de cuotas flexible
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Venta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editingVenta ? "Editar Venta" : "Nueva Venta"}
                  </DialogTitle>
                  <DialogDescription>
                    Registra una venta con pago al contado o en cuotas
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente *</Label>
                    <Select
                      value={formData.cliente_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, cliente_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nombre} {c.apellido}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descripcion">Descripcion del producto/servicio *</Label>
                    <Input
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) =>
                        setFormData({ ...formData, descripcion: e.target.value })
                      }
                      placeholder="Ej: Kit de productos, Plan de negocio..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo_pago">Tipo de pago</Label>
                      <Select
                        value={formData.tipo_pago}
                        onValueChange={(value) =>
                          setFormData({ ...formData, tipo_pago: value as "contado" | "cuotas" })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIPOS_PAGO.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monto_total">Monto Total *</Label>
                      <Input
                        id="monto_total"
                        type="number"
                        step="0.01"
                        value={formData.monto_total}
                        onChange={(e) =>
                          setFormData({ ...formData, monto_total: e.target.value })
                        }
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  {formData.tipo_pago === "cuotas" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monto_inicial">Monto Inicial (Entrega)</Label>
                          <Input
                            id="monto_inicial"
                            type="number"
                            step="0.01"
                            value={formData.monto_inicial}
                            onChange={(e) =>
                              setFormData({ ...formData, monto_inicial: e.target.value })
                            }
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="num_cuotas">Numero de Cuotas</Label>
                          <Input
                            id="num_cuotas"
                            type="number"
                            min="1"
                            value={formData.num_cuotas}
                            onChange={(e) =>
                              setFormData({ ...formData, num_cuotas: e.target.value })
                            }
                            placeholder="Ej: 3"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="monto_cuota">Monto por Cuota</Label>
                          <Input
                            id="monto_cuota"
                            type="number"
                            step="0.01"
                            value={formData.monto_cuota || calcularMontoCuota()}
                            onChange={(e) =>
                              setFormData({ ...formData, monto_cuota: e.target.value })
                            }
                            placeholder="Calculado automaticamente"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="fecha_inicio_cuotas">Inicio de Cuotas</Label>
                          <Input
                            id="fecha_inicio_cuotas"
                            type="date"
                            value={formData.fecha_inicio_cuotas}
                            onChange={(e) =>
                              setFormData({ ...formData, fecha_inicio_cuotas: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      {formData.monto_total && formData.num_cuotas && (
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          <p className="font-medium mb-1">Resumen del Plan:</p>
                          <p>Entrega: ${parseFloat(formData.monto_inicial || "0").toLocaleString()}</p>
                          <p>{formData.num_cuotas} cuotas de ${calcularMontoCuota()}</p>
                        </div>
                      )}
                    </>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="fecha_venta">Fecha de Venta</Label>
                    <Input
                      id="fecha_venta"
                      type="date"
                      value={formData.fecha_venta}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha_venta: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) =>
                        setFormData({ ...formData, notas: e.target.value })
                      }
                      placeholder="Notas adicionales..."
                      rows={2}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        resetForm()
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingVenta ? "Guardar" : "Registrar Venta"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ventas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay ventas registradas</p>
              <p className="text-sm">Registra tu primera venta</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descripcion</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta) => {
                    const estadoInfo = ESTADOS_VENTA.find((e) => e.value === venta.estado)
                    return (
                      <TableRow key={venta.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {venta.clientes?.nombre} {venta.clientes?.apellido}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {venta.descripcion}
                        </TableCell>
                        <TableCell>
                          {format(new Date(venta.fecha_venta), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {venta.tipo_pago === "cuotas" ? (
                              <span className="flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                {venta.num_cuotas} cuotas
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                Contado
                              </span>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${venta.monto_total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${estadoInfo?.color} text-white`}>
                            {estadoInfo?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {venta.tipo_pago === "cuotas" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleVerPagos(venta)}
                                title="Ver pagos"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDialog(venta)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(venta.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Pagos de Cuotas */}
      <Dialog open={isPagosDialogOpen} onOpenChange={setIsPagosDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Control de Pagos</DialogTitle>
            <DialogDescription>
              {selectedVenta?.descripcion} - ${selectedVenta?.monto_total.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedVenta?.monto_inicial && selectedVenta.monto_inicial > 0 && (
              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Entrega inicial: ${selectedVenta.monto_inicial.toLocaleString()}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {pagos.map((pago) => (
                <div
                  key={pago.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    pago.estado === "pagada" 
                      ? "bg-green-50 dark:bg-green-950 border-green-200" 
                      : "bg-muted"
                  }`}
                >
                  <div>
                    <p className="font-medium">Cuota {pago.numero_cuota}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence: {format(new Date(pago.fecha_vencimiento), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      ${(pago.monto_pagado || selectedVenta?.monto_cuota || 0).toLocaleString()}
                    </span>
                    {pago.estado === "pagada" ? (
                      <Badge className="bg-green-500 text-white">Pagada</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRegistrarPago(pago.id)}
                      >
                        Registrar Pago
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
