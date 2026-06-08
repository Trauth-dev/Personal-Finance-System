"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { DashboardNav } from "@/components/dashboard-nav"
import { PlanAccessGuard } from "@/components/plan-access-guard"
import { cn } from "@/lib/utils"
import { PerfilProvider } from "@/lib/contexts/perfil-context"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userName, setUserName] = useState<string>("Usuario")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()

        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000))

        const authPromise = supabase.auth.getUser()

        const {
          data: { user },
          error,
        } = (await Promise.race([authPromise, timeoutPromise])) as any

        if (error || !user) {
          console.error("[v0] Error de autenticación:", error)
          router.push("/auth/login")
          return
        }

        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("nombre_completo")
            .eq("id", user.id)
            .maybeSingle()

          if (!profile && !profileError) {
            await supabase.from("profiles").insert({
              id: user.id,
              email: user.email,
              nombre_completo: user.user_metadata?.nombre_completo || user.email?.split("@")[0] || "Usuario",
              telefono: user.user_metadata?.telefono || null,
              // Usuarios nuevos arrancan con plan basico
              plan_tier: "basico",
            })

            setUserName(user.user_metadata?.nombre_completo || user.email?.split("@")[0] || "Usuario")
          } else {
            setUserName(profile?.nombre_completo || user.email || "Usuario")
          }

          const { data: existingPerfiles } = await supabase.from("perfiles").select("id, tipo").eq("user_id", user.id)

          const hasPersonal = existingPerfiles?.some((p) => p.tipo === "personal")
          const hasEmpresarial = existingPerfiles?.some((p) => p.tipo === "empresarial")

          // Crear perfil Personal si no existe
          if (!hasPersonal) {
            await supabase.from("perfiles").insert({
              user_id: user.id,
              nombre: "Personal",
              tipo: "personal",
              color: "#3b82f6",
              icono: "user",
            })
          }

          // Crear perfil Empresarial si no existe
          if (!hasEmpresarial) {
            await supabase.from("perfiles").insert({
              user_id: user.id,
              nombre: "Empresarial",
              tipo: "empresarial",
              color: "#8b5cf6",
              icono: "briefcase",
            })
          }
        } catch (profileError) {
          console.error("[v0] Error al crear perfiles:", profileError)
          setUserName(user.email || "Usuario")
        }

        setIsLoading(false)
      } catch (error) {
        console.error("[v0] Error en autenticación:", error)
        if (error instanceof Error && error.message === "Timeout") {
          const hasReloaded = sessionStorage.getItem("auth-reload-attempted")
          if (!hasReloaded) {
            sessionStorage.setItem("auth-reload-attempted", "true")
            window.location.reload()
            return
          }
        }
        setIsLoading(false)
        router.push("/auth/login")
      }
    }

    checkAuth()

    // Cargar estado de colapso desde localStorage
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("sidebar-collapsed")
      if (savedCollapsed) {
        setIsCollapsed(savedCollapsed === "true")
      }
    }
  }, [router])

  const handleToggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(newState))
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <PerfilProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar - Desktop */}
        <aside
          className={cn("hidden lg:block flex-shrink-0 transition-all duration-300", isCollapsed ? "w-20" : "w-72")}
        >
          <DashboardNav userName={userName} isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
        </aside>

        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <DashboardNav userName={userName} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl">
            <PlanAccessGuard>
              {children}
            </PlanAccessGuard>
          </div>
        </main>
      </div>
    </PerfilProvider>
  )
}
