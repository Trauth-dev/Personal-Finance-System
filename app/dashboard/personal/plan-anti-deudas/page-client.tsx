"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlanBolaNieve } from "@/components/personal/plan-bola-nieve"
import { CalendarioDeudas } from "@/components/personal/calendario-deudas"
import { Snowflake, Calendar } from "lucide-react"

interface PlanAntiDeudasClientProps {
  userId: string
  perfilId: string
}

export function PlanAntiDeudasClient({ userId, perfilId }: PlanAntiDeudasClientProps) {
  const [activeTab, setActiveTab] = useState("plan")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
        <TabsTrigger
          value="plan"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-cyan-500 font-medium px-4 py-3 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 gap-2"
        >
          <Snowflake className="w-4 h-4" />
          Plan Bola de Nieve
        </TabsTrigger>
        <TabsTrigger
          value="calendario"
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-500 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-cyan-500 font-medium px-4 py-3 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200 gap-2"
        >
          <Calendar className="w-4 h-4" />
          Calendario de Pagos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="plan" className="mt-0">
        <PlanBolaNieve userId={userId} perfilId={perfilId} />
      </TabsContent>

      <TabsContent value="calendario" className="mt-0">
        <CalendarioDeudas userId={userId} perfilId={perfilId} />
      </TabsContent>
    </Tabs>
  )
}
