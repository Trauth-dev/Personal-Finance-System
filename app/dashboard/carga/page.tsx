"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IngresoForm } from "@/components/forms/ingreso-form"
import { EgresoForm } from "@/components/forms/egreso-form"
import { PresupuestoForm } from "@/components/forms/presupuesto-form"
import { TrendingUp, TrendingDown, Target } from "lucide-react"

export default function CargaDatosPage() {
  return (
    <div>
      <DashboardHeader title="Carga de Datos" description="Registra tus ingresos, egresos y presupuesto mensual" />

      <div className="p-6">
        <Tabs defaultValue="ingreso" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-transparent gap-2 p-0">
            <TabsTrigger
              value="ingreso"
              className="flex items-center gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white bg-muted"
            >
              <TrendingUp className="w-4 h-4" />
              Ingreso
            </TabsTrigger>
            <TabsTrigger
              value="egreso"
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white bg-muted"
            >
              <TrendingDown className="w-4 h-4" />
              Egreso
            </TabsTrigger>
            <TabsTrigger
              value="presupuesto"
              className="flex items-center gap-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white bg-muted"
            >
              <Target className="w-4 h-4" />
              Presupuesto
            </TabsTrigger>
          </TabsList>

          <div className="mt-8">
            <TabsContent value="ingreso">
              <IngresoForm />
            </TabsContent>

            <TabsContent value="egreso">
              <EgresoForm />
            </TabsContent>

            <TabsContent value="presupuesto">
              <PresupuestoForm />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
