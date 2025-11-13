import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      // Almacena la sesión en localStorage para persistencia entre reinicios del navegador
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      // Detecta automáticamente cambios de sesión en otras pestañas
      detectSessionInUrl: true,
      // Flujo de autenticación seguro
      flowType: "pkce",
    },
  })
}
