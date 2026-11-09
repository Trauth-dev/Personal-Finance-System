import Link from "next/link"
import { redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { ResultadoPago } from "@/components/planes/resultado-pago"

/**
 * Retorno desde Bancard. La activación real la hacen la confirmación de
 * Bancard o la conciliación del servidor; esta página solo muestra el estado.
 */
export default async function ResultadoPagoPage({
  searchParams,
}: {
  searchParams: Promise<{ spid?: string; cancelado?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { spid, cancelado } = await searchParams
  if (spid && /^\d{1,15}$/.test(spid)) return <ResultadoPago spid={spid} cancelado={cancelado === "1"} />

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
        <Clock className="h-8 w-8" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Sin pago para mostrar</h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          No encontramos una operación en curso. Podés revisar tus planes desde el panel.
        </p>
      </div>
      <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
        <Link href="/dashboard/personal/mejorar-plan">Ver planes</Link>
      </Button>
    </div>
  )
}
