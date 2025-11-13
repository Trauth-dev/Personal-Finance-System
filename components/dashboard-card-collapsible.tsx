"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardCardCollapsibleProps {
  title: string
  icon: React.ReactNode
  iconBgColor: string
  children: React.ReactNode
  className?: string
  defaultOpen?: boolean
}

export function DashboardCardCollapsible({
  title,
  icon,
  iconBgColor,
  children,
  className,
  defaultOpen = true,
}: DashboardCardCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={cn("shadow-lg hover:shadow-xl transition-all relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-2 right-2 h-8 w-8 shrink-0 md:hidden z-50 bg-white/90 hover:bg-white shadow-md rounded-lg"
        aria-label={isOpen ? "Colapsar" : "Expandir"}
      >
        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs md:text-sm font-semibold text-slate-700 flex-1 pr-2 md:pr-2 pr-12">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-md", iconBgColor)}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("md:block", isOpen ? "block" : "hidden md:block")}>{children}</CardContent>
    </Card>
  )
}
