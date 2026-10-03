"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { obtenerAdmin } from "@/lib/admin/auth"
import { DURACION_BANEO, ESTADOS_CUENTA, esAdmin, type EstadoCuenta } from "@/lib/admin/config"

export type ResultadoAccion = { ok: true; mensaje: string } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function contexto(usuarioId: string) {
  const { usuario: adminSesion } = await obtenerAdmin()
  if (!adminSesion) throw new Error("No autorizado")
  if (!UUID.test(usuarioId)) throw new Error("Usuario inválido")

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(usuarioId)
  if (error || !data.user) throw new Error("El usuario no existe")

  return { admin, adminSesion, objetivo: data.user, email: (data.user.email ?? "").toLowerCase() }
}

async function auditar(
  admin: ReturnType<typeof createAdminClient>,
  adminSesion: { id: string; email: string },
  usuarioId: string,
  usuarioEmail: string,
  accion: string,
  detalle: Record<string, unknown>,
) {
  await admin.from("admin_auditoria").insert({
    admin_id: adminSesion.id,
    admin_email: adminSesion.email,
    usuario_id: usuarioId,
    usuario_email: usuarioEmail,
    accion,
    detalle,
  })
}

function mensajeError(e: unknown): ResultadoAccion {
  return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" }
}

export async function cambiarEstadoCuenta(
  usuarioId: string,
  estado: EstadoCuenta,
  motivo: string,
): Promise<ResultadoAccion> {
  try {
    if (!ESTADOS_CUENTA.includes(estado)) return { ok: false, error: "Estado inválido" }
    const { admin, adminSesion, email } = await contexto(usuarioId)

    if (usuarioId === adminSesion.id || esAdmin(email))
      return { ok: false, error: "No podés cambiar el estado de una cuenta administradora" }

    const motivoLimpio = motivo.trim().slice(0, 500)
    if (estado !== "activo" && motivoLimpio.length < 3)
      return { ok: false, error: "Indicá un motivo (mínimo 3 caracteres)" }

    const { data: previo } = await admin.from("profiles").select("estado_cuenta").eq("id", usuarioId).maybeSingle()

    const { error: errPerfil } = await admin.from("profiles").upsert(
      {
        id: usuarioId,
        email,
        estado_cuenta: estado,
        estado_motivo: estado === "activo" ? null : motivoLimpio,
        estado_actualizado_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    if (errPerfil) return { ok: false, error: `No se pudo guardar: ${errPerfil.message}` }

    const { error: errBan } = await admin.auth.admin.updateUserById(usuarioId, {
      ban_duration: estado === "activo" ? "none" : DURACION_BANEO,
    })
    if (errBan) return { ok: false, error: `Estado guardado, pero falló el bloqueo de sesión: ${errBan.message}` }

    await auditar(admin, adminSesion, usuarioId, email, `estado_${estado}`, {
      anterior: previo?.estado_cuenta ?? "activo",
      nuevo: estado,
      motivo: motivoLimpio || null,
    })

    revalidatePath("/admin")
    const textos: Record<EstadoCuenta, string> = {
      activo: "Cuenta reactivada",
      pausado: "Cuenta pausada",
      bloqueado: "Cuenta bloqueada",
    }
    return { ok: true, mensaje: textos[estado] }
  } catch (e) {
    return mensajeError(e)
  }
}

export async function guardarObservaciones(usuarioId: string, texto: string): Promise<ResultadoAccion> {
  try {
    const { admin, adminSesion, email } = await contexto(usuarioId)
    const limpio = texto.trim().slice(0, 2000)

    const { error } = await admin
      .from("profiles")
      .upsert({ id: usuarioId, email, observaciones: limpio || null }, { onConflict: "id" })
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` }

    await auditar(admin, adminSesion, usuarioId, email, "observaciones", { longitud: limpio.length })
    revalidatePath("/admin")
    return { ok: true, mensaje: "Observaciones guardadas" }
  } catch (e) {
    return mensajeError(e)
  }
}

export async function extenderSuscripcion(usuarioId: string, dias: number, nota: string): Promise<ResultadoAccion> {
  try {
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return { ok: false, error: "Cantidad de días inválida" }
    const { admin, adminSesion, email } = await contexto(usuarioId)

    const { data: perfil } = await admin.from("profiles").select("suscripcion_vence").eq("id", usuarioId).maybeSingle()
    const actual = perfil?.suscripcion_vence ? new Date(perfil.suscripcion_vence).getTime() : 0
    const base = Math.max(Date.now(), actual)
    const nuevoVence = new Date(base + dias * 86_400_000).toISOString()

    const { error } = await admin
      .from("profiles")
      .upsert({ id: usuarioId, email, suscripcion_vence: nuevoVence }, { onConflict: "id" })
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` }

    await auditar(admin, adminSesion, usuarioId, email, "suscripcion_extendida", {
      dias,
      anterior: perfil?.suscripcion_vence ?? null,
      nuevo: nuevoVence,
      nota: nota.trim().slice(0, 300) || null,
    })
    revalidatePath("/admin")
    return { ok: true, mensaje: `Suscripción extendida ${dias} días` }
  } catch (e) {
    return mensajeError(e)
  }
}

export async function anularSuscripcion(usuarioId: string): Promise<ResultadoAccion> {
  try {
    const { admin, adminSesion, email } = await contexto(usuarioId)
    const { data: perfil } = await admin.from("profiles").select("suscripcion_vence").eq("id", usuarioId).maybeSingle()

    const { error } = await admin.from("profiles").update({ suscripcion_vence: null }).eq("id", usuarioId)
    if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` }

    await auditar(admin, adminSesion, usuarioId, email, "suscripcion_anulada", {
      anterior: perfil?.suscripcion_vence ?? null,
    })
    revalidatePath("/admin")
    return { ok: true, mensaje: "Suscripción anulada" }
  } catch (e) {
    return mensajeError(e)
  }
}
