"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PlusCircle,
  History,
  BarChart3,
  TrendingUp,
  PieChart,
  Target,
  LogOut,
  User,
  Activity,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  Users,
  Package,
  ShoppingCart,
  Building2,
  Boxes,
  PiggyBank,
  CreditCard,
  Wallet,
  Calculator,
  Mic,
  UserPlus,
  CalendarClock,
  ClipboardList,
  MessageSquare,
  Star,
  RotateCcw,
  Handshake,
  XCircle,
  Kanban,
  Snowflake,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { usePlanTier } from "@/hooks/use-plan-tier"

// Rutas visibles para usuarios de plan basico (dentro del perfil Personal)
const BASICO_PERSONAL_HREFS = [
  "/dashboard/personal",
  "/dashboard/carga",
  "/dashboard/personal/historial",
]

const navItemsPersonal = [
  {
    title: "Dashboard Principal",
    href: "/dashboard/personal",
    icon: LayoutDashboard,
  },
  // Dashboard Secundario - Oculto temporalmente
  // {
  //   title: "Dashboard Secundario",
  //   href: "/dashboard/personal/resumen",
  //   icon: Activity,
  // },
  {
    title: "Diagnostico inteligente",
    href: "/dashboard/personal/terciario",
    icon: BarChart3,
  },
  {
    title: "Carga de Datos",
    href: "/dashboard/carga",
    icon: PlusCircle,
  },
  // Presupuesto Mensual - Oculto temporalmente
  // {
  //   title: "Presupuesto Mensual",
  //   href: "/dashboard/personal/presupuesto",
  //   icon: Calculator,
  // },
  // Patrimonio Neto - Oculto temporalmente
  // {
  //   title: "Patrimonio Neto",
  //   href: "/dashboard/personal/patrimonio",
  //   icon: Wallet,
  // },
  {
    title: "Cajas de Ahorro",
    href: "/dashboard/personal/cajas-ahorro",
    icon: PiggyBank,
  },
  {
    title: "Deudas",
    href: "/dashboard/personal/deudas",
    icon: CreditCard,
  },
  {
    title: "Plan Anti-Deudas",
    href: "/dashboard/personal/plan-anti-deudas",
    icon: Snowflake,
  },
  {
    title: "Historial",
    href: "/dashboard/personal/historial",
    icon: History,
  },
  {
    title: "Asesoramiento + Herramientas",
    href: "/dashboard/personal/analisis",
    icon: BarChart3,
  },
  // Flujo de Caja - Oculto temporalmente
  // {
  //   title: "Flujo de Caja",
  //   href: "/dashboard/personal/flujo",
  //   icon: TrendingUp,
  // },
  // Categorías - Oculto temporalmente
  // {
  //   title: "Categorías",
  //   href: "/dashboard/personal/categorias",
  //   icon: PieChart,
  // },
  {
    title: "Metas y Plan de Acción",
    href: "/dashboard/personal/metas",
    icon: Target,
  },
]

const navItemsEmpresarial = [
  {
    title: "Dashboard Principal",
    href: "/dashboard/empresarial",
    icon: Building2,
  },
  {
    title: "Dashboard Secundario",
    href: "/dashboard/empresarial/resumen",
    icon: Activity,
  },
  {
    title: "Diagnostico inteligente",
    href: "/dashboard/empresarial/terciario",
    icon: BarChart3,
  },
  {
    title: "Carga de Datos",
    href: "/dashboard/carga",
    icon: PlusCircle,
  },
  {
    title: "Inventario",
    href: "/dashboard/empresarial/inventario",
    icon: Package,
  },
  {
    title: "Proveedores",
    href: "/dashboard/empresarial/proveedores",
    icon: Users,
  },
  {
    title: "Materias Primas",
    href: "/dashboard/empresarial/materias-primas",
    icon: Boxes,
  },
  {
    title: "Ventas",
    href: "/dashboard/empresarial/ventas",
    icon: ShoppingCart,
  },
  {
    title: "Historial",
    href: "/dashboard/empresarial/historial",
    icon: History,
  },
  {
    title: "Asesoramiento + Herramientas",
    href: "/dashboard/empresarial/analisis",
    icon: BarChart3,
  },
  {
    title: "Flujo de Caja",
    href: "/dashboard/empresarial/flujo",
    icon: TrendingUp,
  },
  {
    title: "Categorías",
    href: "/dashboard/empresarial/categorias",
    icon: PieChart,
  },
]

