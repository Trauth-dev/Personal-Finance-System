// Repro TEMPORAL: obtiene una sesión válida para David sin cambiar su contraseña.
// Usa admin.generateLink (magiclink) -> hashed_token -> verifyOtp para emitir tokens.
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = "davidblancobazan@gmail.com"

const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } })

const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: EMAIL,
})
if (linkErr) { console.error("generateLink error:", linkErr.message); process.exit(1) }

const hashedToken = linkData?.properties?.hashed_token
if (!hashedToken) { console.error("no hashed_token"); process.exit(1) }

const anonClient = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } })
const { data: otpData, error: otpErr } = await anonClient.auth.verifyOtp({
  token_hash: hashedToken,
  type: "magiclink",
})
if (otpErr) { console.error("verifyOtp error:", otpErr.message); process.exit(1) }

const s = otpData.session
// project ref para storage key / cookie name
const ref = new URL(url).hostname.split(".")[0]
console.log(JSON.stringify({
  ref,
  storageKey: `sb-${ref}-auth-token`,
  access_token: s.access_token,
  refresh_token: s.refresh_token,
  expires_at: s.expires_at,
  expires_in: s.expires_in,
  token_type: s.token_type,
  user_id: s.user.id,
}))
