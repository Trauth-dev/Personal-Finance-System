"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { getParaguayDate } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"

interface MonthSelectorProps {
  value: string
  onChange: (value: string) => void
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

// Convierte "YYYY-MM" a etiqueta legible ("Julio 2026")
const formatMonthLabel = (value: string) => {
  const [year, month] = value.split("-").map((n) => Number.parseInt(n))
  return `${MONTH_NAMES[month - 1]} ${year}`
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const { perfilActual } = usePerfil()
  // Meses futuros (posteriores al mes actual) que ya tienen datos cargados
  const [futureMonths, setFutureMonths] = useState<string[]>([])

  useEffect(() => {
    if (!perfilActual?.id) return

    let cancelled = false

    const cargarMesesFuturos = async () => {
      const supabase = createClient()
      const today = getParaguayDate()
      // Primer día del mes siguiente al actual
      const inicioMesSiguiente = new Date(today.getFullYear(), today.getMonth() + 1, 1)
      const inicioStr = `${inicioMesSiguiente.getFullYear()}-${(inicioMesSiguiente.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-01`

      // Cada consulta trae las fechas de registros futuros de una fuente distinta.
      // Solo aparecerán meses que ya tienen alguna carga (ingreso, egreso o presupuesto).
      const [ingresos, egresos, presupCategorias, presupIngresos, presupMensual] = await Promise.all([
        supabase.from("ingresos").select("fecha").eq("perfil_id", perfilActual.id).gte("fecha", inicioStr),
        supabase.from("egresos").select("fecha").eq("perfil_id", perfilActual.id).gte("fecha", inicioStr),
        supabase.from("presupuesto_categorias").select("mes").eq("perfil_id", perfilActual.id).gte("mes", inicioStr),
        supabase.from("presupuesto_ingresos").select("mes").eq("perfil_id", perfilActual.id).gte("mes", inicioStr),
        supabase.from("presupuesto_mensual").select("fecha").eq("perfil_id", perfilActual.id).gte("fecha", inicioStr),
      ])

      const meses = new Set<string>()
      const agregar = (rows: { fecha?: string; mes?: string }[] | null) => {
        for (const row of rows || []) {
          const raw = row.fecha ?? row.mes
          if (raw) meses.add(raw.slice(0, 7)) // "YYYY-MM"
        }
      }

      agregar(ingresos.data as any)
      agregar(egresos.data as any)
      agregar(presupCategorias.data as any)
      agregar(presupIngresos.data as any)
      agregar(presupMensual.data as any)

      if (!cancelled) {
        setFutureMonths(Array.from(meses))
      }
    }

    cargarMesesFuturos()

    return () => {
      cancelled = true
    }
  }, [perfilActual?.id])

  const generateMonthOptions = () => {
    const today = getParaguayDate()
    const values = new Set<string>()

    // Últimos 12 meses (incluye el mes actual)
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const month = date.getMonth() + 1
      values.add(`${date.getFullYear()}-${month.toString().padStart(2, "0")}`)
    }

    // Meses futuros con datos cargados (proyecciones)
    futureMonths.forEach((m) => values.add(m))

    // El mes seleccionado siempre debe existir como opción
    if (value) values.add(value)

    // Orden descendente: los meses futuros quedan arriba, luego el actual y el pasado
    return Array.from(values)
      .sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
      .map((v) => ({ value: v, label: formatMonthLabel(v) }))
  }

  const months = generateMonthOptions()

  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border-2 border-slate-200 px-4 py-2 shadow-sm">
      <Calendar className="w-4 h-4 text-slate-600" />
      <span className="text-sm font-medium text-slate-700">Mes:</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] border-0 focus:ring-0 shadow-none">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
