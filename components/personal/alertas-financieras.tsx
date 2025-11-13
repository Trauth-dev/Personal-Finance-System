"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, TrendingUp, Target, CreditCard, X, Bell, BellOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"

type Alerta = {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  nivel: "info" | "warning" | "error"
  leida: boolean
  created_at: string
}

export function AlertasFinancieras() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [mostrarAlertas, setMostrarAlertas] = useState(true)
  const [tablaExiste, setTablaExiste] = useState(true)
  const { perfilActual } = usePerfil()

  useEffect(() => {
    if (perfilActual) {
      loadAlertas()
    }
  }, [perfilActual])

  const loadAlertas = async () => {
    if (!perfilActual) return

    const supabase = createClient()

    const { data, error } = await supabase
      .from("alertas_financieras")
      .select("*")
      .eq("perfil_id", perfilActual.id)
      .eq("leida", false)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error && (error.code === "PGRST116" || error.code === "42P01" || error.code === "42703")) {
      console.log("[v0] Tabla alertas_financieras no disponible o con esquema incompleto")
      setTablaExiste(false)
      return
    }

    if (data) {
      setAlertas(data)
    }
  }

  const marcarComoLeida = async (id: string) => {
    const supabase = createClient()

    await supabase.from("alertas_financieras").update({ leida: true }).eq("id", id)

    setAlertas(alertas.filter((a) => a.id !== id))
  }

  const getIconByTipo = (tipo: string) => {
    switch (tipo) {
      case "presupuesto_excedido":
        return AlertCircle
      case "meta_progreso":
        return Target
      case "deuda_vencimiento":
        return CreditCard
      default:
        return TrendingUp
    }
  }

  const getColorByNivel = (nivel: string) => {
    switch (nivel) {
      case "error":
        return "bg-red-500/10 border-red-500/50 text-red-700"
      case "warning":
        return "bg-yellow-500/10 border-yellow-500/50 text-yellow-700"
      default:
        return "bg-blue-500/10 border-blue-500/50 text-blue-700"
    }
  }

  if (!tablaExiste) {
    return null
  }

  if (!mostrarAlertas || alertas.length === 0) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMostrarAlertas(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Bell className="w-4 h-4 mr-2" />
        Alertas ({alertas.length})
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] space-y-2">
      <div className="flex justify-end mb-2">
        <Button variant="ghost" size="sm" onClick={() => setMostrarAlertas(false)}>
          <BellOff className="w-4 h-4" />
        </Button>
      </div>
      {alertas.map((alerta) => {
        const Icon = getIconByTipo(alerta.tipo)
        return (
          <Card key={alerta.id} className={`glass-effect border ${getColorByNivel(alerta.nivel)} shadow-lg`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5" />
                  <CardTitle className="text-sm">{alerta.titulo}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => marcarComoLeida(alerta.id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{alerta.mensaje}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(alerta.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
