"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { PlanesPricing } from "@/components/planes/planes-pricing"

export default function MejorarPlanPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Mejorar Plan"
        description="Elige el plan que mejor se adapta a tus objetivos financieros"
      />
      <PlanesPricing />
    </div>
  )
}
