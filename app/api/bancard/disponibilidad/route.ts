import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
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
  // La compra está habilitada aunque el acceso sin pago (COBROS_PAUSADOS) siga vigente.
  const habilitado = cfg.configurado && autorizado

  return NextResponse.json({ habilitado, modoPrueba: habilitado && modoPrueba })
}
