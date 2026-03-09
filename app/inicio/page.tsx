import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VoiceEntryClient } from "./voice-entry-client"

export const revalidate = 0

export default async function InicioPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Obtener el perfil personal del usuario
  const { data: perfilPersonal } = await supabase
    .from("perfiles")
    .select("id, nombre")
    .eq("user_id", user.id)
    .eq("tipo", "personal")
    .single()

  if (!perfilPersonal) {
    // Si no tiene perfil personal, crear uno
    const { data: nuevoPerfil } = await supabase
      .from("perfiles")
      .insert({
        user_id: user.id,
        nombre: "Personal",
        tipo: "personal",
        color: "#3b82f6",
        icono: "user",
      })
      .select()
      .single()

    if (!nuevoPerfil) {
      redirect("/dashboard/personal")
    }
  }

  const perfilId = perfilPersonal?.id

  // Cargar datos del usuario para la IA
  const [
    { data: tiposCategoria },
    { data: categoriasEgreso },
    { data: categoriasIngreso },
    { data: cajasAhorro },
    { data: tarjetasCredito },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("tipos_categoria_egreso")
      .select("id, nombre, color")
      .eq("perfil_id", perfilId)
      .order("nombre"),
    supabase
      .from("categorias_egreso")
      .select("id, nombre, tipo_categoria_id")
      .eq("perfil_id", perfilId)
      .order("nombre"),
    supabase
      .from("categorias_ingresos")
      .select("id, nombre")
      .eq("perfil_id", perfilId)
      .order("nombre"),
    supabase
      .from("cajas_ahorro")
      .select("id, nombre, monto_actual, moneda, color, tipo_cuenta, banco")
      .eq("perfil_id", perfilId)
      .eq("activa", true)
      .order("nombre"),
    supabase
      .from("deudas")
      .select("id, nombre, tipo_deuda, limite_credito, monto_total")
      .eq("perfil_id", perfilId)
      .eq("tipo_deuda", "tarjeta_credito")
      .eq("estado", "activa")
      .order("nombre"),
    supabase
      .from("profiles")
      .select("nombre_completo")
      .eq("id", user.id)
      .single(),
  ])

  const userName = profile?.nombre_completo || user.email?.split("@")[0] || "Usuario"

  return (
    <VoiceEntryClient
      userId={user.id}
      perfilId={perfilId || ""}
      userName={userName}
      tiposCategoria={tiposCategoria || []}
      categoriasEgreso={categoriasEgreso || []}
      categoriasIngreso={categoriasIngreso || []}
      cajasAhorro={cajasAhorro || []}
      tarjetasCredito={tarjetasCredito || []}
    />
  )
}
