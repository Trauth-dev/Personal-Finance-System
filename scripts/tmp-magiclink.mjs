import { createClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: "davidblancobazan@gmail.com",
})
if (error) {
  console.error("GENLINK_ERROR:", error.message)
  process.exit(1)
}

const tokenHash = data.properties.hashed_token

// Storage en memoria que imita window.localStorage para capturar exactamente
// la clave/valor que supabase-js escribe tras iniciar sesion.
const mem = {}
const memStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = v },
  removeItem: (k) => { delete mem[k] },
}

const client = createClient(url, anonKey, {
  auth: { storage: memStorage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
})

const { data: verifyData, error: verifyError } = await client.auth.verifyOtp({
  token_hash: tokenHash,
  type: "email",
})
if (verifyError) {
  console.error("VERIFY_ERROR:", verifyError.message)
  process.exit(1)
}

console.log("USER_EMAIL:" + verifyData.user?.email)
console.log("LOCALSTORAGE_JSON_START")
console.log(JSON.stringify(mem))
console.log("LOCALSTORAGE_JSON_END")
console.log("ACCESS_TOKEN:" + verifyData.session?.access_token)
console.log("REFRESH_TOKEN:" + verifyData.session?.refresh_token)
