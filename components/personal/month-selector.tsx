"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "lucide-react"
import { getParaguayDate } from "@/lib/utils"

interface MonthSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function MonthSelector({ value, onChange }: MonthSelectorProps) {
  const generateMonthOptions = () => {
    const options = []
    const today = getParaguayDate()

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const value = `${year}-${month.toString().padStart(2, "0")}`

      const monthNames = [
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

      const label = `${monthNames[month - 1]} ${year}`
      options.push({ value, label })
    }

    return options
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
