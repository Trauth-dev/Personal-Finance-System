import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

export default async function AnalisisPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener todos los datos
  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("*")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })

  const { data: egresos } = await supabase
    .from("egresos")
    .select("*")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })

  const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
  const balance = totalIngresos - totalEgresos

  // Calcular promedios
  const promedioIngresos = ingresos && ingresos.length > 0 ? totalIngresos / ingresos.length : 0
  const promedioEgresos = egresos && egresos.length > 0 ? totalEgresos / egresos.length : 0

  // Análisis de categorías de gastos
  const gastosPorCategoria = new Map<string, number>()
  egresos?.forEach((egreso) => {
    const categoria = egreso.categoria_varios
    gastosPorCategoria.set(categoria, (gastosPorCategoria.get(categoria) || 0) + Number(egreso.monto))
  })

  const categoriaOrdenada = Array.from(gastosPorCategoria.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Salud financiera
  const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalEgresos) / totalIngresos) * 100 : 0
  const saludFinanciera =
    tasaAhorro >= 20 ? "Excelente" : tasaAhorro >= 10 ? "Buena" : tasaAhorro >= 0 ? "Regular" : "Crítica"

  return (
    <div>
      <DashboardHeader title="Asesoramiento + Herramientas" description="Análisis detallado de tu situación financiera" />

      <div className="p-6 space-y-6">
        {/* Salud Financiera */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tasaAhorro >= 0 ? (
                <CheckCircle className="w-6 h-6 text-primary" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              )}
              Salud Financiera: {saludFinanciera}
            </CardTitle>
            <CardDescription>Evaluación basada en tu tasa de ahorro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tasa de Ahorro</span>
                <span className={`text-sm font-bold ${tasaAhorro >= 0 ? "text-primary" : "text-destructive"}`}>
                  {tasaAhorro.toFixed(1)}%
                </span>
              </div>
              <Progress value={Math.max(0, Math.min(100, tasaAhorro))} className="h-3" />
            </div>

            <div className="grid md:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">Total Ingresos</p>
                <p className="text-2xl font-bold text-primary">${totalIngresos.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-muted-foreground mb-1">Total Egresos</p>
                <p className="text-2xl font-bold text-destructive">${totalEgresos.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                <p className="text-sm text-muted-foreground mb-1">Balance Total</p>
                <p className={`text-2xl font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>
                  ${balance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promedios */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-effect border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Promedio de Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-2">${promedioIngresos.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Por transacción</p>
              <p className="text-xs text-muted-foreground mt-2">Total de {ingresos?.length || 0} transacciones</p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-destructive" />
                Promedio de Egresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-destructive mb-2">${promedioEgresos.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Por transacción</p>
              <p className="text-xs text-muted-foreground mt-2">Total de {egresos?.length || 0} transacciones</p>
            </CardContent>
          </Card>
        </div>

        {/* Top 5 Categorías de Gastos */}
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle>Top 5 Categorías de Gastos</CardTitle>
            <CardDescription>Tus mayores áreas de gasto</CardDescription>
          </CardHeader>
          <CardContent>
            {categoriaOrdenada.length > 0 ? (
              <div className="space-y-4">
                {categoriaOrdenada.map(([categoria, monto], index) => {
                  const porcentaje = totalEgresos > 0 ? (monto / totalEgresos) * 100 : 0
                  return (
                    <div key={categoria}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {index + 1}. {categoria}
                        </span>
                        <span className="text-sm font-bold">${monto.toFixed(2)}</span>
                      </div>
                      <Progress value={porcentaje} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{porcentaje.toFixed(1)}% del total</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No hay datos de gastos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
