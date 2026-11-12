import "server-only"
import { Resend } from "resend"
import { PLANES, esPlanId } from "@/lib/plans/catalogo"

const DESTINATARIO_POR_DEFECTO = "matiastrauth64@gmail.com"

export type TipoAlertaPago = "aprobado" | "rechazado" | "bloqueado" | "inconsistente" | "revertido"

export interface AlertaPago {
  tipo: TipoAlertaPago
  entorno: string
  shopProcessId: number
  planId?: string | null
  monto?: number | null
  usuarioEmail?: string | null
  detalle?: string | null
  venceNuevo?: string | null
}

const TITULOS: Record<TipoAlertaPago, string> = {
  aprobado: "Pago aprobado",
  rechazado: "Pago rechazado",
  bloqueado: "Pago bloqueado (cuenta no autorizada en pruebas)",
  inconsistente: "Pago con datos inconsistentes - revisar",
  revertido: "Pago revertido",
}

function escapar(valor: string) {
  return valor.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)
}

function formatearGs(monto: number) {
  return `Gs. ${new Intl.NumberFormat("es-PY").format(monto)}`
}

/** Envía un aviso al administrador. Nunca lanza errores: un fallo de correo no debe afectar al pago. */
export async function enviarAlertaPago(alerta: AlertaPago) {
  const apiKey = process.env.RESEND_API_KEY
  const dominio = process.env.RESEND_EMAIL_DOMAIN
  if (!apiKey || !dominio) {
    console.warn("[alertas] Resend no configurado; aviso omitido")
    return
  }

  const destinatario = process.env.ALERTAS_PAGOS_EMAIL || DESTINATARIO_POR_DEFECTO
  const prueba = alerta.entorno !== "production"
  const titulo = `${prueba ? "[PRUEBA] " : ""}${TITULOS[alerta.tipo]} #${alerta.shopProcessId}`

  const filas: [string, string][] = [
    ["Pedido", String(alerta.shopProcessId)],
    ["Entorno", prueba ? "Staging (pruebas, sin dinero real)" : "Producción"],
  ]
  if (alerta.usuarioEmail) filas.push(["Usuario", alerta.usuarioEmail])
  if (alerta.planId) filas.push(["Plan", esPlanId(alerta.planId) ? PLANES[alerta.planId].nombre : alerta.planId])
  if (typeof alerta.monto === "number") filas.push(["Monto", formatearGs(alerta.monto)])
  if (alerta.venceNuevo) filas.push(["Vence", new Date(alerta.venceNuevo).toLocaleDateString("es-PY")])
  if (alerta.detalle) filas.push(["Detalle", alerta.detalle])
  filas.push(["Fecha", new Date().toLocaleString("es-PY", { timeZone: "America/Asuncion" })])

  const html = `<div style="font-family:Arial,sans-serif;color:#111;max-width:560px">
<h2 style="margin:0 0 16px">${escapar(titulo)}</h2>
<table style="border-collapse:collapse;width:100%">${filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#555;width:120px">${escapar(k)}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapar(v)}</td></tr>`,
    )
    .join("")}</table>
<p style="color:#777;font-size:12px;margin-top:16px">Aviso automático de Prospera+. Los detalles completos están en la tabla de pagos.</p>
</div>`
  const text = `${titulo}\n\n${filas.map(([k, v]) => `${k}: ${v}`).join("\n")}`

  try {
    const resend = new Resend(apiKey)
    // La clave evita correos duplicados si Bancard reintenta la confirmación.
    const { error } = await resend.emails.send(
      {
        from: `Prospera+ Pagos <pagos@${dominio}>`,
        to: [destinatario],
        subject: titulo,
        html,
        text,
      },
      { idempotencyKey: `pago-${alerta.tipo}-${alerta.entorno}-${alerta.shopProcessId}` },
    )
    if (error) console.error("[alertas] Resend rechazó el envío:", error.message)
  } catch (e) {
    console.error("[alertas] Error enviando aviso:", e instanceof Error ? e.message : e)
  }
}
