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
      <DashboardHeader title="Carga de Ingreso y Egreso" description="Registra tus ingresos, egresos y presupuesto mensual" />

      <div className="p-4 sm:p-6">
        <Tabs defaultValue="ingreso" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 bg-transparent gap-1 sm:gap-2 p-0">
            <TabsTrigger
              value="ingreso"
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white bg-muted text-xs sm:text-sm px-2 py-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Ingreso</span>
              <span className="sm:hidden">Ingreso</span>
            </TabsTrigger>
            <TabsTrigger
              value="egreso"
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white bg-muted text-xs sm:text-sm px-2 py-2"
            >
              <TrendingDown className="w-4 h-4" />
              <span className="hidden sm:inline">Egreso</span>
              <span className="sm:hidden">Egreso</span>
            </TabsTrigger>
            <TabsTrigger
              value="presupuesto"
              className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-sky-500 data-[state=active]:text-white bg-muted text-xs sm:text-sm px-2 py-2"
            >
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Presupuesto</span>
              <span className="sm:hidden">Presup.</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6 sm:mt-8">
            {/*
              forceMount mantiene los tres formularios montados en segundo plano.
              Así, al cambiar de pestaña, el cambio es INSTANTÁNEO: no se
              desmontan ni vuelven a consultar el servidor (Radix solo los oculta
              con el atributo `hidden`). Además, los tres cargan sus datos una
              sola vez al abrir la página, en paralelo, por lo que al hacer clic
              en Egreso o Presupuesto sus datos ya están listos.
            */}
            <TabsContent value="ingreso" forceMount className="data-[state=inactive]:hidden">
              <IngresoForm />
            </TabsContent>

            <TabsContent value="egreso" forceMount className="data-[state=inactive]:hidden">
              <EgresoForm />
            </TabsContent>

            <TabsContent value="presupuesto" forceMount className="data-[state=inactive]:hidden">
              <PresupuestoForm />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}
