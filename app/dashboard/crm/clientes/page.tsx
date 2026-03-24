import { DashboardHeader } from "@/components/dashboard-header"
import { ClientesManager } from "@/components/crm/clientes-manager"

export default function ClientesCRMPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50">
      <DashboardHeader 
        title="Gestion de Clientes" 
        description="Administra tu cartera de clientes y prospectos" 
      />
      <div className="p-4 md:p-6">
        <ClientesManager />
      </div>
    </div>
  )
}
