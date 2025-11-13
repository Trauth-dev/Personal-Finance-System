import { DashboardHeader } from "@/components/dashboard-header"
import { CajasAhorroManager } from "@/components/personal/cajas-ahorro-manager"

export default function CajasAhorroPage() {
  return (
    <div>
      <DashboardHeader title="Cajas de Ahorro" description="Organiza y distribuye tu dinero en diferentes objetivos" />
      <div className="p-6">
        <CajasAhorroManager />
      </div>
    </div>
  )
}
