"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Mail, Lock, User, AlertCircle, Phone, Globe } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { COUNTRIES, getCountryByCode } from "@/lib/currency"

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

export default function RegistroPage() {
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [email, setEmail] = useState("")
  const [paisCode, setPaisCode] = useState("PY")
  const [telefono, setTelefono] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const paisSeleccionado = getCountryByCode(paisCode)

  const handleGoogleSignUp = async () => {
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
    } catch (error: unknown) {
      console.error("[v0] Error en registro con Google:", error)
      setError(
        error instanceof Error ? error.message : "No se pudo continuar con Google. Intenta nuevamente.",
      )
      setIsLoading(false)
    }
  }

  // Solo permitir digitos en el campo de telefono y limitar largo segun el pais
  const handleTelefonoChange = (value: string) => {
    const soloDigitos = value.replace(/\D/g, "").slice(0, paisSeleccionado.phoneLength)
    setTelefono(soloDigitos)
  }

  // Al cambiar de pais, recortar el telefono al largo del nuevo pais
  const handlePaisChange = (code: string) => {
    setPaisCode(code)
    const nuevoPais = getCountryByCode(code)
    setTelefono((prev) => prev.replace(/\D/g, "").slice(0, nuevoPais.phoneLength))
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nombreCompleto || !email || !telefono || !password || !repeatPassword) {
      setError("Por favor, completa todos los campos")
      return
    }

    if (!email.includes("@")) {
      setError("Por favor, ingresa un correo electrónico válido")
      return
    }

    // Validacion de telefono segun el pais seleccionado (largo esperado)
    if (telefono.length !== paisSeleccionado.phoneLength) {
      setError(
        `Ingresa un número de celular válido de ${paisSeleccionado.name} (${paisSeleccionado.phoneLength} dígitos)`,
      )
      return
    }

    if (password !== repeatPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            nombre_completo: nombreCompleto,
            telefono: `${paisSeleccionado.dialCode}${telefono}`,
            pais: paisSeleccionado.code,
            moneda: paisSeleccionado.currency,
            zona_horaria: paisSeleccionado.timezone,
            codigo_telefono: paisSeleccionado.dialCode,
          },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      router.push("/auth/registro-exitoso")
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes("already registered") || error.message.includes("already exists")) {
          setError("Este correo ya está registrado. Por favor, inicia sesión.")
        } else {
          setError(`Error al crear la cuenta: ${error.message}`)
        }
      } else {
        setError("Error al crear la cuenta. Por favor, intenta nuevamente.")
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
            <CardTitle className="text-2xl font-bold text-center">Crear Cuenta</CardTitle>
            <CardDescription className="text-center">
              Completa el formulario para comenzar a gestionar tus finanzas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nombre Completo
                </Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Juan Pérez"
                  required
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="pais" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  País
                </Label>
                <Select value={paisCode} onValueChange={handlePaisChange} disabled={isLoading}>
                  <SelectTrigger id="pais" className="bg-background/50">
                    <SelectValue placeholder="Seleccioná tu país" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        <span className="flex items-center gap-2">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span>{c.name}</span>
                          <span className="text-muted-foreground">({c.currency})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tu cuenta usará la moneda de tu país: {paisSeleccionado.name} ({paisSeleccionado.currency}).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Número de Celular
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background/50 text-sm text-muted-foreground flex-shrink-0">
                    <span className="text-base leading-none">{paisSeleccionado.flag}</span>
                    <span className="font-medium text-foreground">{paisSeleccionado.dialCode}</span>
                  </div>
                  <Input
                    id="telefono"
                    type="tel"
                    inputMode="numeric"
                    placeholder={"0".repeat(paisSeleccionado.phoneLength)}
                    required
                    value={telefono}
                    onChange={(e) => handleTelefonoChange(e.target.value)}
                    className="bg-background/50"
                    disabled={isLoading}
                    autoComplete="tel-national"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ingresa tu número sin el 0 inicial ({paisSeleccionado.phoneLength} dígitos).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeat-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Repetir Contraseña
                </Label>
                <Input
                  id="repeat-password"
                  type="password"
                  placeholder="Confirma tu contraseña"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="bg-background/50"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full glow-effect" disabled={isLoading}>
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o regístrate con</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full bg-transparent"
              onClick={handleGoogleSignUp}
              disabled={isLoading}
            >
              <GoogleIcon className="w-4 h-4 mr-2" />
              Continuar con Google
            </Button>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">¿Ya tienes una cuenta? </span>
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Inicia sesión aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
