"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, AlertCircle } from "lucide-react"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    setError(null)
    setIsLoading(true)
    try {
      const base =
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`
      const redirectTo = `${base}${base.includes("?") ? "&" : "?"}next=${encodeURIComponent("/dashboard")}`
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      if (error) throw error
      // El navegador se redirige a Google; no hace falta hacer nada más aquí.
    } catch (error: unknown) {
      console.error("[v0] Error en login con Google:", error)
      setError(
        error instanceof Error ? error.message : "No se pudo iniciar sesión con Google. Intenta nuevamente.",
      )
      setIsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError("Por favor, completa todos los campos")
      return
    }

    // Permitir iniciar sesión con correo electrónico o con número de cédula.
    // Si el valor ingresado no contiene "@", se trata como cédula y se
    // convierte al correo sintético usado internamente (ej. 2922619 -> 2922619@cedula.local)
    const trimmed = email.trim()
    const loginEmail = trimmed.includes("@") ? trimmed : `${trimmed}@cedula.local`

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) throw error

      if (data.session) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (error: unknown) {
      console.error("[v0] Error en login:", error)
      if (error instanceof Error) {
        if (error.message.includes("Invalid login credentials")) {
          setError("Correo o contraseña incorrectos. Por favor, verifica tus datos.")
        } else if (error.message.includes("Email not confirmed")) {
          setError("Por favor, confirma tu correo electrónico antes de iniciar sesión.")
        } else {
          setError(error.message)
        }
      } else {
        setError("Error al iniciar sesión. Por favor, intenta nuevamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
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
            <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">Ingresa tus credenciales para acceder a tu cuenta</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Correo o Cédula
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="tu@email.com o tu número de cédula"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Recordar mi sesión
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full glow-effect" disabled={isLoading}>
                {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o continúa con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleGoogleLogin}
              disabled={isLoading}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continuar con Google
            </Button>

            <div className="mt-4 text-center">
              <Link href="/auth/recuperar-contrasena" className="text-sm text-primary hover:underline font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">¿No tienes una cuenta? </span>
              <Link href="/auth/registro" className="text-primary hover:underline font-medium">
                Regístrate aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
