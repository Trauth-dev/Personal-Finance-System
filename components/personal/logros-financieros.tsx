"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Trophy, Star, Award, Target, TrendingUp, Zap } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"

type Logro = {
  id: string
  tipo: string
  titulo: string
  descripcion: string
  icono: string
  desbloqueado: boolean
  fecha_desbloqueo: string | null
  progreso_actual: number
  progreso_requerido: number
}

export function LogrosFinancieros() {
  const [logros, setLogros] = useState<Logro[]>([])
  const [tablaExiste, setTablaExiste] = useState(true)
  const { perfilActual } = usePerfil()

  useEffect(() => {
    if (perfilActual) {
      loadLogros()
    }
  }, [perfilActual])

  const loadLogros = async () => {
    if (!perfilActual) return

    const supabase = createClient()

    const { data, error } = await supabase.from("logros_financieros").select("*").eq("perfil_id", perfilActual.id)

    if (error && (error.code === "PGRST116" || error.code === "42P01" || error.code === "42703")) {
      console.log("[v0] Tabla logros_financieros no disponible o con esquema incompleto")
      setTablaExiste(false)
      return
    }

    if (data) {
      const logrosOrdenados = data.sort((a, b) => {
        if (a.desbloqueado === b.desbloqueado) return 0
        return a.desbloqueado ? -1 : 1
      })
      setLogros(logrosOrdenados)
    }
  }

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return Trophy
      case "star":
        return Star
      case "award":
        return Award
      case "target":
        return Target
      case "trending-up":
        return TrendingUp
      case "zap":
        return Zap
      default:
        return Trophy
    }
  }

  if (!tablaExiste) {
    return null
  }

  const logrosDesbloqueados = logros.filter((l) => l.desbloqueado).length
  const totalLogros = logros.length
  const porcentajeCompletado = totalLogros > 0 ? (logrosDesbloqueados / totalLogros) * 100 : 0

  if (logros.length === 0) {
    return null
  }

  return (
    <Card className="glass-effect border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Logros Financieros
            </CardTitle>
            <CardDescription>Celebra tus éxitos financieros</CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg">
            {logrosDesbloqueados}/{totalLogros}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso General</span>
            <span className="font-semibold">{porcentajeCompletado.toFixed(0)}%</span>
          </div>
          <Progress value={porcentajeCompletado} className="h-2" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {logros.map((logro) => {
            const Icon = getIconComponent(logro.icono)
            const porcentaje =
              logro.progreso_requerido > 0 ? (logro.progreso_actual / logro.progreso_requerido) * 100 : 0

            return (
              <Card
                key={logro.id}
                className={`border ${logro.desbloqueado ? "bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300" : "bg-muted/30 border-muted"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${logro.desbloqueado ? "bg-yellow-500" : "bg-muted"}`}
                    >
                      <Icon className={`w-6 h-6 ${logro.desbloqueado ? "text-white" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{logro.titulo}</h4>
                        {logro.desbloqueado && <Badge className="bg-yellow-500 text-white">Desbloqueado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{logro.descripcion}</p>
                      {!logro.desbloqueado && (
                        <div>
                          <Progress value={porcentaje} className="h-1.5 mb-1" />
                          <p className="text-xs text-muted-foreground">
                            {logro.progreso_actual} / {logro.progreso_requerido}
                          </p>
                        </div>
                      )}
                      {logro.desbloqueado && logro.fecha_desbloqueo && (
                        <p className="text-xs text-muted-foreground">
                          Desbloqueado el {new Date(logro.fecha_desbloqueo).toLocaleDateString("es-ES")}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
