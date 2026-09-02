import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  Package,
  Users,
  TrendingUp,
  ShoppingCart,
  ShoppingBag,
  Boxes,
  BarChart3,
  AlertTriangle,
  ArrowRight,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies } from "@/lib/utils"

export const revalidate = 0

export default async function DashboardEmpresarialPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfilEmpresarial } = await supabase
    .from("perfiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("tipo", "empresarial")
    .single()

  if (!perfilEmpresarial) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <DashboardHeader title="Dashboard Empresarial" description="Gestión completa de tu negocio" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
            <CardContent className="p-6">
              <p className="text-amber-800 dark:text-amber-200">
                No se encontró un perfil Empresarial. Por favor, crea un perfil de tipo Empresarial para acceder a este
                dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const perfilId = perfilEmpresarial.id
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  // Consultas en paralelo
  const [
    { data: ingresos },
    { data: egresos },
    { data: inventario },
    { count: proveedoresCount },
    { data: ventasMes },
  ] = await Promise.all([
    supabase
      .from("ingresos")
      .select("monto")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMes)
      .lte("fecha", ultimoDiaMes),
    supabase
      .from("egresos")
      .select("monto")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMes)
      .lte("fecha", ultimoDiaMes),
    supabase
      .from("inventario")
      .select("stock_actual, stock_minimo, precio_costo")
      .eq("perfil_id", perfilId)
      .eq("activo", true),
    supabase
      .from("proveedores")
      .select("id", { count: "exact", head: true })
      .eq("perfil_id", perfilId)
      .eq("activo", true),
    supabase
      .from("ventas")
      .select("total")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDiaMes)
      .lte("fecha", ultimoDiaMes),
  ])

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const balance = totalIngresos - totalEgresos
  const margenBruto = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0

  const productosCount = inventario?.length || 0
  const stockBajo = inventario?.filter((p) => Number(p.stock_actual) <= Number(p.stock_minimo)).length || 0
  const valorInventario =
    inventario?.reduce((sum, p) => sum + Number(p.stock_actual) * Number(p.precio_costo || 0), 0) || 0
  const ventasMesTotal = ventasMes?.reduce((sum, v) => sum + Number(v.total), 0) || 0

  const accesos = [
    { title: "Inventario", desc: "Productos y stock", href: "/dashboard/empresarial/inventario", icon: Package },
    { title: "Ventas", desc: "Registrar ventas", href: "/dashboard/empresarial/ventas", icon: ShoppingCart },
    { title: "Compras", desc: "Compras y costos", href: "/dashboard/empresarial/compras", icon: ShoppingBag },
    { title: "Proveedores", desc: "Tus proveedores", href: "/dashboard/empresarial/proveedores", icon: Users },
    { title: "Materias Primas", desc: "Insumos", href: "/dashboard/empresarial/materias-primas", icon: Boxes },
    { title: "Reportes", desc: "Análisis del negocio", href: "/dashboard/empresarial/reportes", icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <DashboardHeader title="Dashboard Empresarial" description="Gestión completa de tu negocio" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Métricas financieras del mes */}
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground">Ingresos del Mes</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
                <TrendingUp className="h-5 w-5 text-violet-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatGuaranies(totalIngresos)}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Ventas del mes: {formatGuaranies(ventasMesTotal)}</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground">Costos del Mes</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/15">
                <ShoppingCart className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-foreground">{formatGuaranies(totalEgresos)}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Gastos operativos</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground">Utilidad Neta</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                <Building2 className="h-5 w-5 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl md:text-2xl font-bold ${balance >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatGuaranies(balance)}
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">Margen: {margenBruto.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-sm transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-muted-foreground">Inventario</CardTitle>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-foreground">{productosCount}</div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Valor: {formatGuaranies(valorInventario)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerta de stock bajo (solo si aplica) */}
        {stockBajo > 0 && (
          <Link href="/dashboard/empresarial/inventario">
            <Card className="border-amber-300 bg-amber-50 transition-all hover:shadow-md dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="flex items-center gap-3 p-4">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {stockBajo} {stockBajo === 1 ? "producto está" : "productos están"} en stock mínimo o por debajo.
                  Revisá el inventario.
                </p>
                <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Accesos rápidos a los módulos */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Gestión del negocio</h2>
          <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
            {accesos.map((a) => {
              const Icon = a.icon
              return (
                <Link key={a.href} href={a.href}>
                  <Card className="group h-full border-border bg-card transition-all hover:border-violet-500/50 hover:shadow-md">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                        <Icon className="h-5 w-5 text-violet-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{a.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{a.desc}</p>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Resumen operativo */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Proveedores activos</p>
              <p className="text-lg font-bold text-foreground">{proveedoresCount || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Productos en stock bajo</p>
              <p className={`text-lg font-bold ${stockBajo > 0 ? "text-amber-500" : "text-foreground"}`}>{stockBajo}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Ventas del mes</p>
              <p className="text-lg font-bold text-foreground">{formatGuaranies(ventasMesTotal)}</p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Valor de inventario</p>
              <p className="text-lg font-bold text-foreground">{formatGuaranies(valorInventario)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
