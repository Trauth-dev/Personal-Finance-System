import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { User, Building2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PerfilesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("*")
    .eq("user_id", user.id)
    .order("tipo", { ascending: true })

  const perfilPersonal = perfiles?.find((p) => p.tipo === "personal")
  const perfilEmpresarial = perfiles?.find((p) => p.tipo === "empresarial")

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mis Perfiles</h1>
        <p className="text-muted-foreground">
          Gestiona tus dos perfiles: Personal para finanzas personales y Empresarial para tu negocio
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Perfil Personal */}
        <Card className="border-2" style={{ borderColor: perfilPersonal?.color || "#3b82f6" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: perfilPersonal?.color || "#3b82f6" }}
              >
                <User className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Perfil Personal</CardTitle>
                <CardDescription>Finanzas personales y gastos del hogar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Control de ingresos y egresos</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Categorías personalizadas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Reportes y análisis</span>
              </div>
            </div>
            {perfilPersonal && (
              <Button className="w-full" style={{ backgroundColor: perfilPersonal.color }}>
                Usar Perfil Personal
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Perfil Empresarial */}
        <Card className="border-2" style={{ borderColor: perfilEmpresarial?.color || "#8b5cf6" }}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: perfilEmpresarial?.color || "#8b5cf6" }}
              >
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Perfil Empresarial</CardTitle>
                <CardDescription>Gestión completa de tu negocio</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Todo lo del perfil personal</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <span>Gestión de inventario</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <span>Control de proveedores</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
                <span>Catálogo de materias primas</span>
              </div>
            </div>
            {perfilEmpresarial && (
              <Button className="w-full" style={{ backgroundColor: perfilEmpresarial.color }}>
                Usar Perfil Empresarial
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Cada perfil mantiene sus datos completamente separados</p>
          <p>• Puedes cambiar entre perfiles en cualquier momento desde el selector en el header</p>
          <p>• El perfil Personal está enfocado en finanzas personales y del hogar</p>
          <p>• El perfil Empresarial incluye herramientas adicionales para gestión de negocios</p>
          <p>• Los cambios en un perfil no afectan al otro</p>
        </CardContent>
      </Card>
    </div>
  )
}
