"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownCircle, ArrowUpCircle, CheckCircle2, Wallet, AlertTriangle, Clock, CalendarX } from "lucide-react"
import { toast } from "sonner"
import { format, differenceInCalendarDays, parseISO } from "date-fns"
import { formatMoney } from "@/lib/currency"

interface Cuenta {
  id: string
  contraparte: string
  detalle: string
  total: number
  fecha: string
  fecha_vencimiento: string | null
}

interface Grupo {
  nombre: string
  total: number
  cantidad: number
}

// Clasificación de una cuenta según su vencimiento respecto de hoy
type EstadoVenc = "vencida" | "porvencer" | "alcorriente" | "sinfecha"

const DIAS_ALERTA = 7 // ventana para considerar una deuda "por vencer"

function clasificarVencimiento(fechaVenc: string | null): { estado: EstadoVenc; dias: number | null } {
  if (!fechaVenc) return { estado: "sinfecha", dias: null }
  const dias = differenceInCalendarDays(parseISO(fechaVenc), new Date())
  if (dias < 0) return { estado: "vencida", dias }
  if (dias <= DIAS_ALERTA) return { estado: "porvencer", dias }
  return { estado: "alcorriente", dias }
}

function VencimientoBadge({ fechaVenc }: { fechaVenc: string | null }) {
  const { estado, dias } = clasificarVencimiento(fechaVenc)
  if (estado === "sinfecha") {
    return <span className="text-xs text-muted-foreground">Sin fecha</span>
  }
  if (estado === "vencida") {
    return (
      <Badge variant="outline" className="border-red-500/40 text-red-600 dark:text-red-400">
        <CalendarX className="mr-1 h-3 w-3" />
        Vencida hace {Math.abs(dias as number)}d
      </Badge>
    )
  }
  if (estado === "porvencer") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
        <Clock className="mr-1 h-3 w-3" />
        {dias === 0 ? "Vence hoy" : `Vence en ${dias}d`}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
      Vence en {dias}d
    </Badge>
  )
}

