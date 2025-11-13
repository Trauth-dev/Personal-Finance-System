import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"

export default async function CategoriasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: egresos } = await supabase.from("egresos").select("*").eq("user_id", user.id)

  // Agrupar por categoría varios
  const categoriaVarios = new Map<string, number>()
  egresos?.forEach((egreso) => {
    const categoria = egreso.categoria_varios
    categoriaVarios.set(categoria, (categoriaVarios.get(categoria) || 0) + Number(egreso.monto))
  })

  // Agrupar por categoría vivienda
  const categoriaVivienda = new Map<string, number>()
  egresos?.forEach((egreso) => {
    const categoria = egreso.categoria_vivienda
    categoriaVivienda.set(categoria, (categoriaVivienda.get(categoria) || 0) + Number(egreso.monto))
  })

  const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0

  const variosOrdenados = Array.from(categoriaVarios.entries()).sort((a, b) => b[1] - a[1])
  const viviendaOrdenados = Array.from(categoriaVivienda.entries()).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <DashboardHeader title="Análisis por Categorías" description="Desglose detallado de gastos por categoría" />

      <div className="p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Categorías Varios */}
          <Card className="glass-effect border-border/50">
            <CardHeader>
              <CardTitle>Categorías Varios</CardTitle>
              <CardDescription>Distribución de gastos personales</CardDescription>
            </CardHeader>
            <CardContent>
              {variosOrdenados.length > 0 ? (
                <div className="space-y-4">
                  {variosOrdenados.map(([categoria, monto]) => {
                    const porcentaje = totalEgresos > 0 ? (monto / totalEgresos) * 100 : 0
                    return (
                      <div key={categoria}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{categoria}</span>
                          <span className="text-sm font-bold">${monto.toFixed(2)}</span>
                        </div>
                        <Progress value={porcentaje} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{porcentaje.toFixed(1)}% del total</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>

          {/* Categorías Vivienda */}
          <Card className="glass-effect border-border/50">
            <CardHeader>
              <CardTitle>Categorías Vivienda</CardTitle>
              <CardDescription>Distribución de gastos del hogar</CardDescription>
            </CardHeader>
            <CardContent>
              {viviendaOrdenados.length > 0 ? (
                <div className="space-y-4">
                  {viviendaOrdenados.map(([categoria, monto]) => {
                    const porcentaje = totalEgresos > 0 ? (monto / totalEgresos) * 100 : 0
                    return (
                      <div key={categoria}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{categoria}</span>
                          <span className="text-sm font-bold">${monto.toFixed(2)}</span>
                        </div>
                        <Progress value={porcentaje} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{porcentaje.toFixed(1)}% del total</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
