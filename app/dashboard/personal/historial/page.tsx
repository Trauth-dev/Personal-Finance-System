"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Calendar, Trash2, AlertCircle, Download, Edit, X, Check, Building2, CreditCard, Wallet } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { formatDateWithoutTimezone } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type Ingreso = {
  id: string
  tipo_ingreso: string
  monto: number
  fecha: string
  created_at: string
}

type Egreso = {
  id: string
  monto: number
  fecha: string
  concepto: string | null
  created_at: string
  tipo_categoria_id: string | null
  categoria_id: string | null
  origen_tipo: string | null
  origen_id: string | null
  tipos_categoria_egreso?: {
    nombre: string
    color: string
  }
  categorias_egreso?: {
    nombre: string
  }
}

type OrigenInfo = {
  [egresoId: string]: { nombre: string; tipo: string }
}

export default function PersonalHistorialPage() {
  const { perfilActual } = usePerfil()
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<"ingreso" | "egreso" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editType, setEditType] = useState<"ingreso" | "egreso" | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [origenesInfo, setOrigenesInfo] = useState<OrigenInfo>({})

  useEffect(() => {
    if (perfilActual?.id) {
      loadData()
    }
  }, [perfilActual])

  const loadData = async () => {
    if (!perfilActual?.id) return

    const supabase = createClient()
    setIsLoading(true)

    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("*")
      .eq("perfil_id", perfilActual.id)
      .order("fecha", { ascending: false })

    const { data: egresosData } = await supabase
      .from("egresos")
      .select(`
        *,
        tipos_categoria_egreso (nombre, color),
        categorias_egreso (nombre)
      `)
      .eq("perfil_id", perfilActual.id)
      .order("fecha", { ascending: false })

    setIngresos(ingresosData || [])
    setEgresos(egresosData || [])

    // Cargar nombres de origenes de fondos
    if (egresosData) {
      const origenes: OrigenInfo = {}
      const cajasIds = [...new Set(egresosData.filter((e) => e.origen_tipo === "caja_ahorro" && e.origen_id).map((e) => e.origen_id))]
      const tarjetasIds = [...new Set(egresosData.filter((e) => e.origen_tipo === "tarjeta_credito" && e.origen_id).map((e) => e.origen_id))]

      // Crear mapas de nombres
      const cajasMap: Record<string, string> = {}
      const tarjetasMap: Record<string, string> = {}

      if (cajasIds.length > 0) {
        const { data: cajasData } = await supabase
          .from("cajas_ahorro")
          .select("id, nombre")
          .in("id", cajasIds)
        if (cajasData) cajasData.forEach((c) => { cajasMap[c.id] = c.nombre })
      }

      if (tarjetasIds.length > 0) {
        const { data: tarjetasData } = await supabase
          .from("deudas")
          .select("id, nombre")
          .in("id", tarjetasIds)
        if (tarjetasData) tarjetasData.forEach((t) => { tarjetasMap[t.id] = t.nombre })
      }

      // Mapear cada egreso con su origen
      egresosData.forEach((e) => {
        if (e.origen_tipo === "caja_ahorro" && e.origen_id && cajasMap[e.origen_id]) {
          origenes[e.id] = { nombre: cajasMap[e.origen_id], tipo: "caja_ahorro" }
        } else if (e.origen_tipo === "tarjeta_credito" && e.origen_id && tarjetasMap[e.origen_id]) {
          origenes[e.id] = { nombre: tarjetasMap[e.origen_id], tipo: "tarjeta_credito" }
        }
      })

      setOrigenesInfo(origenes)
    }

    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return

    const supabase = createClient()
    const table = deleteType === "ingreso" ? "ingresos" : "egresos"

    // Si es un egreso con origen, revertir el descuento
    if (deleteType === "egreso") {
      const egresoToDelete = egresos.find((e) => e.id === deleteId)
      if (egresoToDelete?.origen_tipo && egresoToDelete?.origen_id) {
        const montoRevertir = Number(egresoToDelete.monto)

        if (egresoToDelete.origen_tipo === "caja_ahorro") {
          // Devolver dinero a la caja de ahorro
          const { data: cajaData } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual")
            .eq("id", egresoToDelete.origen_id)
            .single()

          if (cajaData) {
            await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: Number(cajaData.monto_actual) + montoRevertir })
              .eq("id", egresoToDelete.origen_id)

            // Registrar movimiento de deposito (reversion)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase.from("movimientos_caja").insert({
                caja_id: egresoToDelete.origen_id,
                perfil_id: perfilActual?.id,
                user_id: user.id,
                tipo: "deposito",
                monto: montoRevertir,
                descripcion: `Reversion por eliminacion de egreso`,
                fecha: new Date().toISOString().split("T")[0],
              })
            }
          }
        } else if (egresoToDelete.origen_tipo === "tarjeta_credito") {
          // Devolver credito disponible a la tarjeta
          const { data: tarjetaData } = await supabase
            .from("deudas")
            .select("monto_total")
            .eq("id", egresoToDelete.origen_id)
            .single()

          if (tarjetaData) {
            await supabase
              .from("deudas")
              .update({ monto_total: Number(tarjetaData.monto_total) + montoRevertir })
              .eq("id", egresoToDelete.origen_id)
          }
        }
      }
    }

    const { error } = await supabase.from(table).delete().eq("id", deleteId)

    if (!error) {
      loadData()
    }

    setDeleteId(null)
    setDeleteType(null)
  }

  const handleEdit = (item: Ingreso | Egreso, type: "ingreso" | "egreso") => {
    setEditId(item.id)
    setEditType(type)
    setEditData({ ...item })
  }

  const handleSaveEdit = async () => {
    if (!editId || !editType || !editData) return

    const supabase = createClient()
    const table = editType === "ingreso" ? "ingresos" : "egresos"

    let updateData: any
    if (editType === "ingreso") {
      updateData = {
        tipo_ingreso: editData.tipo_ingreso,
        monto: editData.monto,
        fecha: editData.fecha,
      }
    } else {
      updateData = {
        monto: editData.monto,
        fecha: editData.fecha,
        concepto: editData.concepto,
      }
    }

    const { error } = await supabase.from(table).update(updateData).eq("id", editId)

    if (!error) {
      loadData()
      setEditId(null)
      setEditType(null)
      setEditData(null)
    } else {
      console.error("[v0] Error al guardar edición:", error)
      alert("Error al guardar los cambios. Por favor intenta nuevamente.")
    }
  }

  const handleExportCSV = () => {
    const allTransactions = [
      ...ingresos.map((i) => ({
        tipo: "Ingreso",
        categoria: i.tipo_ingreso,
        monto: i.monto,
        fecha: i.fecha,
        concepto: "",
      })),
      ...egresos.map((e) => ({
        tipo: "Egreso",
        categoria: e.tipos_categoria_egreso?.nombre || "Sin categoría",
        subcategoria: e.categorias_egreso?.nombre || "",
        monto: e.monto,
        fecha: e.fecha,
        concepto: e.concepto || "",
      })),
    ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())

    const headers = ["Tipo", "Categoría", "Subcategoría", "Monto", "Fecha", "Concepto"]
    const csvContent = [
      headers.join(","),
      ...allTransactions.map((t) =>
        [t.tipo, t.categoria, "subcategoria" in t ? t.subcategoria : "", t.monto, t.fecha, t.concepto].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `historial_personal_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!perfilActual) {
    return (
      <div>
        <DashboardHeader title="Historial Personal" description="Registro de movimientos personales" />
        <div className="p-6">
          <Card className="glass-effect border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">Cargando perfil personal...</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DashboardHeader title="Historial Personal" description="Registro completo de tus movimientos personales" />

      <div className="p-4 md:p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleExportCSV} className="gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar a CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="glass-effect w-full grid grid-cols-3">
            <TabsTrigger value="todos" className="text-xs sm:text-sm">Todos</TabsTrigger>
            <TabsTrigger value="ingresos" className="text-xs sm:text-sm">Ingresos</TabsTrigger>
            <TabsTrigger value="egresos" className="text-xs sm:text-sm">Egresos</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="todos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : (
                  <>
                    {[...ingresos, ...egresos]
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((item) => {
                        const isIngreso = "tipo_ingreso" in item
                        const egreso = !isIngreso ? (item as Egreso) : null
                        return (
                          <Card
                            key={item.id}
                            className="glass-effect border-border/50 hover:glow-effect transition-all"
                          >
                            <CardContent className="p-3 sm:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: isIngreso
                                        ? "rgba(34, 197, 94, 0.2)"
                                        : `${egreso?.tipos_categoria_egreso?.color || "#ef4444"}20`,
                                    }}
                                  >
                                    {isIngreso ? (
                                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                                    ) : (
                                      <TrendingDown
                                        className="w-5 h-5 sm:w-6 sm:h-6"
                                        style={{ color: egreso?.tipos_categoria_egreso?.color || "#ef4444" }}
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-sm sm:text-base truncate">
                                        {isIngreso
                                          ? (item as Ingreso).tipo_ingreso
                                          : egreso?.tipos_categoria_egreso?.nombre || "Sin categoría"}
                                      </h3>
                                      <Badge
                                        variant={isIngreso ? "default" : "destructive"}
                                        className="text-xs"
                                        style={
                                          !isIngreso
                                            ? { backgroundColor: egreso?.tipos_categoria_egreso?.color || "#ef4444" }
                                            : undefined
                                        }
                                      >
                                        {isIngreso ? "Ingreso" : "Egreso"}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDateWithoutTimezone(item.fecha)}
                                      </span>
                                      {!isIngreso && egreso?.categorias_egreso?.nombre && (
                                        <span className="text-xs">{egreso.categorias_egreso.nombre}</span>
                                      )}
                                    </div>
                                    {!isIngreso && egreso?.concepto && (
                                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">{egreso.concepto}</p>
                                    )}
                                    {!isIngreso && origenesInfo[item.id] && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className={`p-1 rounded ${origenesInfo[item.id].tipo === "caja_ahorro" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                                          {origenesInfo[item.id].tipo === "caja_ahorro" ? (
                                            <Building2 className="w-3 h-3 text-blue-400" />
                                          ) : (
                                            <CreditCard className="w-3 h-3 text-purple-400" />
                                          )}
                                        </div>
                                        <span className={`text-[11px] font-medium ${origenesInfo[item.id].tipo === "caja_ahorro" ? "text-blue-400" : "text-purple-400"}`}>
                                          {origenesInfo[item.id].nombre}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-13 sm:pl-0">
                                  <div className="text-right">
                                    <p
                                      className="text-lg sm:text-2xl font-bold"
                                      style={{
                                        color: isIngreso
                                          ? "#22c55e"
                                          : egreso?.tipos_categoria_egreso?.color || "#ef4444",
                                      }}
                                    >
                                      {isIngreso ? "+" : "-"}₲{Number(item.monto).toLocaleString("es-PY")}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(item, isIngreso ? "ingreso" : "egreso")}
                                      className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setDeleteId(item.id)
                                        setDeleteType(isIngreso ? "ingreso" : "egreso")
                                      }}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-10 sm:w-10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    {ingresos.length === 0 && egresos.length === 0 && (
                      <Card className="glass-effect border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                          No hay transacciones registradas para este perfil personal
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ingresos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : ingresos.length > 0 ? (
                  ingresos.map((ingreso) => (
                    <Card key={ingreso.id} className="glass-effect border-border/50 hover:glow-effect transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1">{ingreso.tipo_ingreso}</h3>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDateWithoutTimezone(ingreso.fecha)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl font-bold text-primary">
                              +₲{Number(ingreso.monto).toLocaleString("es-PY")}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(ingreso, "ingreso")}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteId(ingreso.id)
                                setDeleteType("ingreso")
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No hay ingresos registrados
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="egresos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : egresos.length > 0 ? (
                  egresos.map((egreso) => (
                    <Card key={egreso.id} className="glass-effect border-border/50 hover:glow-effect transition-all">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-lg flex items-center justify-center"
                              style={{
                                backgroundColor: `${egreso.tipos_categoria_egreso?.color || "#ef4444"}20`,
                              }}
                            >
                              <TrendingDown
                                className="w-6 h-6"
                                style={{ color: egreso.tipos_categoria_egreso?.color || "#ef4444" }}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1">
                                {egreso.tipos_categoria_egreso?.nombre || "Sin categoría"}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDateWithoutTimezone(egreso.fecha)}
                                </span>
                                {egreso.categorias_egreso?.nombre && (
                                  <span className="text-xs">{egreso.categorias_egreso.nombre}</span>
                                )}
                              </div>
                              {egreso.concepto && (
                                <p className="text-sm text-muted-foreground mt-1">{egreso.concepto}</p>
                              )}
                              {origenesInfo[egreso.id] && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div className={`p-1 rounded ${origenesInfo[egreso.id].tipo === "caja_ahorro" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                                    {origenesInfo[egreso.id].tipo === "caja_ahorro" ? (
                                      <Building2 className="w-3 h-3 text-blue-400" />
                                    ) : (
                                      <CreditCard className="w-3 h-3 text-purple-400" />
                                    )}
                                  </div>
                                  <span className={`text-[11px] font-medium ${origenesInfo[egreso.id].tipo === "caja_ahorro" ? "text-blue-400" : "text-purple-400"}`}>
                                    {origenesInfo[egreso.id].nombre}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <p
                              className="text-2xl font-bold"
                              style={{ color: egreso.tipos_categoria_egreso?.color || "#ef4444" }}
                            >
                              -₲{Number(egreso.monto).toLocaleString("es-PY")}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(egreso, "egreso")}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setDeleteId(egreso.id)
                                setDeleteType("egreso")
                              }}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No hay egresos registrados
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>Editar {editType === "ingreso" ? "Ingreso" : "Egreso"}</DialogTitle>
            <DialogDescription>Modifica los datos de la transacción personal</DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              {editType === "ingreso" ? (
                <>
                  <div>
                    <Label>Tipo de Ingreso</Label>
                    <Input
                      value={editData.tipo_ingreso}
                      onChange={(e) => setEditData({ ...editData, tipo_ingreso: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editData.monto}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "")
                        setEditData({ ...editData, monto: value ? Number.parseFloat(value) : 0 })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={editData.fecha}
                      onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editData.monto}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "")
                        setEditData({ ...editData, monto: value ? Number.parseFloat(value) : 0 })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={editData.fecha}
                      onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Concepto (opcional)</Label>
                    <Input
                      value={editData.concepto || ""}
                      onChange={(e) => setEditData({ ...editData, concepto: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-effect">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
