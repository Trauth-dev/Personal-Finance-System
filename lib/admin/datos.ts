import { createAdminClient } from "@/lib/supabase/admin"
import { ACCESO_LIBRE_GLOBAL, EMAILS_ACCESO_LIBRE } from "@/lib/plans/acceso-libre"
import { PRECIO_PLAN_COMPLETO, PRECIO_PLAN_PERSONAL, esAdmin, type EstadoCuenta } from "@/lib/admin/config"

const DIA = 86_400_000

export type EstadoPago = "exento" | "activa" | "libre_temporal" | "vencida" | "sin_pago"
export type Segmento = "nuevo" | "activo" | "en_riesgo" | "inactivo" | "sin_activar"
export type NivelAviso = "alto" | "medio" | "info"

export type Aviso = { nivel: NivelAviso; texto: string }

export type UsuarioAdmin = {
  id: string
  email: string
  nombre: string
  telefono: string | null
  pais: string | null
  proveedor: string
  esAdmin: boolean
  esDemo: boolean
  creado: string
  ultimoIngreso: string | null
  emailConfirmado: boolean
  estado: EstadoCuenta
  estadoMotivo: string | null
  estadoActualizado: string | null
  observaciones: string | null
  suscripcionVence: string | null
  pago: {
    estado: EstadoPago
    totalPagado: number
    pagosAprobados: number
    pagosPendientes: number
    ultimoPago: string | null
  }
  actividad: {
    ingresos: number
    egresos: number
    deudas: number
    cajas: number
    clientes: number
    metas: number
    movimientosNoPersonales: number
    total: number
    ultimaActividad: string | null
  }
  planSugerido: "personal" | "completo"
  segmento: Segmento
  diasDesdeAlta: number
  diasSinIngreso: number | null
  avisos: Aviso[]
}

export type RegistroAuditoria = {
  id: string
  adminEmail: string
  usuarioId: string | null
  usuarioEmail: string | null
  accion: string
  detalle: Record<string, unknown>
  fecha: string
}

export type ResumenAdmin = {
  total: number
  nuevos30: number
  activos7: number
  activos30: number
  sinActivar: number
  enRiesgo: number
  inactivos: number
  nuncaIngresaron: number
  pausados: number
  bloqueados: number
  emailsSinConfirmar: number
  conDatos: number
  tasaActivacion: number
  recaudadoTotal: number
  pagosPendientes: number
  proyeccion: {
    usuariosPersonal: number
    usuariosCompleto: number
    mensual: number
    exentos: number
  }
  altasPorMes: { mes: string; altas: number }[]
  accesoLibreGlobal: boolean
}

export type DatosAdmin = {
  usuarios: UsuarioAdmin[]
  resumen: ResumenAdmin
  auditoria: RegistroAuditoria[]
  generado: string
  errores: string[]
}

type FilaActividad = {
  user_id: string
  ingresos: number
  egresos: number
  deudas: number
  cajas: number
  clientes: number
  metas: number
  movimientos_no_personales: number
  perfiles_tipos: string[]
  ultima_actividad: string | null
}

const PAGADO = new Set(["pagado", "aprobado", "completado"])

function diasEntre(desde: string | null, ahora: number): number | null {
  if (!desde) return null
  return Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / DIA))
}

function claveMes(fecha: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Asuncion",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(fecha)
  const y = partes.find((p) => p.type === "year")?.value
  const m = partes.find((p) => p.type === "month")?.value
  return `${y}-${m}`
}

async function listarTodosLosUsuarios(admin: ReturnType<typeof createAdminClient>) {
  const todos = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    todos.push(...data.users)
    if (data.users.length < 1000) break
  }
  return todos
}

