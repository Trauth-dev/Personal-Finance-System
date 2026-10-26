import Link from "next/link"
import { redirect } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  ChevronRight,
  Database,
  Package,
  Plus,
  Receipt,
  ShoppingBasket,
  ShoppingCart,
  TrendingUp,
  Users,
  CreditCard,
} from "lucide-react"
import { DashboardHeader } from "@/components/dashboard-header"
import { KpiCard } from "@/components/empresarial/panel/kpi-card"
import { AccesoCard } from "@/components/empresarial/panel/acceso-card"
import { createClient } from "@/lib/supabase/server"

export const revalidate = 0

const MESES_SERIE = 6

type FilaMonto = { fecha: string; monto?: number | null; total?: number | null }

function claveMes(fecha: Date) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`
}

function sumarPorMes(filas: FilaMonto[] | null, meses: string[], campo: "monto" | "total") {
  const totales = new Map(meses.map((m) => [m, 0]))
  for (const fila of filas ?? []) {
    const mes = fila.fecha?.slice(0, 7)
    if (totales.has(mes)) totales.set(mes, (totales.get(mes) ?? 0) + Number(fila[campo] ?? 0))
  }
  return meses.map((m) => totales.get(m) ?? 0)
}

function variacion(serie: number[]) {
  const actual = serie[serie.length - 1]
  const previo = serie[serie.length - 2]
  if (!previo) return null
  return Math.round(((actual - previo) / Math.abs(previo)) * 100)
}

export default async function PanelEmpresarialPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [{ data: perfil }, { data: cuenta }] = await Promise.all([
    supabase.from("perfiles").select("id").eq("user_id", user.id).eq("tipo", "empresarial").maybeSingle(),
    supabase.from("profiles").select("nombre_completo").eq("id", user.id).maybeSingle(),
  ])

  if (!perfil) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Panel Empresarial" description="Gestión completa de tu negocio" />
        <div className="p-6">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6">
            <p className="text-foreground">Todavía no tenés un perfil Empresarial creado.</p>
            <Link href="/dashboard/perfiles" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Crear perfil Empresarial
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const hoy = new Date()
  const meses = Array.from({ length: MESES_SERIE }, (_, i) =>
    claveMes(new Date(hoy.getFullYear(), hoy.getMonth() - (MESES_SERIE - 1 - i), 1)),
  )
  const desde = `${meses[0]}-01`

  const [ingresosRes, egresosRes, ventasPendRes, comprasPendRes, inventarioRes] = await Promise.all([
    supabase.from("ingresos").select("fecha, monto").eq("perfil_id", perfil.id).gte("fecha", desde),
    supabase.from("egresos").select("fecha, monto").eq("perfil_id", perfil.id).gte("fecha", desde),
    supabase.from("ventas").select("fecha, total").eq("perfil_id", perfil.id).eq("estado_pago", "pendiente").gte("fecha", desde),
    supabase.from("compras").select("fecha, total").eq("perfil_id", perfil.id).eq("estado_pago", "pendiente").gte("fecha", desde),
    supabase.from("inventario").select("nombre, stock_actual, stock_minimo").eq("perfil_id", perfil.id).eq("activo", true),
  ])

  // Ingresos/costos del mes = movimientos de caja + ventas/compras pendientes (devengado).
  const cobrado = sumarPorMes(ingresosRes.data, meses, "monto")
  const pagado = sumarPorMes(egresosRes.data, meses, "monto")
  const porCobrar = sumarPorMes(ventasPendRes.data, meses, "total")
  const porPagar = sumarPorMes(comprasPendRes.data, meses, "total")

  const ingresos = cobrado.map((v, i) => v + porCobrar[i])
  const costos = pagado.map((v, i) => v + porPagar[i])
  const utilidad = ingresos.map((v, i) => v - costos[i])
  const flujo = cobrado.map((v, i) => v - pagado[i])
  const ultimo = MESES_SERIE - 1

  const stockBajo = (inventarioRes.data ?? []).filter(
    (p) => Number(p.stock_minimo ?? 0) > 0 && Number(p.stock_actual ?? 0) <= Number(p.stock_minimo),
  )

  const nombre = (cuenta?.nombre_completo || user.email?.split("@")[0] || "").split(" ")[0]

  const accionesRapidas = [
    { label: "Nueva Venta", href: "/dashboard/empresarial/ventas?nueva=1", icono: ShoppingCart, principal: true },
    { label: "Nueva Compra", href: "/dashboard/empresarial/compras?nueva=1", icono: ShoppingBasket },
    { label: "Registrar Movimiento", href: "/dashboard/carga", icono: ArrowLeftRight },
    { label: "Agregar Producto", href: "/dashboard/empresarial/inventario?nueva=1", icono: Plus },
  ]

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Panel Empresarial" description="Gestión de tu negocio" />

      <main className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
        <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-lg text-muted-foreground">{`¡Hola, ${nombre}!`}</p>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Panel Empresarial</h1>
            <p className="text-pretty text-muted-foreground">
              Gestiona tu negocio de forma simple y eficiente, todo en un solo lugar.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
            {accionesRapidas.map(({ label, href, icono: Icono, principal }) => (
              <Link
                key={label}
                href={href}
                className={
                  principal
                    ? "flex items-center justify-center gap-3 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
                    : "flex items-center justify-center gap-3 rounded-xl border border-border bg-secondary px-5 py-3.5 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/70"
                }
              >
                <Icono className="size-5 shrink-0" aria-hidden="true" />
                {label}
                {principal && <ChevronRight className="size-4" aria-hidden="true" />}
              </Link>
            ))}
          </div>
        </section>

        <section aria-label="Indicadores del mes" className="tema-oscuro grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard titulo="Ingresos del Mes" valor={ingresos[ultimo]} icono={TrendingUp} tono="violeta" variacion={variacion(ingresos)} serie={ingresos} />
          <KpiCard titulo="Costos del Mes" valor={costos[ultimo]} icono={ShoppingCart} tono="naranja" variacion={variacion(costos)} subirEsMalo serie={costos} />
          <KpiCard titulo="Utilidad Neta" valor={utilidad[ultimo]} icono={Receipt} tono="verde" variacion={variacion(utilidad)} serie={utilidad} />
          <KpiCard titulo="Flujo de Caja" valor={flujo[ultimo]} icono={Database} tono="azul" variacion={variacion(flujo)} serie={flujo} />
        </section>

        {stockBajo.length > 0 && (
          <Link
            href="/dashboard/empresarial/inventario"
            className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {stockBajo.length === 1
                ? `"${stockBajo[0].nombre}" está con stock bajo.`
                : `${stockBajo.length} productos están con stock bajo.`}
            </span>
            <span className="font-semibold">Revisar</span>
          </Link>
        )}

        <section className="flex flex-col gap-5" aria-labelledby="accesos-titulo">
          <div className="flex flex-col gap-1">
            <h2 id="accesos-titulo" className="text-xl font-bold text-foreground">Accesos principales</h2>
            <p className="text-muted-foreground">Todo lo que necesitas para gestionar tu negocio, de forma simple y rápida.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AccesoCard
              titulo="Ventas"
              descripcion="Registra ventas, consulta tus clientes y analiza tu desempeño."
              href="/dashboard/empresarial/ventas"
              icono={ShoppingCart}
              imagen="/empresarial/ventas.png"
              acciones={[
                { label: "Nueva Venta", href: "/dashboard/empresarial/ventas?nueva=1" },
                { label: "Ver historial", href: "/dashboard/empresarial/ventas", secundaria: true },
              ]}
            />
            <AccesoCard
              titulo="Compras"
              descripcion="Registra tus compras, gestiona proveedores y controla tus costos."
              href="/dashboard/empresarial/compras"
              icono={ShoppingBasket}
              imagen="/empresarial/compras.png"
              acciones={[
                { label: "Nueva Compra", href: "/dashboard/empresarial/compras?nueva=1" },
                { label: "Ver historial", href: "/dashboard/empresarial/compras", secundaria: true },
              ]}
            />
            <AccesoCard
              titulo="Inventario"
              descripcion="Controla tus productos, stock y movimientos."
              href="/dashboard/empresarial/inventario"
              icono={Package}
              imagen="/empresarial/inventario.png"
              extra={
                <Link
                  href="/dashboard/empresarial/materias-primas"
                  className="relative mt-auto flex items-center gap-3 rounded-xl border border-border bg-muted/80 p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-primary">
                    <Boxes className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold text-foreground">Materias Primas</span>
                    <span className="text-xs text-muted-foreground">Gestiona tus insumos y materias primas.</span>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              }
            />
            <AccesoCard
              titulo="Proveedores"
              descripcion="Administra tus proveedores y mantén un mejor control de tus compras."
              href="/dashboard/empresarial/proveedores"
              icono={Users}
              imagen="/empresarial/proveedores.png"
              acciones={[{ label: "Ver Proveedores", href: "/dashboard/empresarial/proveedores" }]}
            />
            <AccesoCard
              titulo="Cuentas por Cobrar / Pagar"
              descripcion="Controla tus cuentas pendientes, clientes y proveedores."
              href="/dashboard/empresarial/cuentas"
              icono={CreditCard}
              imagen="/empresarial/cuentas.png"
              acciones={[{ label: "Gestionar Cuentas", href: "/dashboard/empresarial/cuentas" }]}
            />
            <AccesoCard
              titulo="Reportes"
              descripcion="Analiza el rendimiento de tu negocio con reportes claros y en tiempo real."
              href="/dashboard/empresarial/reportes"
              icono={BarChart3}
              imagen="/empresarial/reportes.png"
              acciones={[{ label: "Ver Reportes", href: "/dashboard/empresarial/reportes" }]}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
