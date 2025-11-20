import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HistoricoPresupuestosClient } from "./historico-presupuestos-client"
import { createClient } from "@/lib/supabase/server"

interface Props {
  perfilId: string
}

export async function HistoricoPresupuestos({ perfilId }: Props) {
  const supabase = await createClient()
  
  // Obtener últimos 6 meses de presupuestos y egresos
  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
  const fechaInicio = seisMesesAtras.toISOString().split("T")[0]

  const { data: presupuestos } = await supabase
    .from("presupuesto_mensual")
    .select("*")
    .eq("perfil_id", perfilId)
    .gte("fecha", fechaInicio)
    .order("fecha", { ascending: false })

  const { data: egresos } = await supabase
    .from("egresos")
    .select("monto, fecha, tipo_categoria:tipos_categoria_egreso(nombre)")
    .eq("perfil_id", perfilId)
    .gte("fecha", fechaInicio)

  return <HistoricoPresupuestosClient presupuestos={presupuestos || []} egresos={egresos || []} />
}
