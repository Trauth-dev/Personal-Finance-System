import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

function rutaInternaSegura(next: string | null, origin: string): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f]/.test(next)) return null
  try {
    const url = new URL(next, origin)
    return url.origin === origin ? `${url.pathname}${url.search}${url.hash}` : null
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  // Destino opcional tras el login (ej. login con Google -> /dashboard).
  // Solo se aceptan rutas internas para evitar redirecciones abiertas.
  const safeNext = rutaInternaSegura(requestUrl.searchParams.get("next"), requestUrl.origin)
  const error = requestUrl.searchParams.get("error")
  const error_description = requestUrl.searchParams.get("error_description")

  if (error) {
    console.error("Error en callback de Supabase:", error)
    return NextResponse.redirect(
      new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(error_description || error)}`, requestUrl.origin),
    )
  }

  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignorar errores en Server Components
          }
        },
      },
    }
  )

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("Error al intercambiar código:", exchangeError.message)
      return NextResponse.redirect(
        new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin),
      )
    }

    // Si viene un destino (login con Google), vamos ahí; si no, es recuperación de contraseña.
    return NextResponse.redirect(new URL(safeNext ?? "/auth/actualizar-contrasena", requestUrl.origin))
  }

  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "email" | "magiclink",
    })

    if (verifyError) {
      console.error("Error al verificar OTP:", verifyError.message)
      return NextResponse.redirect(
        new URL(`/auth/recuperar-contrasena?error=${encodeURIComponent(verifyError.message)}`, requestUrl.origin),
      )
    }

    return NextResponse.redirect(new URL("/auth/actualizar-contrasena", requestUrl.origin))
  }

  return NextResponse.redirect(
    new URL("/auth/recuperar-contrasena?error=No se recibió código de autenticación", requestUrl.origin),
  )
}
