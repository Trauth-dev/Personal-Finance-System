import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  console.log("[v0] Auth handler recibido en raíz", { code: !!code })

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("[v0] Error al intercambiar código:", error)
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
    }

    console.log("[v0] Sesión establecida correctamente, redirigiendo a actualizar contraseña")
    return NextResponse.redirect(new URL("/auth/actualizar-contrasena", requestUrl.origin))
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin))
}
