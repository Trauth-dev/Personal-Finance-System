// Genera las cookies EXACTAS que @supabase/ssr espera, usando el mismo encoder.
import { createServerClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const access_token = process.argv[2]
const refresh_token = process.argv[3]

const captured = []
const store = new Map()

const supabase = createServerClient(url, anon, {
  cookies: {
    getAll() {
      return Array.from(store.entries()).map(([name, value]) => ({ name, value }))
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => {
        store.set(name, value)
        captured.push({ name, value })
      })
    },
  },
})

const { error } = await supabase.auth.setSession({ access_token, refresh_token })
if (error) { console.error("setSession error:", error.message); process.exit(1) }

// Emitir cookies únicas (última versión de cada una)
const finalCookies = Array.from(store.entries()).map(([name, value]) => ({ name, value }))
console.log(JSON.stringify(finalCookies))
