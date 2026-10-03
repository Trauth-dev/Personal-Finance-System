import { Banknote, CreditCard, Landmark } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { formatMoney } from "@/lib/currency"
import type { PersonalDashboardData } from "@/lib/dashboard/personal-dashboard"

function Valor({ ok, children, className }: { ok: boolean; children: React.ReactNode; className: string }) {
  return ok ? <p className={className}>{children}</p> : <p className="text-sm font-medium text-slate-400">No pudimos cargar este dato</p>
}

export function BannerPatrimonio({ data }: { data: PersonalDashboardData }) {
  const { historico, disponible, moneda } = data
  const ok = historico.ok
  const patrimonio = ok ? historico.data.patrimonio : 0
  const saldos = disponible.ok ? disponible.data.filter((s) => s.total !== 0) : []

  return (
    <Card className="border-2 border-cyan-500/30 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
      <CardContent className="p-4 md:p-5">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/20">
              <Banknote className="h-5 w-5 text-green-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Ingresos Acumulados</p>
              <Valor ok={ok} className="text-lg font-bold text-green-400">
                {ok && formatMoney(historico.data.ingresos, moneda)}
              </Valor>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <CreditCard className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Total Egresos Acumulados</p>
              <Valor ok={ok} className="text-lg font-bold text-red-400">
                {ok && formatMoney(historico.data.gastos, moneda)}
              </Valor>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:justify-end">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
              <Landmark className="h-5 w-5 text-cyan-400" aria-hidden="true" />
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Patrimonio Neto Total</p>
              <Valor ok={ok} className={`text-xl font-bold ${patrimonio >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                {ok && formatMoney(patrimonio, moneda)}
              </Valor>
              {saldos.length > 0 && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  En cajas de ahorro: {saldos.map((s) => formatMoney(s.total, s.moneda)).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
