import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const code = request.nextUrl.searchParams.get("code")
  const token_hash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")

  if ((code || token_hash) && !request.nextUrl.pathname.startsWith("/auth/callback")) {
    console.log("[v0] Código/token de auth detectado en:", request.nextUrl.pathname, "redirigiendo a callback")
    const url = request.nextUrl.clone()
    url.pathname = "/auth/callback"
    return NextResponse.redirect(url)
  }

  const isPublicRoute = request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/auth")

  // If it's a public route, just continue without authentication check
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Only create Supabase client and check auth for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