export async function getDatosAdmin(): Promise<DatosAdmin> {
  const admin = createAdminClient()
  const ahora = Date.now()
  const errores: string[] = []

  const [usuariosAuth, perfilesRes, pagosRes, actividadRes, auditoriaRes] = await Promise.all([
    listarTodosLosUsuarios(admin),
    admin
      .from("profiles")
      .select(
        "id, email, nombre_completo, telefono, codigo_telefono, pais, plan_tier, suscripcion_vence, estado_cuenta, estado_motivo, estado_actualizado_at, observaciones",
      ),
    admin.from("pagos").select("user_id, monto, estado, fecha_pago, created_at"),
    admin.rpc("admin_resumen_actividad"),
    admin
      .from("admin_auditoria")
      .select("id, admin_email, usuario_id, usuario_email, accion, detalle, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ])

  if (perfilesRes.error) errores.push(`Perfiles: ${perfilesRes.error.message}`)
  if (pagosRes.error) errores.push(`Pagos: ${pagosRes.error.message}`)
  if (actividadRes.error) errores.push(`Actividad: ${actividadRes.error.message}`)
  if (auditoriaRes.error) errores.push(`Auditoría: ${auditoriaRes.error.message}`)

  const perfiles = new Map((perfilesRes.data ?? []).map((p) => [p.id as string, p]))
  const actividad = new Map(((actividadRes.data ?? []) as FilaActividad[]).map((a) => [a.user_id, a]))

  const pagosPorUsuario = new Map<string, { total: number; aprobados: number; pendientes: number; ultimo: string | null }>()
  for (const p of pagosRes.data ?? []) {
    const acc = pagosPorUsuario.get(p.user_id) ?? { total: 0, aprobados: 0, pendientes: 0, ultimo: null }
    if (PAGADO.has(String(p.estado))) {
      acc.total += Number(p.monto) || 0
      acc.aprobados += 1
      const fecha = (p.fecha_pago ?? p.created_at) as string | null
      if (fecha && (!acc.ultimo || fecha > acc.ultimo)) acc.ultimo = fecha
    } else {
      acc.pendientes += 1
    }
    pagosPorUsuario.set(p.user_id, acc)
  }

  const usuarios: UsuarioAdmin[] = usuariosAuth.map((u) => {
    const perfil = perfiles.get(u.id)
    const act = actividad.get(u.id)
    const pagos = pagosPorUsuario.get(u.id) ?? { total: 0, aprobados: 0, pendientes: 0, ultimo: null }
    const email = (u.email ?? perfil?.email ?? "").toLowerCase()
    const esCedula = email.endsWith("@cedula.local")
    const estado = ((perfil?.estado_cuenta as EstadoCuenta) ?? "activo") as EstadoCuenta
    const vence = (perfil?.suscripcion_vence as string | null) ?? null
    const venceMs = vence ? new Date(vence).getTime() : null

    let estadoPago: EstadoPago
    if (EMAILS_ACCESO_LIBRE.has(email)) estadoPago = "exento"
    else if (venceMs && venceMs > ahora) estadoPago = "activa"
    else if (ACCESO_LIBRE_GLOBAL) estadoPago = "libre_temporal"
    else if (pagos.aprobados > 0) estadoPago = "vencida"
    else estadoPago = "sin_pago"

    const a = {
      ingresos: Number(act?.ingresos ?? 0),
      egresos: Number(act?.egresos ?? 0),
      deudas: Number(act?.deudas ?? 0),
      cajas: Number(act?.cajas ?? 0),
      clientes: Number(act?.clientes ?? 0),
      metas: Number(act?.metas ?? 0),
      movimientosNoPersonales: Number(act?.movimientos_no_personales ?? 0),
      total: 0,
      ultimaActividad: act?.ultima_actividad ?? null,
    }
    a.total = a.ingresos + a.egresos + a.deudas + a.cajas + a.clientes + a.metas

    const diasDesdeAlta = diasEntre(u.created_at, ahora) ?? 0
    const referenciaUso = [u.last_sign_in_at, a.ultimaActividad].filter(Boolean).sort().pop() ?? null
    const diasSinIngreso = diasEntre(referenciaUso ?? null, ahora)

    let segmento: Segmento
    if (a.total === 0 && diasDesdeAlta > 3) segmento = "sin_activar"
    else if (diasDesdeAlta <= 7) segmento = "nuevo"
    else if (diasSinIngreso === null || diasSinIngreso > 30) segmento = "inactivo"
    else if (diasSinIngreso > 14) segmento = "en_riesgo"
    else segmento = "activo"

    const planSugerido: UsuarioAdmin["planSugerido"] =
      a.clientes > 0 || a.movimientosNoPersonales > 0 ? "completo" : "personal"

    const avisos: Aviso[] = []
    if (estado !== "activo")
      avisos.push({
        nivel: "alto",
        texto: `Cuenta ${estado}${perfil?.estado_motivo ? `: ${perfil.estado_motivo}` : ""}`,
      })
    if (!u.email_confirmed_at && !esCedula) avisos.push({ nivel: "medio", texto: "Correo sin confirmar" })
    if (!u.last_sign_in_at) avisos.push({ nivel: "medio", texto: "Nunca inició sesión" })
    if (a.total === 0 && diasDesdeAlta > 3)
      avisos.push({ nivel: "medio", texto: "No cargó ningún dato desde el alta (no se activó)" })
    if (segmento === "inactivo" && a.total > 0)
      avisos.push({ nivel: "medio", texto: `Sin uso hace ${diasSinIngreso ?? "+30"} días: riesgo de abandono` })
    if (segmento === "en_riesgo") avisos.push({ nivel: "medio", texto: `Bajó su uso: ${diasSinIngreso} días sin actividad` })
    if (venceMs && venceMs > ahora && venceMs - ahora < 7 * DIA)
      avisos.push({ nivel: "medio", texto: `Suscripción vence en ${Math.ceil((venceMs - ahora) / DIA)} días` })
    if (estadoPago === "vencida") avisos.push({ nivel: "alto", texto: "Suscripción vencida" })
    if (pagos.pendientes > 0) avisos.push({ nivel: "info", texto: `${pagos.pendientes} pago(s) iniciado(s) sin confirmar` })
    if (planSugerido === "completo")
      avisos.push({ nivel: "info", texto: "Usa Empresarial/CRM: con los nuevos planes correspondería el de 120.000 Gs" })
    if (/demo/.test(email)) avisos.push({ nivel: "info", texto: "Cuenta de demostración" })

    return {
      id: u.id,
      email,
      nombre:
        (perfil?.nombre_completo as string | null) ||
        (u.user_metadata?.nombre_completo as string | undefined) ||
        email.split("@")[0],
      telefono: perfil?.telefono ? `${perfil.codigo_telefono ?? ""} ${perfil.telefono}`.trim() : null,
      pais: (perfil?.pais as string | null) ?? null,
      proveedor: (u.app_metadata?.provider as string | undefined) ?? (esCedula ? "cedula" : "email"),
      esAdmin: esAdmin(email),
      esDemo: /demo/.test(email),
      creado: u.created_at,
      ultimoIngreso: u.last_sign_in_at ?? null,
      emailConfirmado: Boolean(u.email_confirmed_at),
      estado,
      estadoMotivo: (perfil?.estado_motivo as string | null) ?? null,
      estadoActualizado: (perfil?.estado_actualizado_at as string | null) ?? null,
      observaciones: (perfil?.observaciones as string | null) ?? null,
      suscripcionVence: vence,
      pago: {
        estado: estadoPago,
        totalPagado: pagos.total,
        pagosAprobados: pagos.aprobados,
        pagosPendientes: pagos.pendientes,
        ultimoPago: pagos.ultimo,
      },
      actividad: a,
      planSugerido,
      segmento,
      diasDesdeAlta,
      diasSinIngreso,
      avisos,
    }
  })

  usuarios.sort((x, y) => (y.ultimoIngreso ?? y.creado).localeCompare(x.ultimoIngreso ?? x.creado))

  const meses: { mes: string; altas: number }[] = []
  const base = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 15)
    meses.push({ mes: claveMes(d), altas: 0 })
  }
  for (const u of usuarios) {
    const fila = meses.find((m) => m.mes === claveMes(new Date(u.creado)))
    if (fila) fila.altas += 1
  }

  const cobrables = usuarios.filter(
    (u) => u.estado === "activo" && u.pago.estado !== "exento" && !u.esDemo && u.diasSinIngreso !== null && u.diasSinIngreso <= 30,
  )
  const usuariosCompleto = cobrables.filter((u) => u.planSugerido === "completo").length
  const usuariosPersonal = cobrables.length - usuariosCompleto
  const conDatos = usuarios.filter((u) => u.actividad.total > 0).length

  const resumen: ResumenAdmin = {
    total: usuarios.length,
    nuevos30: usuarios.filter((u) => u.diasDesdeAlta <= 30).length,
    activos7: usuarios.filter((u) => u.diasSinIngreso !== null && u.diasSinIngreso <= 7).length,
    activos30: usuarios.filter((u) => u.diasSinIngreso !== null && u.diasSinIngreso <= 30).length,
    sinActivar: usuarios.filter((u) => u.segmento === "sin_activar").length,
    enRiesgo: usuarios.filter((u) => u.segmento === "en_riesgo").length,
    inactivos: usuarios.filter((u) => u.segmento === "inactivo").length,
    nuncaIngresaron: usuarios.filter((u) => !u.ultimoIngreso).length,
    pausados: usuarios.filter((u) => u.estado === "pausado").length,
    bloqueados: usuarios.filter((u) => u.estado === "bloqueado").length,
    emailsSinConfirmar: usuarios.filter((u) => !u.emailConfirmado && u.proveedor !== "cedula").length,
    conDatos,
    tasaActivacion: usuarios.length ? Math.round((conDatos / usuarios.length) * 100) : 0,
    recaudadoTotal: usuarios.reduce((s, u) => s + u.pago.totalPagado, 0),
    pagosPendientes: usuarios.reduce((s, u) => s + u.pago.pagosPendientes, 0),
    proyeccion: {
      usuariosPersonal,
      usuariosCompleto,
      mensual: usuariosPersonal * PRECIO_PLAN_PERSONAL + usuariosCompleto * PRECIO_PLAN_COMPLETO,
      exentos: usuarios.filter((u) => u.pago.estado === "exento").length,
    },
    altasPorMes: meses,
    accesoLibreGlobal: ACCESO_LIBRE_GLOBAL,
  }

  const auditoria: RegistroAuditoria[] = (auditoriaRes.data ?? []).map((r) => ({
    id: r.id,
    adminEmail: r.admin_email,
    usuarioId: r.usuario_id,
    usuarioEmail: r.usuario_email,
    accion: r.accion,
    detalle: (r.detalle ?? {}) as Record<string, unknown>,
    fecha: r.created_at,
  }))

  return { usuarios, resumen, auditoria, generado: new Date().toISOString(), errores }
}