const navItemsCRM = [
  {
    title: "Dashboard CRM",
    href: "/dashboard/crm",
    icon: Handshake,
  },
  {
    title: "Pipeline",
    href: "/dashboard/crm/pipeline",
    icon: Kanban,
  },
  {
    title: "Clientes",
    href: "/dashboard/crm/clientes",
    icon: UserPlus,
  },
  {
    title: "Inventario",
    href: "/dashboard/crm/inventario",
    icon: Package,
  },
  {
    title: "Seguimientos",
    href: "/dashboard/crm/seguimientos",
    icon: ClipboardList,
  },
  {
    title: "Agendamientos",
    href: "/dashboard/crm/agendamientos",
    icon: CalendarClock,
  },
  {
    title: "Cobranzas",
    href: "/dashboard/crm/cobranzas",
    icon: ShoppingCart,
  },
  {
    title: "Testimonios",
    href: "/dashboard/crm/testimonios",
    icon: MessageSquare,
  },
  {
    title: "Re-visitas",
    href: "/dashboard/crm/revisitas",
    icon: RotateCcw,
  },
  {
    title: "No Compras",
    href: "/dashboard/crm/no-compras",
    icon: XCircle,
  },
  {
    title: "Historial",
    href: "/dashboard/crm/historial",
    icon: History,
  },
]

const navItemsCommon = [
  {
    title: "Perfiles",
    href: "/dashboard/perfiles",
    icon: Users,
  },
  {
    title: "Configuracion",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
]

interface DashboardNavProps {
  userName?: string
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

function NavContent({
  userName,
  isCollapsed,
  onToggleCollapse,
  isMobile = false,
  onNavigate,
}: DashboardNavProps & { isMobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { perfilActual } = usePerfil()
  const { isBasico } = usePlanTier()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const handleNavClick = () => {
    if (isMobile && onNavigate) {
      onNavigate()
    }
  }

  const getNavItems = () => {
    switch (perfilActual?.tipo) {
      case "empresarial":
        return [...navItemsEmpresarial, ...navItemsCommon]
      case "crm":
        return [...navItemsCRM, ...navItemsCommon]
      default:
        // Plan basico: solo Dashboard Principal, Carga de Datos, Historial + Configuracion
        if (isBasico) {
          const itemsBasico = navItemsPersonal.filter((item) =>
            BASICO_PERSONAL_HREFS.includes(item.href),
          )
          const configItem = navItemsCommon.filter((item) => item.href === "/dashboard/configuracion")
          return [...itemsBasico, ...configItem]
        }
        return [...navItemsPersonal, ...navItemsCommon]
    }
  }
  const navItems = getNavItems()

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className={cn("p-4 border-b border-sidebar-border transition-all", isCollapsed && !isMobile && "p-2")}>
        <div className={cn("flex items-center gap-3 mb-4", isCollapsed && !isMobile && "justify-center mb-2")}>
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center glow-effect flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          {(!isCollapsed || isMobile) && <span className="text-xl font-bold text-sidebar-foreground">Prospera+</span>}
        </div>

        {(!isCollapsed || isMobile) && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-sidebar-accent">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{userName || "Usuario"}</p>
              <p className="text-xs text-muted-foreground">
                {perfilActual?.tipo === "empresarial" 
                  ? "Cuenta Empresarial" 
                  : perfilActual?.tipo === "crm" 
                    ? "Cuenta CRM" 
                    : "Cuenta Personal"}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && !isMobile && (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Boton destacado para Carga por Voz - Solo visible en perfil Personal */}
      {perfilActual?.tipo === "personal" && (
        <div className={cn("px-2 pt-2", isCollapsed && !isMobile && "px-1")}>
          <Link href="/inicio" onClick={handleNavClick}>
            <div
              className={cn(
                "relative overflow-hidden rounded-xl p-3 transition-all group cursor-pointer",
                "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600",
                "shadow-lg hover:shadow-emerald-500/25 hover:shadow-xl",
                isCollapsed && !isMobile && "p-2"
              )}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn(
                "flex items-center gap-3",
                isCollapsed && !isMobile && "justify-center"
              )}>
                <div className={cn(
                  "flex items-center justify-center rounded-lg bg-white/20 p-2",
                  isCollapsed && !isMobile && "p-1.5"
                )}>
                  <Mic className={cn("w-5 h-5 text-white", isCollapsed && !isMobile && "w-4 h-4")} />
                </div>
                {(!isCollapsed || isMobile) && (
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Carga por Voz</p>
                    <p className="text-xs text-white/70">Registra con IA</p>
                  </div>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}

      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link key={item.href} href={item.href} onClick={handleNavClick}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground glow-effect"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isCollapsed && !isMobile && "justify-center px-2",
                )}
                title={isCollapsed && !isMobile ? item.title : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "animate-pulse")} />
                {(!isCollapsed || isMobile) && <span className="font-medium text-sm">{item.title}</span>}
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="p-2 border-t border-sidebar-border space-y-2">
        {!isMobile && onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent",
              isCollapsed && "justify-center",
            )}
            onClick={onToggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span>Colapsar</span>
              </>
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            isCollapsed && !isMobile && "justify-center",
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {(!isCollapsed || isMobile) && <span className="ml-2">Cerrar Sesión</span>}
        </Button>
      </div>
    </div>
  )
}

export function DashboardNav({ userName, isCollapsed, onToggleCollapse }: DashboardNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-[100]">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-700 shadow-xl hover:shadow-2xl transition-all"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <NavContent userName={userName} isMobile={true} onNavigate={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block h-full">
        <NavContent userName={userName} isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
      </div>
    </>
  )
}
