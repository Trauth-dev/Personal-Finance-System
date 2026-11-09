import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { COBROS_PAUSADOS } from "@/lib/plans/acceso-libre"
import { getConfigBancard, puedeUsarEntorno } from "@/lib/bancard/servicio"

export const dynamic = "force-dynamic"

/** Indica al cliente si puede pagar con Bancard y en qué modo (nunca expone claves). */
export async function GET() {
  const cfg = getConfigBancard()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const autorizado = Boolean(user) && puedeUsarEntorno(cfg.entorno, user?.email)
  const modoPrueba = cfg.entorno === "staging"
  const habilitado = cfg.configurado && autorizado && (modoPrueba || !COBROS_PAUSADOS)

  return NextResponse.json({ habilitado, modoPrueba: habilitado && modoPrueba })
}
