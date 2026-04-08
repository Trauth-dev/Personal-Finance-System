"use client"

import type React from "react"

import { useRouter, useSearchParams } from "next/navigation"
import { MonthSelector } from "@/components/personal/month-selector"
import { useEffect, useState } from "react"

interface DashboardPersonalClientProps {
  children: React.ReactNode
  initialMonth: string
}

export function DashboardPersonalClient({ children, initialMonth }: DashboardPersonalClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentMonth = searchParams.get("month") || initialMonth
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    setSelectedMonth(currentMonth)
  }, [currentMonth])

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
    router.push(`/dashboard/personal?month=${newMonth}`)
  }

  return (
    <div>
      <div className="p-4 md:p-6 pb-0">
        <MonthSelector value={selectedMonth} onChange={handleMonthChange} />
      </div>
      <div key={currentMonth}>{children}</div>
    </div>
  )
}
