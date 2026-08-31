"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Wallet } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatMoney } from "@/lib/currency"

interface CuentaVenta {
  id: string
  contraparte: string
  total: number
  fecha: string
}

interface CuentaCompra {
  id: string
  contraparte: string
  total: number
  fecha: string
}

interface Grupo {
  nombre: string
  total: number
  cantidad: number
}

export function CuentasManager() {
  const { perfilActual } = usePerfil()
  const [porCobrar, setPorCobrar] = useState<CuentaVenta[]>([])
  const [porPagar, setPorPagar] = useState<CuentaCompra[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (perfilActual?.id) cargarCuentas()
  }, [perfilActual?.id])

  const cargarCuentas = async () => {
    if (!perfilActual?.id) return
    setIsLoading(true)
    const supabase = createClient()

    try {
      const [ventasRes, comprasRes] = await Promise.all([
        supabase
          .from("ventas")
          .select("id, cliente_nombre, total, fecha, producto_nombre")
          .eq("perfil_id", perfilActual.id)
          .eq("estado_pago", "pendiente")
          .order("fecha", { ascending: true }),
        supabase
          .from("compras")
          .select("id, proveedor_nombre, total, fecha, materia_prima_nombre")
          .eq("perfil_id", perfilActual.id)
          .eq("estado_pago", "pendiente")
          .order("fecha", { ascending: true }),
      ])

      setPorCobrar(
        (ventasRes.data || []).map((v: any) => ({
          id: v.id,
          contraparte: v.cliente_nombre || `Venta: ${v.producto_nombre || "sin cliente"}`,
          total: Number(v.total),
          fecha: v.fecha,
        })),
      )
      setPorPagar(
        (comprasRes.data || []).map((c: any) => ({
          id: c.id,
          contraparte: c.proveedor_nombre || `Compra: ${c.materia_prima_nombre || "sin proveedor"}`,
          total: Number(c.total),
          fecha: c.fecha,
        })),
      )
    } catch (error) {
      console.error("[v0] Error al cargar cuentas:", error)
      toast.error("Error al cargar cuentas")
    } finally {
      setIsLoading(false)
    }
  }

  const marcarPagado = async (tabla: "ventas" | "compras", id: string) => {
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from(tabla)
        .update({ estado_pago: "pagado", fecha_pago: format(new Date(), "yyyy-MM-dd") })
        .eq("id", id)
      if (error) throw error
      toast.success(tabla === "ventas" ? "Marcado como cobrado" : "Marcado como pagado")
      cargarCuentas()
    } catch (error) {
      console.error("[v0] Error al marcar pago:", error)
      toast.error("No se pudo actualizar el estado")
    }
  }

  const agrupar = (items: { contraparte: string; total: number }[]): Grupo[] => {
    const map = new Map<string, Grupo>()
    for (const item of items) {
      const g = map.get(item.contraparte) || { nombre: item.contraparte, total: 0, cantidad: 0 }
      g.total += item.total
      g.cantidad += 1
      map.set(item.contraparte, g)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  const totalCobrar = porCobrar.reduce((s, v) => s + v.total, 0)
  const totalPagar = porPagar.reduce((s, c) => s + c.total, 0)
  const gruposCobrar = agrupar(porCobrar)
  const gruposPagar = agrupar(porPagar)

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Cargando cuentas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por cobrar</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(totalCobrar)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{porCobrar.length} venta(s) a crédito</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por pagar</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatMoney(totalPagar)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{porPagar.length} compra(s) a crédito</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance neto</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalCobrar - totalPagar >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatMoney(totalCobrar - totalPagar)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cobrar menos pagar</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="cobrar" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cobrar">
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            Por cobrar
          </TabsTrigger>
          <TabsTrigger value="pagar">
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            Por pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cobrar" className="space-y-4">
          {gruposCobrar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saldos por cliente</CardTitle>
                <CardDescription>Cuánto te debe cada cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {gruposCobrar.map((g) => (
                    <div key={g.nombre} className="rounded-lg border border-border bg-muted/40 px-4 py-2">
                      <p className="text-sm font-medium">{g.nombre}</p>
                      <p className="text-lg font-bold text-green-600">{formatMoney(g.total)}</p>
                      <p className="text-xs text-muted-foreground">{g.cantidad} venta(s)</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Ventas por cobrar</CardTitle>
              <CardDescription>Ventas a crédito pendientes de cobro</CardDescription>
            </CardHeader>
            <CardContent>
              {porCobrar.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
                  <p className="text-muted-foreground">No tenés ventas pendientes de cobro.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente / detalle</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porCobrar.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{format(new Date(v.fecha), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-medium">{v.contraparte}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(v.total)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => marcarPagado("ventas", v.id)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Cobrado
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar" className="space-y-4">
          {gruposPagar.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Saldos por proveedor</CardTitle>
                <CardDescription>Cuánto le debés a cada proveedor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {gruposPagar.map((g) => (
                    <div key={g.nombre} className="rounded-lg border border-border bg-muted/40 px-4 py-2">
                      <p className="text-sm font-medium">{g.nombre}</p>
                      <p className="text-lg font-bold text-red-600">{formatMoney(g.total)}</p>
                      <p className="text-xs text-muted-foreground">{g.cantidad} compra(s)</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Compras por pagar</CardTitle>
              <CardDescription>Compras a crédito pendientes de pago</CardDescription>
            </CardHeader>
            <CardContent>
              {porPagar.length === 0 ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
                  <p className="text-muted-foreground">No tenés compras pendientes de pago.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Proveedor / detalle</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {porPagar.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{format(new Date(c.fecha), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="font-medium">{c.contraparte}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(c.total)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => marcarPagado("compras", c.id)}>
                              <CheckCircle2 className="mr-1 h-4 w-4" />
                              Pagado
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
