import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, Mail } from "lucide-react"

export default function RegistroExitosoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-4">
      <Card className="w-full max-w-md glass-effect border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">¡Registro Exitoso!</CardTitle>
          <CardDescription>Tu cuenta ha sido creada correctamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
            <Mail className="w-5 h-5 text-accent mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Verifica tu correo electrónico</p>
              <p className="text-sm text-muted-foreground">
                Hemos enviado un enlace de confirmación a tu correo. Por favor, verifica tu bandeja de entrada para
                activar tu cuenta.
              </p>
            </div>
          </div>

          <Link href="/auth/login" className="block">
            <Button className="w-full glow-effect">Ir a Iniciar Sesión</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
