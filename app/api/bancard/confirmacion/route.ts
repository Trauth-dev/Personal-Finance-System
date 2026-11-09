import { NextResponse } from "next/server"
import { firmaConfirmacionValida, normalizarConfirmacion, type OperacionConfirmada } from "@/lib/bancard/core"
import { aplicarConfirmacion, getConfigBancard, registrarEvento } from "@/lib/bancard/servicio"

export const dynamic = "force-dynamic"

/**
 * URL de confirmación que Bancard llama (servidor a servidor) cuando termina
 * un pago. Solo se confía en el payload si la firma MD5 es correcta.
 */
export async function POST(request: Request) {
  const cfg = getConfigBancard()
  if (!cfg.configurado) return NextResponse.json({ status: "error" }, { status: 503 })

  const body = (await request.json().catch(() => null)) as { operation?: OperacionConfirmada } | null
  const op = body?.operation
  const conf = normalizarConfirmacion(op)

  if (!op || !conf) {
    await registrarEvento({ entorno: cfg.entorno, tipo: "webhook", firmaValida: false, resultado: "payload_invalido" })
    return NextResponse.json({ status: "error" }, { status: 400 })
  }

  if (!firmaConfirmacionValida(cfg.privateKey, op, conf)) {
    await registrarEvento({ shopProcessId: conf.shopProcessId, entorno: cfg.entorno, tipo: "webhook", firmaValida: false, resultado: "firma_invalida" })
    return NextResponse.json({ status: "error" }, { status: 401 })
  }

  try {
    await aplicarConfirmacion(cfg, conf, "webhook")
    return NextResponse.json({ status: "success" })
  } catch (e) {
    console.error("[bancard] confirmación:", (e as Error).message)
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}
