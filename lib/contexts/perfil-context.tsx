"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

interface Perfil {
  id: string
  user_id: string
  nombre: string
  tipo: "personal" | "empresarial" | "crm"
  color: string
  icono: string
  created_at: string
}

interface PerfilContextType {
  perfilActual: Perfil | null
  perfiles: Perfil[]
  cambiarPerfil: (perfilId: string) => void
  recargarPerfiles: () => Promise<void>
  isLoading: boolean
  sistemaActivo: boolean
}

const PerfilContext = createContext<PerfilContextType | undefined>(undefined)

export function PerfilProvider({ children }: { children: ReactNode }) {
  const [perfilActual, setPerfilActual] = useState<Perfil | null>(null)
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sistemaActivo, setSistemaActivo] = useState(false)

  const cargarPerfiles = async () => {
    try {
      const supabase = createClient()

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000))

      const userPromise = supabase.auth.getUser()

      const {
        data: { user },
        error: authError,
      } = (await Promise.race([userPromise, timeoutPromise])) as any

      if (authError || !user) {
        setSistemaActivo(false)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })

      if (error) {
        setSistemaActivo(false)
        setIsLoading(false)
        return
      }

      setSistemaActivo(true)
      setPerfiles(data || [])

      const perfilGuardadoId = typeof window !== "undefined" ? localStorage.getItem("perfil_actual_id") : null
      const perfilInicial = perfilGuardadoId ? data?.find((p) => p.id === perfilGuardadoId) || data?.[0] : data?.[0]

      if (perfilInicial) {
        setPerfilActual(perfilInicial)
        if (typeof window !== "undefined") {
          localStorage.setItem("perfil_actual_id", perfilInicial.id)
        }
      }
    } catch (error) {
      setSistemaActivo(false)
    } finally {
      setIsLoading(false)
    }
  }

  const cambiarPerfil = (perfilId: string) => {
    const perfil = perfiles.find((p) => p.id === perfilId)
    if (perfil) {
      setPerfilActual(perfil)
      if (typeof window !== "undefined") {
        localStorage.setItem("perfil_actual_id", perfilId)
        window.location.reload()
      }
    }
  }

  const recargarPerfiles = async () => {
    await cargarPerfiles()
  }

  useEffect(() => {
    cargarPerfiles()
  }, [])

  return (
    <PerfilContext.Provider
      value={{
        perfilActual,
        perfiles,
        cambiarPerfil,
        recargarPerfiles,
        isLoading,
        sistemaActivo,
      }}
    >
      {children}
    </PerfilContext.Provider>
  )
}

export function usePerfil() {
  const context = useContext(PerfilContext)
  if (context === undefined) {
    throw new Error("usePerfil debe usarse dentro de un PerfilProvider")
  }
  return context
}
