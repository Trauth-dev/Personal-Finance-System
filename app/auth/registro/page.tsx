"use client"

import type React from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { TrendingUp, Mail, Lock, User, AlertCircle, Phone } from "lucide-react"

export default function RegistroPage() {
  const [nombreCompleto, setNombreCompleto] = useState("")
  const [email, setEmail] = useState("")
  const [telefono, setTelefono] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Solo permitir digitos en el campo de telefono y limitar largo razonable
  const handleTelefonoChange = (value: string) => {
    const soloDigitos = value.replace(/\D/g, "").slice(0, 9)
    setTelefono(soloDigitos)
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

    // Validacion de telefono Paraguay: 9 digitos comenzando en 9 (ej: 981123456)
    if (telefono.length !== 9 || !telefono.startsWith("9")) {
      setError("Ingresa un número de celular válido de Paraguay (9 dígitos, ej: 981123456)")
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
            telefono: `+595${telefono}`,
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
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center glow-effect">
            <TrendingUp className="w-7 h-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold text-foreground">Prospera+</span>
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
                <Label htmlFor="telefono" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Número de Celular
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 h-10 rounded-md border border-input bg-background/50 text-sm text-muted-foreground flex-shrink-0">
                    <span className="text-base leading-none">🇵🇾</span>
                    <span className="font-medium text-foreground">+595</span>
                  </div>
                  <Input
                    id="telefono"
                    type="tel"
                    inputMode="numeric"
                    placeholder="981 123 456"
                    required
                    value={telefono}
                    onChange={(e) => handleTelefonoChange(e.target.value)}
                    className="bg-background/50"
                    disabled={isLoading}
                    autoComplete="tel-national"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Ingresa tu número sin el 0 inicial (ej: 981123456)</p>
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
