import { createClient } from "@/lib/supabase/server"
import { esAdmin } from "@/lib/admin/config"

export type AdminSesion = { id: string; email: string }

/** Devuelve el admin autenticado o null. Usa getUser() (valida el JWT contra Supabase). */
export async function obtenerAdmin(): Promise<{ usuario: AdminSesion | null; autenticado: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { usuario: null, autenticado: false }
  if (!esAdmin(user.email)) return { usuario: null, autenticado: true }
  return { usuario: { id: user.id, email: user.email!.toLowerCase() }, autenticado: true }
}
