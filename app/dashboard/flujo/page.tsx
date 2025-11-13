import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatGuaranies } from "@/lib/utils"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"

export default async function FlujoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener últimos 12 meses
  const meses = []
  for (let i = 11; i >= 0; i--) {
    const fecha = new Date()
    fecha.setMonth(fecha.getMonth() - i)
    const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1).toISOString().split("T")[0]
    const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).toISOString().split("T")[0]

    const { data: ingresos } = await supabase
      .from("ingresos")
      .select("monto")
      .eq("user_id", user.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    const { data: egresos } = await supabase
      .from("egresos")
      .select("monto")
      .eq("user_id", user.id)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)

    const totalIngresos = ingresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
    const totalEgresos = egresos?.reduce((sum, item) => sum + Number(item.monto), 0) || 0
    const balance = totalIngresos - totalEgresos

    meses.push({
      mes: fecha.toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      ingresos: totalIngresos,
      egresos: totalEgresos,
      balance: balance,
    })
  }

  return (
    <div>
      <DashboardHeader title="Flujo de Caja" description="Análisis temporal de ingresos y egresos" />

      <div className="p-6 space-y-6">
        <Card className="glass-effect border-border/50">
          <CardHeader>
            <CardTitle>Flujo de Caja Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meses.map((mes) => (
                <div key={mes.mes} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium w-20">{mes.mes}</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">{formatGuaranies(mes.ingresos)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-600">{formatGuaranies(mes.egresos)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-blue-500" />
                    <span className={`text-sm font-bold ${mes.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatGuaranies(mes.balance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
