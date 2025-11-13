"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Calendar, Trash2, AlertCircle, Download, Edit, X, Check } from "lucide-react"
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
  tipos_categoria_egreso?: {
    nombre: string
    color: string
  }
  categorias_egreso?: {
    nombre: string
  }
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
    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return

    const supabase = createClient()
    const table = deleteType === "ingreso" ? "ingresos" : "egresos"

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

      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Button onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar a CSV
          </Button>
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="glass-effect">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
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
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center`}
                                    style={{
                                      backgroundColor: isIngreso
                                        ? "rgba(34, 197, 94, 0.2)"
                                        : `${egreso?.tipos_categoria_egreso?.color || "#ef4444"}20`,
                                    }}
                                  >
                                    {isIngreso ? (
                                      <TrendingUp className="w-6 h-6 text-green-600" />
                                    ) : (
                                      <TrendingDown
                                        className="w-6 h-6"
                                        style={{ color: egreso?.tipos_categoria_egreso?.color || "#ef4444" }}
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <h3 className="font-semibold">
                                        {isIngreso
                                          ? (item as Ingreso).tipo_ingreso
                                          : egreso?.tipos_categoria_egreso?.nombre || "Sin categoría"}
                                      </h3>
                                      <Badge
                                        variant={isIngreso ? "default" : "destructive"}
                                        style={
                                          !isIngreso
                                            ? { backgroundColor: egreso?.tipos_categoria_egreso?.color || "#ef4444" }
                                            : undefined
                                        }
                                      >
                                        {isIngreso ? "Ingreso" : "Egreso"}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDateWithoutTimezone(item.fecha)}
                                      </span>
                                      {!isIngreso && egreso?.categorias_egreso?.nombre && (
                                        <span className="text-xs">{egreso.categorias_egreso.nombre}</span>
                                      )}
                                    </div>
                                    {!isIngreso && egreso?.concepto && (
                                      <p className="text-sm text-muted-foreground mt-1">{egreso.concepto}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p
                                      className={`text-2xl font-bold`}
                                      style={{
                                        color: isIngreso
                                          ? "#22c55e"
                                          : egreso?.tipos_categoria_egreso?.color || "#ef4444",
                                      }}
                                    >
                                      {isIngreso ? "+" : "-"}₲{Number(item.monto).toLocaleString("es-PY")}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(item, isIngreso ? "ingreso" : "egreso")}
                                    className="text-primary hover:text-primary hover:bg-primary/10"
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
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
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
