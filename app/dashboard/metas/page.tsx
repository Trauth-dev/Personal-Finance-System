import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Progress } from "@/components/ui/progress"
import { Target, TrendingUp, Calendar } from "lucide-react"

export default async function MetasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener presupuestos
  const { data: presupuestos } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("user_id", user.id)
    .order("fecha", { ascending: false })

  // Para cada presupuesto, calcular el progreso
  const metasConProgreso = await Promise.all(
    (presupuestos || []).map(async (presupuesto) => {
      const fecha = new Date(presupuesto.fecha)
      const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split("T")[0]
      const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split("T")[0]

      const { data: ingresos } = await supabase
        .from("ingresos")
        .select("monto")
        .eq("user_id", user.id)
        .gte("fecha", primerDia)
        .lte("fecha", ultimoDia)

      const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
      const porcentaje = (totalIngresos / Number(presupuesto.meta_salario)) * 100

      return {
        ...presupuesto,
        totalIngresos,
        porcentaje: Math.min(100, porcentaje),
        completado: porcentaje >= 100,
      }
    }),
  )

  return (
    <div>
      <DashboardHeader title="Metas y Objetivos" description="Seguimiento de tus metas financieras" />

      <div className="p-6 space-y-6">
        {metasConProgreso.length > 0 ? (
          <div className="grid gap-6">
            {metasConProgreso.map((meta) => (
              <Card key={meta.id} className="glass-effect border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          meta.completado ? "bg-primary/20" : "bg-accent/20"
                        }`}
                      >
                        <Target className={`w-6 h-6 ${meta.completado ? "text-primary" : "text-accent"}`} />
                      </div>
                      <div>
                        <CardTitle>Meta de Salario</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(meta.fecha).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-foreground">${Number(meta.meta_salario).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Objetivo</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progreso</span>
                      <span className="text-sm font-bold">{meta.porcentaje.toFixed(1)}%</span>
                    </div>
                    <Progress value={meta.porcentaje} className="h-3" />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">Ingresos Actuales</span>
                    </div>
                    <span className="text-lg font-bold text-primary">${meta.totalIngresos.toFixed(2)}</span>
                  </div>

                  {meta.completado ? (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <p className="text-sm font-medium text-primary">¡Meta Completada!</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <p className="text-sm text-muted-foreground">
                        Faltan ${(Number(meta.meta_salario) - meta.totalIngresos).toFixed(2)} para completar la meta
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-effect border-border/50">
            <CardContent className="py-12">
              <div className="text-center">
                <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay metas establecidas</h3>
                <p className="text-muted-foreground">
                  Comienza estableciendo un presupuesto mensual en la sección de Carga de Datos
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
