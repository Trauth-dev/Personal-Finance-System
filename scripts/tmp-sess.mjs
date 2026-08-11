import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const email = "davidblancobazan@gmail.com"
const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })
if (error) { console.error("ERR", error); process.exit(1) }

const props = data.properties
// Verify OTP to obtain a real session
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const { data: verifyData, error: verifyErr } = await anon.auth.verifyOtp({
  type: "magiclink",
  token_hash: props.hashed_token,
})
if (verifyErr) { console.error("VERIFY ERR", verifyErr); process.exit(1) }

const s = verifyData.session
const ref = url.split("//")[1].split(".")[0]
const payload = {
  access_token: s.access_token,
  refresh_token: s.refresh_token,
  expires_at: s.expires_at,
  expires_in: s.expires_in,
  token_type: "bearer",
  user: s.user,
}
const cookieVal = "base64-" + Buffer.from(JSON.stringify(payload)).toString("base64")
console.log("COOKIE_NAME=sb-" + ref + "-auth-token")
console.log("COOKIE_VALUE=" + cookieVal)
