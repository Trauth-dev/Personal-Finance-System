"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useState, useEffect, Suspense } from "react"
import { Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"

function ActualizarContrasenaContent() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      console.log("[v0] Verificando sesión para actualizar contraseña", {
        hasSession: !!session,
        error: error?.message,
      })

      if (session) {
        setIsValidSession(true)
      } else {
        setError("Sesión inválida o expirada. Por favor, solicita un nuevo enlace de recuperación.")
      }

      setIsCheckingSession(false)
    }

    checkSession()
  }, [])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!password || !confirmPassword) {
      setError("Por favor, completa todos los campos")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      console.log("[v0] Contraseña actualizada exitosamente")
      setSuccess(true)

      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    } catch (error: unknown) {
      console.error("[v0] Error al actualizar contraseña:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Error al actualizar la contraseña. Por favor, intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md">
          <Card className="glass-effect border-border/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Verificando sesión...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/prospera-logo.png"
              alt="Prospera+ - Abundancia con propósito"
              width={220}
              height={116}
              className="h-16 w-auto"
              priority
            />
          </div>

          <Card className="glass-effect border-border/50">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Contraseña Actualizada</CardTitle>
              <CardDescription className="text-center">Tu contraseña ha sido actualizada exitosamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Serás redirigido al inicio de sesión en unos segundos...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!isValidSession && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Image
              src="/prospera-logo.png"
              alt="Prospera+ - Abundancia con propósito"
              width={220}
              height={116}
              className="h-16 w-auto"
              priority
            />
          </div>

          <Card className="glass-effect border-border/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Sesión Inválida</CardTitle>
              <CardDescription className="text-center">{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/auth/recuperar-contrasena")} className="w-full">
                Solicitar Nuevo Enlace
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Image
            src="/prospera-logo.png"
            alt="Prospera+ - Abundancia con propósito"
            width={220}
            height={116}
            className="h-16 w-auto"
            priority
          />
        </div>

        <Card className="glass-effect border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Nueva Contraseña</CardTitle>
            <CardDescription className="text-center">Ingresa tu nueva contraseña</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 pr-10"
                    disabled={isLoading}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-background/50 pr-10"
                    disabled={isLoading}
                    placeholder="Repite tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full glow-effect" disabled={isLoading}>
                {isLoading ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ActualizarContrasenaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
          <div className="w-full max-w-md">
            <Card className="glass-effect border-border/50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">Cargando...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ActualizarContrasenaContent />
    </Suspense>
  )
}
