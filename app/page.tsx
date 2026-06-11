import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-2">
            <Image
              src="/prospera-logo.png"
              alt="Prospera+ - Abundancia con propósito"
              width={160}
              height={84}
              className="h-12 w-auto"
              priority
            />
          </div>
          <Link href="/auth/login">
            <Button variant="outline" className="glass-effect bg-transparent">
              Iniciar Sesión
            </Button>
          </Link>
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-6xl font-bold mb-6 text-balance bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Controla tus Finanzas con Inteligencia
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-pretty">
            Sistema de gestión financiera personal ultra moderno. Visualiza, analiza y optimiza tus ingresos y gastos
            con dashboards innovadores.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/registro">
              <Button size="lg" className="glow-effect group">
                Comenzar Ahora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="glass-effect bg-transparent">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="glass-effect p-8 rounded-xl hover:glow-effect transition-all">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboards Avanzados</h3>
            <p className="text-muted-foreground">
              Visualizaciones interactivas y análisis en tiempo real de tus finanzas personales.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-xl hover:glow-effect transition-all">
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">100% Seguro</h3>
            <p className="text-muted-foreground">
              Tus datos están protegidos con encriptación de nivel empresarial y autenticación robusta.
            </p>
          </div>

          <div className="glass-effect p-8 rounded-xl hover:glow-effect transition-all">
            <div className="w-12 h-12 rounded-lg bg-chart-3/20 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-chart-3" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Ultra Rápido</h3>
            <p className="text-muted-foreground">Carga de datos instantánea y reportes generados en milisegundos.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
