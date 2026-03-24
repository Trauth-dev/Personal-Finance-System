"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2, User, Briefcase, Edit2, Check, X, Users } from "lucide-react"
import { toast } from "sonner"
import { usePerfil } from "@/lib/contexts/perfil-context"

interface Perfil {
  id: string
  user_id: string
  nombre: string
  tipo: "personal" | "empresarial" | "crm"
  color: string
  icono: string
  created_at: string
}

const COLORES_DISPONIBLES = [
  { valor: "#3b82f6", nombre: "Azul" },
  { valor: "#10b981", nombre: "Verde" },
  { valor: "#f59e0b", nombre: "Naranja" },
  { valor: "#ef4444", nombre: "Rojo" },
  { valor: "#8b5cf6", nombre: "Morado" },
  { valor: "#ec4899", nombre: "Rosa" },
  { valor: "#06b6d4", nombre: "Cyan" },
  { valor: "#84cc16", nombre: "Lima" },
]

const ICONOS_DISPONIBLES = {
  personal: ["👤", "🏠", "💼", "📱", "🎯"],
  empresarial: ["🏢", "💼", "📊", "🚀", "💰", "🏪", "🏭"],
  crm: ["👥", "🤝", "📞", "📋", "🎯", "📈", "💬"],
}

export function PerfilesManager({ perfilesIniciales }: { perfilesIniciales: Perfil[] }) {
  const [perfiles, setPerfiles] = useState<Perfil[]>(perfilesIniciales)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [nuevoTipo, setNuevoTipo] = useState<"personal" | "empresarial" | "crm">("personal")
  const [nuevoColor, setNuevoColor] = useState("#3b82f6")
  const [nuevoIcono, setNuevoIcono] = useState("👤")
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const { recargarPerfiles } = usePerfil()

  const crearPerfil = async () => {
    if (!nuevoNombre.trim()) {
      toast.error("El nombre del perfil es requerido")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuario no autenticado")

      const { data, error } = await supabase
        .from("perfiles")
        .insert({
          user_id: user.id,
          nombre: nuevoNombre,
          tipo: nuevoTipo,
          color: nuevoColor,
          icono: nuevoIcono,
        })
        .select()
        .single()

      if (error) throw error

      setPerfiles([...perfiles, data])
      setMostrarFormulario(false)
      setNuevoNombre("")
      setNuevoTipo("personal")
      setNuevoColor("#3b82f6")
      setNuevoIcono("👤")
      await recargarPerfiles()
      toast.success("Perfil creado exitosamente")
    } catch (error) {
      console.error("[v0] Error al crear perfil:", error)
      toast.error("Error al crear el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const actualizarPerfil = async (id: string) => {
    if (!nuevoNombre.trim()) {
      toast.error("El nombre del perfil es requerido")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre: nuevoNombre,
          color: nuevoColor,
          icono: nuevoIcono,
        })
        .eq("id", id)

      if (error) throw error

      setPerfiles(
        perfiles.map((p) => (p.id === id ? { ...p, nombre: nuevoNombre, color: nuevoColor, icono: nuevoIcono } : p)),
      )
      setEditandoId(null)
      setNuevoNombre("")
      await recargarPerfiles()
      toast.success("Perfil actualizado exitosamente")
    } catch (error) {
      console.error("[v0] Error al actualizar perfil:", error)
      toast.error("Error al actualizar el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const eliminarPerfil = async (id: string) => {
    if (perfiles.length === 1) {
      toast.error("No puedes eliminar tu único perfil")
      return
    }

    if (!confirm("¿Estás seguro de eliminar este perfil? Se eliminarán todos los datos asociados.")) {
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase.from("perfiles").delete().eq("id", id)

      if (error) throw error

      setPerfiles(perfiles.filter((p) => p.id !== id))
      await recargarPerfiles()
      toast.success("Perfil eliminado exitosamente")
    } catch (error) {
      console.error("[v0] Error al eliminar perfil:", error)
      toast.error("Error al eliminar el perfil")
    } finally {
      setIsLoading(false)
    }
  }

  const iniciarEdicion = (perfil: Perfil) => {
    setEditandoId(perfil.id)
    setNuevoNombre(perfil.nombre)
    setNuevoColor(perfil.color)
    setNuevoIcono(perfil.icono)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevoNombre("")
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {perfiles.map((perfil) => (
          <Card key={perfil.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${perfil.color}20` }}
                  >
                    {perfil.icono}
                  </div>
                  <div>
                    {editandoId === perfil.id ? (
                      <Input
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        className="h-8 mb-2"
                        placeholder="Nombre del perfil"
                      />
                    ) : (
                      <CardTitle>{perfil.nombre}</CardTitle>
                    )}
                    <CardDescription className="flex items-center gap-1 mt-1">
                      {perfil.tipo === "personal" && (
                        <>
                          <User className="h-3 w-3" />
                          Personal
                        </>
                      )}
                      {perfil.tipo === "empresarial" && (
                        <>
                          <Briefcase className="h-3 w-3" />
                          Empresarial
                        </>
                      )}
                      {perfil.tipo === "crm" && (
                        <>
                          <Users className="h-3 w-3" />
                          CRM
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editandoId === perfil.id ? (
                <div className="space-y-4">
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {COLORES_DISPONIBLES.map((color) => (
                        <button
                          key={color.valor}
                          onClick={() => setNuevoColor(color.valor)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            nuevoColor === color.valor ? "border-black dark:border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: color.valor }}
                          title={color.nombre}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Icono</Label>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {ICONOS_DISPONIBLES[perfil.tipo].map((icono) => (
                        <button
                          key={icono}
                          onClick={() => setNuevoIcono(icono)}
                          className={`w-10 h-10 rounded-lg border-2 text-xl ${
                            nuevoIcono === icono ? "border-primary" : "border-gray-200"
                          }`}
                        >
                          {icono}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => actualizarPerfil(perfil.id)}
                      disabled={isLoading}
                      size="sm"
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Guardar
                    </Button>
                    <Button onClick={cancelarEdicion} disabled={isLoading} variant="outline" size="sm">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={() => iniciarEdicion(perfil)} variant="outline" size="sm" className="flex-1">
                    <Edit2 className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    onClick={() => eliminarPerfil(perfil.id)}
                    variant="destructive"
                    size="sm"
                    disabled={perfiles.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {mostrarFormulario ? (
          <Card>
            <CardHeader>
              <CardTitle>Nuevo Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Mi Negocio"
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <RadioGroup
                  value={nuevoTipo}
                  onValueChange={(v) => {
                    setNuevoTipo(v as "personal" | "empresarial" | "crm")
                    if (v === "personal") setNuevoIcono("👤")
                    else if (v === "empresarial") setNuevoIcono("🏢")
                    else setNuevoIcono("👥")
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="personal" id="personal" />
                    <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Personal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empresarial" id="empresarial" />
                    <Label htmlFor="empresarial" className="flex items-center gap-2 cursor-pointer">
                      <Briefcase className="h-4 w-4" />
                      Empresarial
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="crm" id="crm" />
                    <Label htmlFor="crm" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      CRM
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {COLORES_DISPONIBLES.map((color) => (
                    <button
                      key={color.valor}
                      onClick={() => setNuevoColor(color.valor)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        nuevoColor === color.valor ? "border-black dark:border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.valor }}
                      title={color.nombre}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label>Icono</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {ICONOS_DISPONIBLES[nuevoTipo].map((icono) => (
                    <button
                      key={icono}
                      onClick={() => setNuevoIcono(icono)}
                      className={`w-10 h-10 rounded-lg border-2 text-xl ${
                        nuevoIcono === icono ? "border-primary" : "border-gray-200"
                      }`}
                    >
                      {icono}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={crearPerfil} disabled={isLoading} className="flex-1">
                  Crear Perfil
                </Button>
                <Button
                  onClick={() => {
                    setMostrarFormulario(false)
                    setNuevoNombre("")
                  }}
                  variant="outline"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card
            className="border-dashed cursor-pointer hover:border-primary transition-colors"
            onClick={() => setMostrarFormulario(true)}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
              <Plus className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Crear nuevo perfil</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
