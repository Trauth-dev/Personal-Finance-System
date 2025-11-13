import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Settings, TrendingUp, Home, Sparkles, Plus, Trash2, Lock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CambiarContrasenaForm } from "@/components/cambiar-contrasena-form"

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: categoriasIngresos } = await supabase
    .from("categorias_ingresos")
    .select("*")
    .eq("user_id", user.id)
    .order("nombre")

  const { data: categoriasVivienda } = await supabase
    .from("categorias_egresos_vivienda")
    .select("*")
    .eq("user_id", user.id)
    .order("nombre")

  const { data: categoriasVarios } = await supabase
    .from("categorias_egresos_varios")
    .select("*")
    .eq("user_id", user.id)
    .order("nombre")

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30">
            <Settings className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Configuración</h1>
            <p className="text-slate-400">Personaliza tu cuenta y categorías</p>
          </div>
        </div>

        {/* Sección de seguridad con cambio de contraseña */}
        <Card className="bg-slate-900/50 border-orange-500/30 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-b border-orange-500/30">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-orange-400" />
              <div>
                <CardTitle className="text-white">Seguridad</CardTitle>
                <CardDescription className="text-slate-400">
                  Gestiona tu contraseña y seguridad de cuenta
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <CambiarContrasenaForm />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Categorías de Ingresos */}
          <Card className="bg-slate-900/50 border-green-500/30 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/30">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
                <div>
                  <CardTitle className="text-white">Tipos de Ingreso</CardTitle>
                  <CardDescription className="text-slate-400">Gestiona tus categorías de ingresos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Formulario para agregar nueva categoría */}
              <form
                action={async (formData: FormData) => {
                  "use server"
                  const supabase = await createClient()
                  const {
                    data: { user },
                  } = await supabase.auth.getUser()
                  if (!user) return

                  const nombre = formData.get("nombre") as string
                  if (!nombre?.trim()) return

                  await supabase.from("categorias_ingresos").insert({ user_id: user.id, nombre: nombre.trim() })

                  redirect("/dashboard/configuracion")
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <Input
                    name="nombre"
                    placeholder="Nueva categoría..."
                    className="bg-slate-800/50 border-green-500/30 text-white placeholder:text-slate-500"
                    required
                  />
                  <Button type="submit" className="bg-green-500 hover:bg-green-600 text-white shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </form>

              {/* Lista de categorías */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categoriasIngresos?.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-green-500/20 hover:border-green-500/40 transition-colors"
                  >
                    <span className="text-white">{cat.nombre}</span>
                    <form
                      action={async () => {
                        "use server"
                        const supabase = await createClient()
                        await supabase.from("categorias_ingresos").delete().eq("id", cat.id)
                        redirect("/dashboard/configuracion")
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categorías de Egresos Vivienda */}
          <Card className="bg-slate-900/50 border-blue-500/30 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-b border-blue-500/30">
              <div className="flex items-center gap-3">
                <Home className="w-6 h-6 text-blue-400" />
                <div>
                  <CardTitle className="text-white">Categorías Vivienda</CardTitle>
                  <CardDescription className="text-slate-400">Gastos relacionados al hogar</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Formulario para agregar nueva categoría */}
              <form
                action={async (formData: FormData) => {
                  "use server"
                  const supabase = await createClient()
                  const {
                    data: { user },
                  } = await supabase.auth.getUser()
                  if (!user) return

                  const nombre = formData.get("nombre") as string
                  if (!nombre?.trim()) return

                  await supabase.from("categorias_egresos_vivienda").insert({ user_id: user.id, nombre: nombre.trim() })

                  redirect("/dashboard/configuracion")
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <Input
                    name="nombre"
                    placeholder="Nueva categoría..."
                    className="bg-slate-800/50 border-blue-500/30 text-white placeholder:text-slate-500"
                    required
                  />
                  <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </form>

              {/* Lista de categorías */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categoriasVivienda?.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
                  >
                    <span className="text-white">{cat.nombre}</span>
                    <form
                      action={async () => {
                        "use server"
                        const supabase = await createClient()
                        await supabase.from("categorias_egresos_vivienda").delete().eq("id", cat.id)
                        redirect("/dashboard/configuracion")
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categorías de Egresos Varios */}
          <Card className="bg-slate-900/50 border-pink-500/30 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 border-b border-pink-500/30">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-pink-400" />
                <div>
                  <CardTitle className="text-white">Categorías Varios</CardTitle>
                  <CardDescription className="text-slate-400">Otros gastos personales</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Formulario para agregar nueva categoría */}
              <form
                action={async (formData: FormData) => {
                  "use server"
                  const supabase = await createClient()
                  const {
                    data: { user },
                  } = await supabase.auth.getUser()
                  if (!user) return

                  const nombre = formData.get("nombre") as string
                  if (!nombre?.trim()) return

                  await supabase.from("categorias_egresos_varios").insert({ user_id: user.id, nombre: nombre.trim() })

                  redirect("/dashboard/configuracion")
                }}
                className="space-y-3"
              >
                <div className="flex gap-2">
                  <Input
                    name="nombre"
                    placeholder="Nueva categoría..."
                    className="bg-slate-800/50 border-pink-500/30 text-white placeholder:text-slate-500"
                    required
                  />
                  <Button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </form>

              {/* Lista de categorías */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {categoriasVarios?.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-pink-500/20 hover:border-pink-500/40 transition-colors"
                  >
                    <span className="text-white">{cat.nombre}</span>
                    <form
                      action={async () => {
                        "use server"
                        const supabase = await createClient()
                        await supabase.from("categorias_egresos_varios").delete().eq("id", cat.id)
                        redirect("/dashboard/configuracion")
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
