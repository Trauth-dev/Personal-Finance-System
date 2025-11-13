import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")

  console.log("[v0] Auth callback recibido", {
    hasCode: !!code,
    hasTokenHash: !!token_hash,
    type,
    error,
    error_description,
    fullUrl: requestUrl.toString(),
  })

  if (error) {
    console.error("[v0] Error en callback de Supabase:", error, error_description)
    return NextResponse.redirect(
      new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin),
    )
  }

  if (code) {
    const supabase = await createClient()

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[v0] Error al intercambiar código:", exchangeError)
      return NextResponse.redirect(
        new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin),
      )
    }

    console.log("[v0] Sesión establecida correctamente para usuario:", data.user?.email)
    return NextResponse.redirect(new URL("/auth/actualizar-contrasena", requestUrl.origin))
  }

  if (token_hash && type) {
    const supabase = await createClient()

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (verifyError) {
      console.error("[v0] Error al verificar OTP:", verifyError)
      return NextResponse.redirect(
        new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin),
      )
    }

    console.log("[v0] OTP verificado correctamente para usuario:", data.user?.email)
    return NextResponse.redirect(new URL("/auth/actualizar-contrasena", requestUrl.origin))
  }

  console.log("[v0] No se encontró código ni token_hash en el callback")
  return NextResponse.redirect(
    new URL("/auth/recuperar-contrasena?error=No se recibió código de autenticación", requestUrl.origin),
  )
}
