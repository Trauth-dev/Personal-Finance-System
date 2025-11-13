"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useState, useEffect } from "react"
import { TrendingUp, Mail, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      setError(decodeURIComponent(errorParam))
    }
  }, [searchParams])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico")
      return
    }

    if (!email.includes("@")) {
      setError("Por favor, ingresa un correo electrónico válido")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log("[v0] Enviando email de recuperación", {
        email,
        redirectUrl,
        origin: window.location.origin,
      })

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      console.log("[v0] Email de recuperación enviado exitosamente")
      setSuccess(true)
    } catch (error: unknown) {
      console.error("[v0] Error al enviar email de recuperación:", error)
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError("Error al enviar el correo de recuperación. Por favor, intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-effect">
              <TrendingUp className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-3xl font-bold text-foreground">FinanzasPro</span>
          </div>

          <Card className="glass-effect border-border/50">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">Correo Enviado</CardTitle>
              <CardDescription className="text-center">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña. El enlace
                  expirará en 1 hora.
                </p>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>¿No recibiste el correo? Revisa tu carpeta de spam o</p>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail("")
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  intenta nuevamente
                </button>
              </div>

              <Link href="/auth/login">
                <Button variant="outline" className="w-full bg-transparent">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al inicio de sesión
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-effect">
            <TrendingUp className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold text-foreground">FinanzasPro</span>
        </div>

        <Card className="glass-effect border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Recuperar Contraseña</CardTitle>
            <CardDescription className="text-center">
              Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full glow-effect" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Enlace de Recuperación"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
