import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[v0] Iniciando creación de usuario demo...")

    // Crear cliente con Service Role Key para operaciones de admin
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Verificar si el usuario demo ya existe
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    console.log("[v0] Verificando usuarios existentes...")

    if (listError) {
      console.error("[v0] Error listando usuarios:", listError)
      return NextResponse.json(
        {
          success: false,
          error: "Error al verificar usuarios existentes: " + listError.message,
        },
        { status: 500 },
      )
    }

    const demoUserExists = existingUsers.users.find((user) => user.email === "demo@gmail.com")

    if (demoUserExists) {
      console.log("[v0] Usuario demo ya existe:", demoUserExists.id)
      return NextResponse.json({
        success: true,
        message: "Usuario demo ya existe. Puedes iniciar sesión con las credenciales.",
        userId: demoUserExists.id,
        credentials: {
          email: "demo@gmail.com",
          password: "demo123",
        },
        note: "Si aún no ejecutaste el script SQL, hazlo ahora para agregar los datos de ejemplo.",
      })
    }

    // Crear el usuario demo
    console.log("[v0] Creando usuario demo...")
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: "demo@gmail.com",
      password: "demo123",
      email_confirm: true,
      user_metadata: {
        nombre: "Usuario Demo",
        rol: "demo",
      },
    })

    if (createError) {
      console.error("[v0] Error creando usuario demo:", createError)
      return NextResponse.json(
        {
          success: false,
          error: "Error al crear usuario demo: " + createError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Usuario demo creado exitosamente:", newUser.user?.id)

    return NextResponse.json({
      success: true,
      message: "Usuario demo creado exitosamente!",
      userId: newUser.user?.id,
      credentials: {
        email: "demo@gmail.com",
        password: "demo123",
      },
      nextSteps: [
        "1. Ahora ejecuta el script SQL: scripts/018_create_demo_user.sql",
        "2. Luego podrás iniciar sesión con las credenciales arriba",
      ],
    })
  } catch (error) {
    console.error("[v0] Error en create-demo-user:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor: " + (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Endpoint para crear usuario demo",
    instructions: "Envía una petición POST a esta URL para crear el usuario demo",
    method: "POST",
    credentials: {
      email: "demo@gmail.com",
      password: "demo123",
    },
  })
}
