"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { TrendingUp, DollarSign, Package, ShoppingCart, Users, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ReportesEmpresarialesProps {
  userId: string
}

interface MetricasGenerales {
  ventasTotales: number
  costoVentas: number
  comprasTotales: number
  gastosFijos: number
  utilidadBruta: number
  margenBruto: number
  productosVendidos: number
  valorInventario: number
  stockBajo: number
  proveedoresActivos: number
}

interface VentaPorProducto {
  producto_nombre: string
  cantidad_vendida: number
  ingresos_totales: number
  costo_total: number
  utilidad: number
  margen: number
}

interface MovimientoInventario {
  producto_nombre: string
  stock_actual: number
  stock_minimo: number
  valor_inventario: number
  rotacion: number
}

export function ReportesEmpresariales({ userId }: ReportesEmpresarialesProps) {
  const { perfilActual } = usePerfil()
  const [periodo, setPeriodo] = useState("mes")
  const [metricas, setMetricas] = useState<MetricasGenerales | null>(null)
  const [ventasPorProducto, setVentasPorProducto] = useState<VentaPorProducto[]>([])
  const [movimientosInventario, setMovimientosInventario] = useState<MovimientoInventario[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (perfilActual?.id) {
      cargarReportes()
    }
  }, [perfilActual?.id, periodo])

  const cargarReportes = async () => {
    if (!perfilActual?.id) return

    setIsLoading(true)
    const supabase = createClient()

    try {
      const fechaInicio = calcularFechaInicio(periodo)

      const [ventasRes, inventarioRes, proveedoresRes, comprasRes, egresosRes] = await Promise.all([
        supabase.from("ventas").select("*").eq("perfil_id", perfilActual.id).gte("fecha", fechaInicio),
        supabase.from("inventario").select("*").eq("perfil_id", perfilActual.id).eq("activo", true),
        supabase.from("proveedores").select("*").eq("perfil_id", perfilActual.id).eq("activo", true),
        supabase.from("compras").select("*").eq("perfil_id", perfilActual.id).gte("fecha", fechaInicio),
        supabase.from("egresos").select("monto, concepto").eq("perfil_id", perfilActual.id).gte("fecha", fechaInicio),
      ])

      const ventas = ventasRes.data || []
      const inventario = inventarioRes.data || []
      const proveedores = proveedoresRes.data || []
      const compras = comprasRes.data || []
      const egresos = egresosRes.data || []

      const ventasTotales = ventas.reduce((sum, v) => sum + Number(v.total), 0)
      // Compras del período (egreso de caja por reabastecimiento). NO es el costo de ventas.
      const comprasTotales = compras.reduce((sum, c) => sum + Number(c.total), 0)
      // Costo de Ventas (COGS): costo de lo efectivamente vendido = cantidad vendida × precio de costo del producto.
      const costoVentas = ventas.reduce((sum, v) => {
        const producto = inventario.find((i) => i.nombre === v.producto_nombre)
        const costoUnitario = producto ? Number(producto.precio_costo) : 0
        return sum + Number(v.cantidad) * costoUnitario
      }, 0)
      const utilidadBruta = ventasTotales - costoVentas
      const margenBruto = ventasTotales > 0 ? (utilidadBruta / ventasTotales) * 100 : 0
      const productosVendidos = ventas.reduce((sum, v) => sum + Number(v.cantidad), 0)
      const valorInventario = inventario.reduce((sum, i) => sum + Number(i.stock_actual) * Number(i.precio_costo), 0)
      const stockBajo = inventario.filter((i) => Number(i.stock_actual) <= Number(i.stock_minimo)).length

      // Costos fijos (gastos operativos): egresos del negocio que NO son reabastecimiento de mercadería.
      // Las compras generan egresos con concepto "Compra: ...", así que los excluimos.
      const gastosFijos = egresos
        .filter((e) => !String(e.concepto || "").startsWith("Compra:"))
        .reduce((sum, e) => sum + Number(e.monto), 0)

      setMetricas({
        ventasTotales,
        costoVentas,
        comprasTotales,
        gastosFijos,
        utilidadBruta,
        margenBruto,
        productosVendidos,
        valorInventario,
        stockBajo,
        proveedoresActivos: proveedores.length,
      })

      const ventasAgrupadas = ventas.reduce((acc: any, venta) => {
        const key = venta.producto_nombre
        if (!acc[key]) {
          acc[key] = {
            producto_nombre: key,
            cantidad_vendida: 0,
            ingresos_totales: 0,
            costo_total: 0,
          }
        }
        acc[key].cantidad_vendida += Number(venta.cantidad)
        acc[key].ingresos_totales += Number(venta.total)
        const producto = inventario.find((i) => i.nombre === key)
        if (producto) {
          acc[key].costo_total += Number(venta.cantidad) * Number(producto.precio_costo)
        }
        return acc
      }, {})

      const ventasPorProductoArray = Object.values(ventasAgrupadas).map((v: any) => ({
        ...v,
        utilidad: v.ingresos_totales - v.costo_total,
        margen: v.ingresos_totales > 0 ? ((v.ingresos_totales - v.costo_total) / v.ingresos_totales) * 100 : 0,
      }))

      setVentasPorProducto(ventasPorProductoArray as VentaPorProducto[])

      const movimientos = inventario.map((item) => {
        const ventasProducto = ventas.filter((v) => v.producto_nombre === item.nombre)
        const cantidadVendida = ventasProducto.reduce((sum, v) => sum + Number(v.cantidad), 0)
        const rotacion = Number(item.stock_actual) > 0 ? cantidadVendida / Number(item.stock_actual) : 0

        return {
          producto_nombre: item.nombre,
          stock_actual: Number(item.stock_actual),
          stock_minimo: Number(item.stock_minimo),
          valor_inventario: Number(item.stock_actual) * Number(item.precio_costo),
          rotacion,
        }
      })

      setMovimientosInventario(movimientos)
    } catch (error) {
      console.error("[v0] Error al cargar reportes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calcularFechaInicio = (periodo: string) => {
    const hoy = new Date()
    switch (periodo) {
      case "semana":
        return new Date(hoy.setDate(hoy.getDate() - 7)).toISOString().split("T")[0]
      case "mes":
        return new Date(hoy.setMonth(hoy.getMonth() - 1)).toISOString().split("T")[0]
      case "trimestre":
        return new Date(hoy.setMonth(hoy.getMonth() - 3)).toISOString().split("T")[0]
      case "año":
        return new Date(hoy.setFullYear(hoy.getFullYear() - 1)).toISOString().split("T")[0]
      default:
        return new Date(hoy.setMonth(hoy.getMonth() - 1)).toISOString().split("T")[0]
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: "PYG",
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reportes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Reportes Empresariales</h2>
          <p className="text-muted-foreground">Análisis detallado de tu negocio</p>
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Última semana</SelectItem>
            <SelectItem value="mes">Último mes</SelectItem>
            <SelectItem value="trimestre">Último trimestre</SelectItem>
            <SelectItem value="año">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {metricas && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metricas.ventasTotales)}</div>
              <p className="text-xs text-muted-foreground mt-1">{metricas.productosVendidos} productos vendidos</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Utilidad Bruta</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metricas.utilidadBruta)}</div>
              <p className="text-xs text-muted-foreground mt-1">Margen: {metricas.margenBruto.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
              <Package className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metricas.valorInventario)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metricas.stockBajo > 0 && (
                  <span className="text-orange-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {metricas.stockBajo} productos con stock bajo
                  </span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proveedores Activos</CardTitle>
              <Users className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.proveedoresActivos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Compras del período: {formatCurrency(metricas.comprasTotales)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="ventas" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ventas">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="inventario">
            <Package className="h-4 w-4 mr-2" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="rentabilidad">
            <TrendingUp className="h-4 w-4 mr-2" />
            Rentabilidad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Producto</CardTitle>
              <CardDescription>Análisis detallado de ventas por producto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ventasPorProducto.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay ventas en este período</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Cantidad</th>
                          <th className="text-right p-2">Ingresos</th>
                          <th className="text-right p-2">Utilidad</th>
                          <th className="text-right p-2">Margen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasPorProducto.map((venta, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{venta.producto_nombre}</td>
                            <td className="text-right p-2">{venta.cantidad_vendida}</td>
                            <td className="text-right p-2">{formatCurrency(venta.ingresos_totales)}</td>
                            <td className="text-right p-2">
                              <span className={venta.utilidad >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(venta.utilidad)}
                              </span>
                            </td>
                            <td className="text-right p-2">
                              <span className={venta.margen >= 0 ? "text-green-600" : "text-red-600"}>
                                {venta.margen.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estado del Inventario</CardTitle>
              <CardDescription>Análisis de stock y rotación de productos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movimientosInventario.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No hay productos en inventario</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Producto</th>
                          <th className="text-right p-2">Stock Actual</th>
                          <th className="text-right p-2">Stock Mínimo</th>
                          <th className="text-right p-2">Valor</th>
                          <th className="text-right p-2">Rotación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosInventario.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{item.producto_nombre}</td>
                            <td className="text-right p-2">
                              <span
                                className={
                                  item.stock_actual <= item.stock_minimo ? "text-orange-600 font-semibold" : ""
                                }
                              >
                                {item.stock_actual}
                              </span>
                            </td>
                            <td className="text-right p-2">{item.stock_minimo}</td>
                            <td className="text-right p-2">{formatCurrency(item.valor_inventario)}</td>
                            <td className="text-right p-2">{item.rotacion.toFixed(2)}x</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentabilidad" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Rentabilidad</CardTitle>
              <CardDescription>Estado de resultados simplificado</CardDescription>
            </CardHeader>
            <CardContent>
              {metricas && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="font-medium">Ingresos por Ventas</span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(metricas.ventasTotales)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div className="flex flex-col">
                      <span className="font-medium">Costo de Ventas (CMV)</span>
                      <span className="text-xs text-muted-foreground">Costo de lo efectivamente vendido</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">-{formatCurrency(metricas.costoVentas)}</span>
                  </div>

                  <div className="border-t-2 border-dashed pt-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <span className="font-bold">Utilidad Bruta</span>
                      <span className="text-xl font-bold text-blue-600">{formatCurrency(metricas.utilidadBruta)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-3 py-2 text-sm text-muted-foreground">
                    <span>Compras del período (reabastecimiento)</span>
                    <span>{formatCurrency(metricas.comprasTotales)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground px-3">
                    Las compras reponen inventario y afectan tu caja, pero solo se vuelven costo cuando el producto se
                    vende. Por eso la utilidad bruta usa el costo de ventas (CMV), no el total comprado.
                  </p>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Margen Bruto</p>
                      <p className="text-2xl font-bold">{metricas.margenBruto.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Productos Vendidos</p>
                      <p className="text-2xl font-bold">{metricas.productosVendidos}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
