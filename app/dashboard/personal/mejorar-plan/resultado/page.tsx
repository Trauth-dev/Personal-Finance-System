import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"

/**
 * Página de retorno tras el pago en PagoPar. Muestra el estado del último pago
 * del usuario. La confirmación real del plan la hace el webhook; esta página
 * solo refleja el estado actual (que puede tardar unos segundos en confirmarse).
 */
export default async function ResultadoPagoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: ultimoPago } = await supabase
    .from("pagos")
    .select("plan_id, estado, monto")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const pagado = ultimoPago?.estado === "pagado"

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          pagado ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
        }`}
      >
        {pagado ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">
          {pagado ? "¡Pago confirmado!" : "Pago en verificación"}
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {pagado
            ? "Tu plan ya está activo. Disfrutá de todas las herramientas de Prospera+."
            : "Estamos confirmando tu pago con PagoPar. En cuanto se acredite, tu plan se activará automáticamente. Esto puede tardar unos minutos."}
        </p>
      </div>

      <Button asChild className="bg-emerald-500 text-white hover:bg-emerald-600">
        <Link href="/dashboard/personal">Ir a mi panel</Link>
      </Button>
    </div>
  )
}
