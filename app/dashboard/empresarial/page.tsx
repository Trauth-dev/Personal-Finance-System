import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Package, Users, TrendingUp, ShoppingCart, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies } from "@/lib/utils"

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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <DashboardHeader title="Dashboard Empresarial" description="Gestión completa de tu negocio" />
        <div className="p-6">
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6">
              <p className="text-amber-800">
                Por favor, ejecuta los scripts de migración para activar el sistema de perfiles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const ultimoDiaMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]

  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("monto")
    .eq("perfil_id", perfilEmpresarial.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const { data: egresos } = await supabase
    .from("egresos")
    .select("monto")
    .eq("perfil_id", perfilEmpresarial.id)
    .gte("fecha", primerDiaMes)
    .lte("fecha", ultimoDiaMes)

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const balance = totalIngresos - totalEgresos
  const margenBruto = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      <DashboardHeader title="Dashboard Empresarial" description="Gestión completa de tu negocio" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Ingresos del Mes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-purple-600">{formatGuaranies(totalIngresos)}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Ventas y servicios</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Costos del Mes</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-md">
                <ShoppingCart className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-orange-600">{formatGuaranies(totalEgresos)}</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Gastos operativos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Utilidad Neta</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shadow-md">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-xl md:text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatGuaranies(balance)}
              </div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Margen: {margenBruto.toFixed(1)}%</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs md:text-sm font-semibold text-slate-700">Inventario</CardTitle>
              <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center shadow-md">
                <Package className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-blue-600">0</div>
              <p className="text-xs text-slate-600 mt-1 font-medium">Productos registrados</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2 border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <CardTitle className="text-lg font-semibold text-amber-900">
                Funcionalidades Empresariales en Desarrollo
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-amber-800">
              Las siguientes funcionalidades estarán disponibles en las próximas fases:
            </p>
            <ul className="space-y-2 text-sm text-amber-700">
              <li className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>Gestión de Inventario y Stock</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Administración de Proveedores</span>
              </li>
              <li className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                <span>Catálogo de Materias Primas</span>
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Registro de Ventas y Facturación</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
