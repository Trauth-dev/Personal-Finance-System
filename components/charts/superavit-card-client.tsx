"use client"

import { Card, CardContent } from "@/components/ui/card"
import { formatGuaranies } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface SuperavitCardClientProps {
  balance: number
  cambioBalance: number
}

export function SuperavitCardClient({ balance, cambioBalance }: SuperavitCardClientProps) {
  const esSuperavit = balance >= 0

  return (
    <Card
      className={`${
        esSuperavit ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-gradient-to-br from-red-500 to-rose-600"
      } border-0 shadow-xl`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80 uppercase tracking-wide">
              {esSuperavit ? "Superávit" : "Déficit"}
            </p>
            <p className="text-4xl font-bold text-white mt-2">{formatGuaranies(Math.abs(balance))}</p>
            <div className="flex items-center gap-2 mt-3">
              {cambioBalance >= 0 ? (
                <TrendingUp className="w-4 h-4 text-white" />
              ) : (
                <TrendingDown className="w-4 h-4 text-white" />
              )}
              <span className="text-sm font-medium text-white/90">
                {Math.abs(cambioBalance).toFixed(1)}% vs mes anterior
              </span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            {esSuperavit ? (
              <TrendingUp className="w-8 h-8 text-white" />
            ) : (
              <TrendingDown className="w-8 h-8 text-white" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
