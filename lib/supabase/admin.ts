import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Cliente de Supabase con SERVICE ROLE. Ignora RLS y se usa SOLO en el servidor
 * (rutas API que no tienen sesión de usuario, como el webhook de PagoPar).
 * NUNCA debe importarse en código de cliente.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  )
}