export function CuentasManager() {
  const { perfilActual } = usePerfil()
  const [porCobrar, setPorCobrar] = useState<Cuenta[]>([])
  const [porPagar, setPorPagar] = useState<Cuenta[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filtros de fecha (sobre la fecha de emisión de la venta/compra)
  const [desde, setDesde] = useState("")
  const [hasta, setHasta] = useState("")

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
          .select("id, cliente_nombre, total, fecha, fecha_vencimiento, producto_nombre")
          .eq("perfil_id", perfilActual.id)
          .eq("estado_pago", "pendiente")
          .order("fecha", { ascending: true }),
        supabase
          .from("compras")
          .select("id, proveedor_nombre, total, fecha, fecha_vencimiento, materia_prima_nombre")
          .eq("perfil_id", perfilActual.id)
          .eq("estado_pago", "pendiente")
          .order("fecha", { ascending: true }),
      ])

      setPorCobrar(
        (ventasRes.data || []).map((v: any) => ({
          id: v.id,
          contraparte: v.cliente_nombre || "Sin cliente",
          detalle: v.producto_nombre || "",
          total: Number(v.total),
          fecha: v.fecha,
          fecha_vencimiento: v.fecha_vencimiento,
        })),
      )
      setPorPagar(
        (comprasRes.data || []).map((c: any) => ({
          id: c.id,
          contraparte: c.proveedor_nombre || "Sin proveedor",
          detalle: c.materia_prima_nombre || "",
          total: Number(c.total),
          fecha: c.fecha,
          fecha_vencimiento: c.fecha_vencimiento,
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

  // Aplica el filtro de rango de fechas de emisión
  const enRango = (fecha: string) => {
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  }

  const cobrarFiltrado = useMemo(() => porCobrar.filter((c) => enRango(c.fecha)), [porCobrar, desde, hasta])
  const pagarFiltrado = useMemo(() => porPagar.filter((c) => enRango(c.fecha)), [porPagar, desde, hasta])

  const agrupar = (items: Cuenta[]): Grupo[] => {
    const map = new Map<string, Grupo>()
    for (const item of items) {
      const g = map.get(item.contraparte) || { nombre: item.contraparte, total: 0, cantidad: 0 }
      g.total += item.total
      g.cantidad += 1
      map.set(item.contraparte, g)
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  // Ordena poniendo primero las más urgentes (vencidas, luego por vencer)
  const ordenarPorUrgencia = (items: Cuenta[]) => {
    const rank: Record<EstadoVenc, number> = { vencida: 0, porvencer: 1, sinfecha: 2, alcorriente: 3 }
    return [...items].sort((a, b) => {
      const ra = rank[clasificarVencimiento(a.fecha_vencimiento).estado]
      const rb = rank[clasificarVencimiento(b.fecha_vencimiento).estado]
      if (ra !== rb) return ra - rb
      return a.fecha_vencimiento && b.fecha_vencimiento
        ? a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)
        : a.fecha.localeCompare(b.fecha)
    })
  }

  const totalCobrar = cobrarFiltrado.reduce((s, v) => s + v.total, 0)
  const totalPagar = pagarFiltrado.reduce((s, c) => s + c.total, 0)

  // Totales de alertas para el resumen superior
  const vencidasCobrar = cobrarFiltrado.filter((c) => clasificarVencimiento(c.fecha_vencimiento).estado === "vencida")
  const vencidasPagar = pagarFiltrado.filter((c) => clasificarVencimiento(c.fecha_vencimiento).estado === "vencida")
  const porVencerCobrar = cobrarFiltrado.filter(
    (c) => clasificarVencimiento(c.fecha_vencimiento).estado === "porvencer",
  )
  const porVencerPagar = pagarFiltrado.filter((c) => clasificarVencimiento(c.fecha_vencimiento).estado === "porvencer")

  const montoVencido = [...vencidasCobrar, ...vencidasPagar].reduce((s, c) => s + c.total, 0)
  const montoPorVencer = [...porVencerCobrar, ...porVencerPagar].reduce((s, c) => s + c.total, 0)

  const limpiarFiltros = () => {
    setDesde("")
    setHasta("")
  }

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

  const renderTabla = (items: Cuenta[], tabla: "ventas" | "compras") => {
    const ordenados = ordenarPorUrgencia(items)
    const etiquetaContraparte = tabla === "ventas" ? "Cliente" : "Proveedor"
    const accion = tabla === "ventas" ? "Cobrado" : "Pagado"

    if (ordenados.length === 0) {
      return (
        <div className="py-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="text-muted-foreground">
            {tabla === "ventas" ? "No tenés ventas pendientes de cobro." : "No tenés compras pendientes de pago."}
          </p>
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emitida</TableHead>
              <TableHead>{etiquetaContraparte} / detalle</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((c) => {
              const { estado } = clasificarVencimiento(c.fecha_vencimiento)
              return (
                <TableRow
                  key={c.id}
                  className={estado === "vencida" ? "bg-red-500/5" : estado === "porvencer" ? "bg-amber-500/5" : ""}
                >
                  <TableCell className="whitespace-nowrap">{format(parseISO(c.fecha), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <p className="font-medium">{c.contraparte}</p>
                    {c.detalle && <p className="text-xs text-muted-foreground">{c.detalle}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <VencimientoBadge fechaVenc={c.fecha_vencimiento} />
                      {c.fecha_vencimiento && (
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(c.fecha_vencimiento), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatMoney(c.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => marcarPagado(tabla, c.id)}>
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      {accion}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderSaldos = (items: Cuenta[], tipo: "cobrar" | "pagar") => {
    const grupos = agrupar(items)
    if (grupos.length === 0) return null
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {tipo === "cobrar" ? "Saldos por cliente" : "Saldos por proveedor"}
          </CardTitle>
          <CardDescription>
            {tipo === "cobrar" ? "Cuánto te debe cada cliente" : "Cuánto le debés a cada proveedor"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {grupos.map((g) => (
              <div key={g.nombre} className="rounded-lg border border-border bg-muted/40 px-4 py-2">
                <p className="text-sm font-medium">{g.nombre}</p>
                <p className={`text-lg font-bold ${tipo === "cobrar" ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(g.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.cantidad} {tipo === "cobrar" ? "venta(s)" : "compra(s)"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recordatorios de vencimiento */}
      {(montoVencido > 0 || montoPorVencer > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {montoVencido > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {vencidasCobrar.length + vencidasPagar.length} cuenta(s) vencida(s) · {formatMoney(montoVencido)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vencidasCobrar.length} por cobrar y {vencidasPagar.length} por pagar ya pasaron su fecha límite.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {montoPorVencer > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 pt-6">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    {porVencerCobrar.length + porVencerPagar.length} cuenta(s) vencen pronto · {formatMoney(montoPorVencer)}
                  </p>
                  <p className="text-sm text-muted-foreground">Vencen dentro de los próximos {DIAS_ALERTA} días.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por cobrar</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatMoney(totalCobrar)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{cobrarFiltrado.length} venta(s) a crédito</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Por pagar</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatMoney(totalPagar)}</div>
            <p className="mt-1 text-xs text-muted-foreground">{pagarFiltrado.length} compra(s) a crédito</p>
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

      {/* Filtro de fechas */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="desde">Desde (fecha de emisión)</Label>
            <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hasta">Hasta</Label>
            <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
          {(desde || hasta) && (
            <Button variant="ghost" onClick={limpiarFiltros} className="sm:mb-0.5">
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

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
          {renderSaldos(cobrarFiltrado, "cobrar")}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por cobrar</CardTitle>
              <CardDescription>Ordenadas por urgencia de vencimiento</CardDescription>
            </CardHeader>
            <CardContent>{renderTabla(cobrarFiltrado, "ventas")}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagar" className="space-y-4">
          {renderSaldos(pagarFiltrado, "pagar")}
          <Card>
            <CardHeader>
              <CardTitle>Compras por pagar</CardTitle>
              <CardDescription>Ordenadas por urgencia de vencimiento</CardDescription>
            </CardHeader>
            <CardContent>{renderTabla(pagarFiltrado, "compras")}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
