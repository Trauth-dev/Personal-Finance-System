"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { MonthSelector } from "@/components/personal/month-selector"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { formatGuaranies, getParaguayDate } from "@/lib/utils"
import { getNombreCategoriaDisplay, getColorCategoria } from "@/lib/categorias-egreso"
import {
  Info,
  Wallet,
  Receipt,
  TrendingDown,
  AlertTriangle,
  Scale,
  List,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronRight as ChevronRightIcon,
  Home,
  ShoppingCart,
  GraduationCap,
  Car,
  Heart,
  Gift,
  PiggyBank,
  Briefcase,
  Landmark,
  Smile,
  LineChart,
  ShieldAlert,
  User,
  Tag,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

interface TransaccionDetalle {
  id: string
  fecha: string
  concepto: string
  subcategoria: string
  monto: number
  tipoCategoria: string
}

interface SubcategoriaDetalle {
  nombre: string
  presupuestado: number
  gastado: number
}

interface CategoriaComparativa {
  nombre: string
  presupuestado: number
  gastado: number
  diferencia: number
  porcentaje: number
  transacciones?: TransaccionDetalle[]
  subcategorias?: SubcategoriaDetalle[]
}

interface Props {
  perfilId: string
}

export function PresupuestoVsRealidad({ perfilId }: Props) {
  const today = getParaguayDate()
  const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`

  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<CategoriaComparativa[]>([])
  const [totalPresupuestado, setTotalPresupuestado] = useState(0)
  const [totalGastado, setTotalGastado] = useState(0)
  const [metaSalarioTotal, setMetaSalarioTotal] = useState(0)
  const [showAll, setShowAll] = useState(true)
  const [vistaDetallada, setVistaDetallada] = useState(false)
  const [categoriasExpandidas, setCategoriasExpandidas] = useState<Set<string>>(new Set())
  const [txExpandidas, setTxExpandidas] = useState<Set<string>>(new Set())
  // Categoria seleccionada en la vista Resumido (panel de detalle lateral)
  const [selectedResumen, setSelectedResumen] = useState<string | null>(null)
  // Ancla para autoscroll a "Categorías del presupuesto"
  const categoriasTablaRef = useRef<HTMLDivElement>(null)
  // Ancla al panel de detalle (para autoscroll en mobile)
  const panelDetalleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadData()
  }, [selectedMonth, perfilId])

  const loadData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [year, month] = selectedMonth.split("-").map(Number)
    const primerDia = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const ultimoDia = new Date(year, month, 0).toISOString().split("T")[0]

    // Fetch presupuesto_mensual
    const { data: presupuestoMensual } = await supabase
      .from("presupuesto_mensual")
      .select("*")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })
      .limit(1)

    const { data: tiposCategorias } = await supabase
      .from("tipos_categoria_egreso")
      .select("id, nombre")
      .eq("perfil_id", perfilId)

    // Obtener montos exactos desde presupuesto_categorias
    const { data: presupuestoCategorias } = await supabase
      .from("presupuesto_categorias")
      .select("categoria, monto_presupuestado")
      .eq("perfil_id", perfilId)
      .gte("mes", primerDia)
      .lte("mes", ultimoDia)

    // Obtener relación categorias_egreso -> tipos_categoria_egreso
    const { data: categoriasEgreso } = await supabase
      .from("categorias_egreso")
      .select("nombre, tipos_categoria_egreso!inner(nombre)")
      .eq("perfil_id", perfilId)

    // Crear mapa de subcategoría -> tipo principal
    const subcategoriaToTipo: Record<string, string> = {}
    categoriasEgreso?.forEach((ce: any) => {
      subcategoriaToTipo[ce.nombre] = ce.tipos_categoria_egreso?.nombre || ""
    })

    // Sumar montos por tipo de categoría desde presupuesto_categorias
    const montosPorTipo: Record<string, number> = {}
    presupuestoCategorias?.forEach((pc: any) => {
      const tipoPrincipal = subcategoriaToTipo[pc.categoria]
      if (tipoPrincipal) {
        montosPorTipo[tipoPrincipal] = (montosPorTipo[tipoPrincipal] || 0) + Number(pc.monto_presupuestado || 0)
      }
    })

    const { data: egresos } = await supabase
      .from("egresos")
      .select("id, monto, fecha, concepto, tipo_categoria_id, tipo_categoria:tipos_categoria_egreso(nombre), categoria_egreso:categorias_egreso(nombre)")
      .eq("perfil_id", perfilId)
      .gte("fecha", primerDia)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })

    const presupuesto = presupuestoMensual?.[0]
    const metaSalario = Number(presupuesto?.meta_salario || 0)

    // Agrupar gastos y transacciones por categoría
    const gastosMap = new Map<string, number>()
    const transaccionesPorCategoria = new Map<string, TransaccionDetalle[]>()
    
    egresos?.forEach((e: any) => {
      const tipoCategoria = e.tipo_categoria?.nombre || "Sin categoria"
      gastosMap.set(tipoCategoria, (gastosMap.get(tipoCategoria) || 0) + Number(e.monto))
      
      // Agregar transacción al listado
      const transaccion: TransaccionDetalle = {
        id: e.id,
        fecha: e.fecha,
        concepto: e.concepto || "Sin descripción",
        subcategoria: e.categoria_egreso?.nombre || "General",
        monto: Number(e.monto),
        tipoCategoria: tipoCategoria
      }
      
      if (!transaccionesPorCategoria.has(tipoCategoria)) {
        transaccionesPorCategoria.set(tipoCategoria, [])
      }
      transaccionesPorCategoria.get(tipoCategoria)!.push(transaccion)
    })

    // Desglose por subcategoria (usa las MISMAS fuentes ya consultadas)
    // tipo -> (subcategoria -> presupuestado)
    const subcatBudget = new Map<string, Map<string, number>>()
    presupuestoCategorias?.forEach((pc: any) => {
      const tipo = subcategoriaToTipo[pc.categoria]
      if (!tipo) return
      if (!subcatBudget.has(tipo)) subcatBudget.set(tipo, new Map())
      const m = subcatBudget.get(tipo)!
      m.set(pc.categoria, (m.get(pc.categoria) || 0) + Number(pc.monto_presupuestado || 0))
    })
    // tipo -> (subcategoria -> gastado)
    const subcatSpent = new Map<string, Map<string, number>>()
    egresos?.forEach((e: any) => {
      const tipo = e.tipo_categoria?.nombre || "Sin categoria"
      const subcat = e.categoria_egreso?.nombre || "General"
      if (!subcatSpent.has(tipo)) subcatSpent.set(tipo, new Map())
      const m = subcatSpent.get(tipo)!
      m.set(subcat, (m.get(subcat) || 0) + Number(e.monto))
    })
    const buildSubcats = (tipo: string): SubcategoriaDetalle[] => {
      const budgetM = subcatBudget.get(tipo) || new Map<string, number>()
      const spentM = subcatSpent.get(tipo) || new Map<string, number>()
      const names = new Set<string>([...budgetM.keys(), ...spentM.keys()])
      return Array.from(names)
        .map((nombre) => ({
          nombre,
          presupuestado: budgetM.get(nombre) || 0,
          gastado: spentM.get(nombre) || 0,
        }))
        .sort((a, b) => b.gastado - a.gastado || b.presupuestado - a.presupuestado)
    }

    const categoriasResult: CategoriaComparativa[] = []
    let sumPresupuestado = 0
    let sumGastado = 0
    const nombresUsados = new Set<string>()

    if (tiposCategorias) {
      for (const tipo of tiposCategorias) {
        // Usar monto exacto desde presupuesto_categorias
        const montoPresupuestado = montosPorTipo[tipo.nombre] || 0
        const montoGastado = gastosMap.get(tipo.nombre) || 0
        const diferencia = montoPresupuestado - montoGastado
        const porcentaje = montoPresupuestado > 0 ? (montoGastado / montoPresupuestado) * 100 : montoGastado > 0 ? 100 : 0

        categoriasResult.push({
          nombre: tipo.nombre,
          presupuestado: montoPresupuestado,
          gastado: montoGastado,
          diferencia,
          porcentaje,
          transacciones: transaccionesPorCategoria.get(tipo.nombre) || [],
          subcategorias: buildSubcats(tipo.nombre),
        })

        sumPresupuestado += montoPresupuestado
        sumGastado += montoGastado
        nombresUsados.add(tipo.nombre)
      }
    }

    gastosMap.forEach((monto, nombre) => {
      if (!nombresUsados.has(nombre)) {
        categoriasResult.push({
          nombre,
          presupuestado: 0,
          gastado: monto,
          diferencia: -monto,
          porcentaje: 100,
          transacciones: transaccionesPorCategoria.get(nombre) || [],
          subcategorias: buildSubcats(nombre),
        })
        sumGastado += monto
      }
    })

    categoriasResult.sort((a, b) => b.presupuestado - a.presupuestado)

    setCategorias(categoriasResult)
    setTotalPresupuestado(sumPresupuestado)
    setTotalGastado(sumGastado)
    setMetaSalarioTotal(metaSalario)
    setLoading(false)
  }

  // Use metaSalarioTotal (actual loaded budget) for the top-level summary
  const presupuestoDisplay = metaSalarioTotal > 0 ? metaSalarioTotal : totalPresupuestado
  const diferencia = presupuestoDisplay - totalGastado
  const porcentajeGeneral = presupuestoDisplay > 0 ? (totalGastado / presupuestoDisplay) * 100 : 0
  const isExceeded = diferencia < 0

  // Filter categories based on showAll toggle
  const filteredCategorias = showAll
    ? categorias
    : categorias.filter((c) => c.gastado > 0 || c.presupuestado > 0)

  const categoriasConMovimiento = categorias.filter((c) => c.gastado > 0)
  const categoriasSinMovimiento = categorias.filter((c) => c.gastado === 0 && c.presupuestado === 0)

  // Find best and worst categories
  const categoriasConPresupuesto = categorias.filter((c) => c.presupuestado > 0)
  const mejorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((best, c) => c.porcentaje < best.porcentaje ? c : best, categoriasConPresupuesto[0])
    : null
  const peorCategoria = categoriasConPresupuesto.length > 0
    ? categoriasConPresupuesto.reduce((worst, c) => c.porcentaje > worst.porcentaje ? c : worst, categoriasConPresupuesto[0])
    : null

  const getStatusInfo = (porcentaje: number) => {
    if (porcentaje <= 80) return { ring: "#14b8a6", label: "CONTROLADO", labelBg: "bg-teal-100 text-teal-700", cardBg: "", barColor: "#14b8a6" }
    if (porcentaje <= 100) return { ring: "#eab308", label: "ATENTO", labelBg: "bg-yellow-100 text-yellow-700", cardBg: "", barColor: "#eab308" }
    return { ring: "#ef4444", label: "EXCEDIDO", labelBg: "bg-red-100 text-red-700", cardBg: "bg-gradient-to-br from-red-50 to-red-100/60 border-red-200", barColor: "#ef4444" }
  }

  // Icono por categoria (clave interna de BD). Solo visual.
  const ICONO_CATEGORIA: Record<string, LucideIcon> = {
    "Gastos Vivienda": Home,
    "Gastos Personales": User,
    Supermercado: ShoppingCart,
    "Pago Deudas": Landmark,
    Salud: Heart,
    Disfrute: Smile,
    Transportes: Car,
    Educacion: GraduationCap,
    Educación: GraduationCap,
    Donacion: Gift,
    Donación: Gift,
    Ahorro: PiggyBank,
    "Ahorro 2025": PiggyBank,
    "Gastos Varios": ShieldAlert,
    "Libertad Financiera": LineChart,
    "Gastos del Negocio": Briefcase,
  }
  const getIconoCategoria = (nombre: string): LucideIcon => ICONO_CATEGORIA[nombre] ?? Tag

  // "Ver transacciones de X": despliega la fila en "Categorías del presupuesto"
  // y hace autoscroll hacia esa seccion.
  const verTransaccionesCategoria = (nombre: string) => {
    setCategoriasExpandidas((prev) => {
      const s = new Set(prev)
      s.add(`resumen_${nombre}`)
      return s
    })
    // Espera un frame para que el panel se expanda antes de hacer scroll
    setTimeout(() => {
      categoriasTablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 120)
  }

  // Selecciona/deselecciona una categoria en Resumido. En pantallas chicas
  // (donde el panel se muestra abajo) hace autoscroll al panel de detalle.
  const seleccionarResumen = (nombre: string) => {
    setSelectedResumen((prev) => {
      const next = prev === nombre ? null : nombre
      if (next && typeof window !== "undefined" && window.innerWidth < 1280) {
        setTimeout(() => {
          panelDetalleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 120)
      }
      return next
    })
  }

  const toggleCategoriaExpandida = (nombre: string) => {
    setCategoriasExpandidas(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nombre)) {
        newSet.delete(nombre)
      } else {
        newSet.add(nombre)
      }
      return newSet
    })
  }

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha + "T00:00:00")
    return date.toLocaleDateString("es-PY", { day: "2-digit", month: "short" })
  }

  // Etiqueta del mes seleccionado, ej: "Julio 2026"
  const mesLabel = (() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    const nombre = new Date(y, m - 1, 1).toLocaleDateString("es-PY", { month: "long" })
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} ${y}`
  })()

  // Color del badge de % de uso segun nivel de consumo
  const badgePctClass = (pct: number) => {
    if (pct <= 0) return "bg-slate-100 text-slate-400"
    if (pct < 80) return "bg-amber-50 text-amber-600"
    if (pct < 100) return "bg-rose-100 text-rose-600"
    return "bg-red-100 text-red-700"
  }

  // Descripcion visible de una transaccion (evita mostrar "Sin descripción")
  const tituloTransaccion = (t: TransaccionDetalle) =>
    !t.concepto || t.concepto === "Sin descripción" ? t.subcategoria : t.concepto

  const toggleVerTodas = (nombre: string) => {
    setTxExpandidas((prev) => {
      const s = new Set(prev)
      s.has(nombre) ? s.delete(nombre) : s.add(nombre)
      return s
    })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Scale className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Presupuesto vs Realidad</h1>
            <p className="text-muted-foreground">Compara lo planificado con lo realmente gastado</p>
          </div>
        </div>
      </div>

      {/* Month selector */}
      <div className="mb-6">
        <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando comparativo...</p>
          </div>
        </div>
      ) : categorias.length === 0 ? (
        <Card className="border-2 border-dashed border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <Scale className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-1">No hay presupuesto configurado</p>
            <p className="text-sm text-muted-foreground">Configura tu presupuesto mensual desde la seccion de Presupuesto para ver la comparacion.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* 3 Summary Cards - matching image style */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {/* Presupuesto Total */}
            <Card className="border-0 bg-gradient-to-br from-slate-600 to-slate-800 text-white shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Presupuesto Total</span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(presupuestoDisplay)}</p>
                <p className="text-xs text-slate-300 mt-1">Planificado para el mes</p>
              </CardContent>
            </Card>

            {/* Gasto Real */}
            <Card className="border-0 bg-gradient-to-br from-teal-600 to-teal-800 text-white shadow-lg">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-200">Gasto Real</span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(totalGastado)}</p>
                <p className="text-xs text-teal-200 mt-1">{porcentajeGeneral.toFixed(1)}% del presupuesto</p>
              </CardContent>
            </Card>

            {/* Diferencia */}
            <Card className={`border-0 shadow-lg text-white ${isExceeded ? "bg-gradient-to-br from-red-600 to-red-800" : "bg-gradient-to-br from-emerald-600 to-emerald-800"}`}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                    {isExceeded ? "Excedido" : "Disponible"}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                    {isExceeded
                      ? <AlertTriangle className="w-5 h-5 text-white" />
                      : <TrendingDown className="w-5 h-5 text-white" />
                    }
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{formatGuaranies(Math.abs(diferencia))}</p>
                <p className="text-xs opacity-80 mt-1">
                  {isExceeded ? `+${porcentajeGeneral.toFixed(1)}% del presupuesto` : "Todavia puedes gastar"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter and View toggles */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-all"
                checked={showAll}
                onCheckedChange={(checked) => setShowAll(checked === true)}
              />
              <Label htmlFor="show-all" className="text-sm text-muted-foreground cursor-pointer select-none">
                Mostrar categorias sin movimientos ({categoriasSinMovimiento.length})
              </Label>
            </div>
            
            {/* Toggle Resumido / Detallado */}
            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVistaDetallada(false)}
                aria-pressed={!vistaDetallada}
                className={`h-8 px-3 font-semibold transition-colors ${
                  !vistaDetallada
                    ? "bg-teal-600 text-white shadow-sm hover:bg-teal-600 hover:text-white"
                    : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Resumido
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVistaDetallada(true)}
                aria-pressed={vistaDetallada}
                className={`h-8 px-3 font-semibold transition-colors ${
                  vistaDetallada
                    ? "bg-indigo-600 text-white shadow-sm hover:bg-indigo-600 hover:text-white"
                    : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                <List className="w-4 h-4 mr-1.5" />
                Detallado
              </Button>
            </div>
          </div>

          {/* Vista Resumido (Cards Grid + Panel de detalle) */}
          {!vistaDetallada && (() => {
            const selectedCat = selectedResumen
              ? filteredCategorias.find((c) => c.nombre === selectedResumen)
              : null

            return (
              <div className="flex flex-col xl:flex-row gap-4 items-start">
                {/* Grilla de tarjetas */}
                <div
                  className={`grid gap-3 flex-1 min-w-0 w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                    selectedCat ? "xl:grid-cols-3" : "xl:grid-cols-4"
                  }`}
                >
                  {filteredCategorias.map((cat) => {
                    const status = getStatusInfo(cat.porcentaje)
                    const usedPct = Math.min(cat.porcentaje, 100)
                    const remainPct = 100 - usedPct
                    const exceeded = cat.porcentaje > 100
                    const hasNoActivity = cat.gastado === 0 && cat.presupuestado === 0
                    const isSelected = selectedResumen === cat.nombre
                    const color = exceeded ? "#ef4444" : getColorCategoria(cat.nombre)
                    const Icon = getIconoCategoria(cat.nombre)
                    const nombre = getNombreCategoriaDisplay(cat.nombre)
                    const donutData = [
                      { name: "Usado", value: usedPct || 0.01 },
                      { name: "Restante", value: remainPct },
                    ]

                    // Tarjeta compacta para categorias sin actividad
                    if (hasNoActivity) {
                      return (
                        <button
                          key={cat.nombre}
                          type="button"
                          onClick={() => seleccionarResumen(cat.nombre)}
                          className={`text-left rounded-xl border p-3 bg-white transition-all hover:shadow-sm ${
                            isSelected ? "ring-2 ring-teal-500 border-teal-300" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a` }}>
                                <Icon className="w-4 h-4" style={{ color }} />
                              </span>
                              <h3 className="text-sm font-semibold text-slate-600 truncate">{nombre}</h3>
                            </div>
                            <span className="text-[11px] text-slate-400 flex-shrink-0">0% usado</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">{formatGuaranies(cat.gastado)} / {formatGuaranies(cat.presupuestado)}</p>
                          <p className="text-xs text-slate-400">{formatGuaranies(cat.diferencia)} restantes</p>
                        </button>
                      )
                    }

                    // Texto y estilo del pie de tarjeta
                    let footerText: string
                    let footerClass: string
                    if (cat.diferencia < 0) {
                      footerText = `Excedido ${formatGuaranies(Math.abs(cat.diferencia))}`
                      footerClass = "bg-red-50 text-red-600"
                    } else if (cat.presupuestado > 0 && cat.diferencia === 0) {
                      footerText = "Presupuesto completamente usado"
                      footerClass = "bg-amber-50 text-amber-700"
                    } else {
                      footerText = `Te quedan ${formatGuaranies(cat.diferencia)}`
                      footerClass = "bg-emerald-50 text-emerald-700"
                    }

                    return (
                      <button
                        key={cat.nombre}
                        type="button"
                        onClick={() => seleccionarResumen(cat.nombre)}
                        className={`text-left rounded-xl border p-4 bg-white transition-all hover:shadow-md ${
                          isSelected
                            ? "ring-2 ring-teal-500 border-teal-300"
                            : exceeded
                              ? "border-red-200"
                              : "border-slate-200"
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a` }}>
                              <Icon className="w-4 h-4" style={{ color }} />
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 truncate">{nombre}</h3>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${status.labelBg}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Donut */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-[104px] h-[104px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={donutData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={38}
                                  outerRadius={50}
                                  startAngle={90}
                                  endAngle={-270}
                                  paddingAngle={2}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  <Cell fill={color} />
                                  <Cell fill="#e5e7eb" />
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-base font-bold leading-none" style={{ color }}>
                                {cat.porcentaje > 999 ? "+999%" : `${cat.porcentaje.toFixed(cat.porcentaje % 1 === 0 ? 0 : 1)}%`}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">usado</span>
                            </div>
                          </div>
                          <p className="text-base font-bold text-slate-900 mt-2">{formatGuaranies(cat.gastado)}</p>
                          <p className="text-[11px] text-slate-400">Gastado de {formatGuaranies(cat.presupuestado)}</p>
                        </div>

                        {/* Footer pill */}
                        <div className={`mt-3 rounded-lg py-2 px-2 text-center text-xs font-semibold ${footerClass}`}>
                          {footerText}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Panel de detalle (lateral en desktop, abajo en mobile) */}
                {selectedCat && (() => {
                  const cat = selectedCat
                  const exceeded = cat.porcentaje > 100
                  const color = exceeded ? "#ef4444" : getColorCategoria(cat.nombre)
                  const Icon = getIconoCategoria(cat.nombre)
                  const nombre = getNombreCategoriaDisplay(cat.nombre)
                  const usedPct = Math.min(cat.porcentaje, 100)
                  const donutData = [
                    { name: "Usado", value: usedPct || 0.01 },
                    { name: "Restante", value: 100 - usedPct },
                  ]
                  const txList = cat.transacciones || []

                  return (
                    <div ref={panelDetalleRef} className="w-full xl:w-[380px] xl:flex-shrink-0 xl:sticky xl:top-4 scroll-mt-20">
                      <Card className="border border-slate-200 bg-white">
                        <CardContent className="p-5">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1a` }}>
                                <Icon className="w-5 h-5" style={{ color }} />
                              </span>
                              <h3 className="text-lg font-bold text-slate-900 truncate">{nombre}</h3>
                            </div>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgePctClass(cat.porcentaje)}`}>
                              {cat.porcentaje.toFixed(cat.porcentaje % 1 === 0 ? 0 : 1)}% usado
                            </span>
                          </div>

                          {/* Donut + stats */}
                          <div className="flex items-center gap-4">
                            <div className="relative w-[128px] h-[128px] flex-shrink-0">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={46}
                                    outerRadius={62}
                                    startAngle={90}
                                    endAngle={-270}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    <Cell fill={color} />
                                    <Cell fill="#e5e7eb" />
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                                <span className="text-sm font-bold text-slate-900 leading-tight">{formatGuaranies(cat.gastado)}</span>
                                <span className="text-[10px] text-slate-400">Gastado</span>
                              </div>
                            </div>
                            <div className="flex-1 space-y-2 text-sm min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">Presupuesto</span>
                                <span className="font-semibold text-slate-800">{formatGuaranies(cat.presupuestado)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">Gastado</span>
                                <span className={`font-semibold ${exceeded ? "text-red-600" : "text-slate-800"}`}>{formatGuaranies(cat.gastado)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">{cat.diferencia >= 0 ? "Te queda" : "Excedido"}</span>
                                <span className={`font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                  {cat.diferencia >= 0 ? "" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Aviso segun estado */}
                          {exceeded ? (
                            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-3">
                              <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Superaste el presupuesto asignado
                              </p>
                              <p className="text-[11px] text-red-600/80 mt-0.5 pl-6">Revisa tus gastos en esta categoría para el próximo mes.</p>
                            </div>
                          ) : cat.presupuestado > 0 && cat.diferencia === 0 ? (
                            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 p-3">
                              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Has utilizado todo el presupuesto asignado
                              </p>
                              <p className="text-[11px] text-amber-600/80 mt-0.5 pl-6">Considera ajustar tu presupuesto o esperar al próximo mes.</p>
                            </div>
                          ) : null}

                          {/* Detalle */}
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <h4 className="text-sm font-bold text-slate-800 mb-2">Detalle de {nombre}</h4>
                            {txList.length > 0 ? (
                              <div className="space-y-0">
                                <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-400 uppercase pb-1">
                                  <span className="col-span-6">Concepto</span>
                                  <span className="col-span-3">Fecha</span>
                                  <span className="col-span-3 text-right">Monto</span>
                                </div>
                                {txList.map((t) => (
                                  <div key={t.id} className="grid grid-cols-12 gap-2 text-xs py-1.5 border-t border-slate-50">
                                    <span className="col-span-6 truncate text-slate-700">{tituloTransaccion(t)}</span>
                                    <span className="col-span-3 text-slate-400">{formatFecha(t.fecha)}</span>
                                    <span className="col-span-3 text-right font-medium text-slate-800">{formatGuaranies(t.monto)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400">No hay transacciones en esta categoría.</p>
                            )}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                              <span className="font-semibold text-slate-600">{cat.diferencia >= 0 ? "Sobrante del presupuesto" : "Excedido del presupuesto"}</span>
                              <span className={`font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                              </span>
                            </div>
                          </div>

                          {/* Ver transacciones */}
                          <button
                            type="button"
                            onClick={() => verTransaccionesCategoria(cat.nombre)}
                            className="mt-4 w-full flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            Ver transacciones de {nombre}
                            <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                          </button>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}
              </div>
            )
          })()}

          {/* Vista Detallada (Lista expandible) */}
          {vistaDetallada && (
            <div className="space-y-3">
              {filteredCategorias.map((cat) => {
                const status = getStatusInfo(cat.porcentaje)
                const exceeded = cat.porcentaje > 100
                const isExpanded = categoriasExpandidas.has(cat.nombre)
                const hasTransactions = cat.transacciones && cat.transacciones.length > 0

                return (
                  <Collapsible
                    key={cat.nombre}
                    open={isExpanded}
                    onOpenChange={() => toggleCategoriaExpandida(cat.nombre)}
                  >
                    <Card className={`border transition-all ${
                      exceeded
                        ? "bg-gradient-to-br from-red-50 to-red-100/60 border-red-200"
                        : "bg-white dark:bg-slate-50 border-slate-200"
                    }`}>
                      <CollapsibleTrigger asChild>
                        <CardContent className="py-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {hasTransactions ? (
                                isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-slate-400" />
                                )
                              ) : (
                                <div className="w-5 h-5" />
                              )}
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.ring }} />
                              <h3 className="text-sm font-bold text-slate-900">{getNombreCategoriaDisplay(cat.nombre)}</h3>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status.labelBg}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-xs">
                              <div className="text-right">
                                <span className="text-slate-500">Presup.</span>
                                <span className="ml-2 font-semibold text-slate-800">{formatGuaranies(cat.presupuestado)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-slate-500">Gastado</span>
                                <span className={`ml-2 font-bold ${exceeded ? "text-red-600" : "text-slate-800"}`}>
                                  {formatGuaranies(cat.gastado)}
                                </span>
                              </div>
                              <div className="text-right min-w-[100px]">
                                <span className="text-slate-500">{cat.diferencia >= 0 ? "Disponible" : "Excedido"}</span>
                                <span className={`ml-2 font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                  {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                                </span>
                              </div>
                              <div className="w-16 text-right">
                                <span className={`font-bold ${exceeded ? "text-red-600" : "text-teal-600"}`}>
                                  {cat.porcentaje.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        {hasTransactions && (
                          <div className="border-t border-slate-200">
                            <div className="px-6 py-2 bg-slate-50/80">
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 uppercase">
                                <div className="col-span-8">Subcategoría</div>
                                <div className="col-span-4 text-right">Monto</div>
                              </div>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {cat.transacciones!.map((trans) => (
                                <div key={trans.id} className="px-6 py-2.5 hover:bg-slate-50/50 transition-colors">
                                  <div className="grid grid-cols-12 gap-2 text-xs items-center">
                                    <div className="col-span-8 min-w-0">
                                      <span className="block truncate font-medium text-slate-800">{trans.subcategoria}</span>
                                      <span className="text-[10px] text-slate-400">{formatFecha(trans.fecha)}</span>
                                    </div>
                                    <div className="col-span-4 text-right font-semibold text-slate-800">
                                      {formatGuaranies(trans.monto)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="px-6 py-2.5 bg-slate-100/80 border-t border-slate-200 space-y-1.5">
                              <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-8 font-bold text-slate-700">Total gastado</div>
                                <div className="col-span-4 text-right font-bold text-slate-900">
                                  {formatGuaranies(cat.gastado)}
                                </div>
                              </div>
                              <div className="grid grid-cols-12 gap-2 text-xs">
                                <div className="col-span-8 font-bold text-slate-700">
                                  {cat.diferencia >= 0 ? "Sobrante del presupuesto" : "Excedido del presupuesto"}
                                </div>
                                <div className={`col-span-4 text-right font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                  {cat.diferencia >= 0 ? "+" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {!hasTransactions && (
                          <div className="px-6 py-4 border-t border-slate-200 text-center">
                            <p className="text-sm text-slate-500">No hay transacciones en esta categoría</p>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>
          )}

          {/* Resumen por categoria */}
          <Card className="border border-slate-200 bg-white dark:bg-slate-50 shadow-sm">
            <CardContent className="p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 mb-5">
                <h3 className="text-lg font-bold text-slate-900">Resumen por categoría</h3>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  {mesLabel}
                </div>
              </div>

              {/* 3 tarjetas resumen */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Total presupuestado</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatGuaranies(presupuestoDisplay)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{presupuestoDisplay > 0 ? "100% del plan mensual" : "Sin plan definido"}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">Total gastado</span>
                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-rose-600" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{formatGuaranies(totalGastado)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{porcentajeGeneral.toFixed(1)}% del plan mensual</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-500">{isExceeded ? "Excedido del mes" : "Disponible del mes"}</span>
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <PieChartIcon className="w-4 h-4 text-teal-600" />
                    </div>
                  </div>
                  <p className={`text-xl font-bold ${isExceeded ? "text-red-600" : "text-slate-900"}`}>{formatGuaranies(Math.abs(diferencia))}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{Math.max(0, 100 - porcentajeGeneral).toFixed(1)}% del plan mensual</p>
                </div>
              </div>

              {/* Categorias del presupuesto */}
              <div ref={categoriasTablaRef} className="rounded-xl border border-slate-200 overflow-hidden scroll-mt-24">
                <div className="px-4 py-3 border-b border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900">Categorías del presupuesto</h4>
                </div>
                <div className="overflow-x-auto">
                  <div className="min-w-[720px]">
                    {/* Header de columnas */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      <span className="w-4 flex-shrink-0" />
                      <span className="w-40 flex-shrink-0">Categoria</span>
                      <span className="flex-1">Gastado de presupuestado</span>
                      <span className="w-32 text-right flex-shrink-0">Disponible</span>
                      <span className="w-16 text-right flex-shrink-0">% de uso</span>
                    </div>

                    {filteredCategorias.map((cat) => {
                      const status = getStatusInfo(cat.porcentaje)
                      const isExpanded = categoriasExpandidas.has(`resumen_${cat.nombre}`)
                      const hasDetalle =
                        (cat.transacciones && cat.transacciones.length > 0) ||
                        (cat.subcategorias && cat.subcategorias.length > 0)
                      const barPct = Math.min(cat.porcentaje, 100)
                      const barColor = cat.porcentaje > 100 ? "#ef4444" : "#f59e0b"
                      const verTodas = txExpandidas.has(cat.nombre)
                      const txList = cat.transacciones || []
                      const txVisible = verTodas ? txList : txList.slice(0, 4)

                      return (
                        <div key={cat.nombre} className="border-t border-slate-100">
                          {/* Fila principal */}
                          <div
                            className={`flex items-center gap-3 px-4 py-2.5 ${hasDetalle ? "cursor-pointer hover:bg-slate-50" : ""}`}
                            onClick={() => hasDetalle && toggleCategoriaExpandida(`resumen_${cat.nombre}`)}
                          >
                            <span className="w-4 flex-shrink-0">
                              {hasDetalle &&
                                (isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                ))}
                            </span>
                            <div className="w-40 flex-shrink-0 flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: status.ring }} />
                              <span className="text-sm font-medium text-slate-800 truncate">{getNombreCategoriaDisplay(cat.nombre)}</span>
                            </div>
                            <div className="flex-1 flex items-center gap-3 min-w-0">
                              <span className="text-xs whitespace-nowrap text-slate-700 font-semibold w-44 text-right flex-shrink-0">
                                {formatGuaranies(cat.gastado)} <span className="text-slate-400 font-normal">de {formatGuaranies(cat.presupuestado)}</span>
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: barColor }} />
                              </div>
                            </div>
                            <span className={`w-32 text-right flex-shrink-0 text-xs font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                              {cat.diferencia >= 0 ? "" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                            </span>
                            <span className="w-16 text-right flex-shrink-0">
                              <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ${badgePctClass(cat.porcentaje)}`}>
                                {cat.porcentaje.toFixed(1)}%
                              </span>
                            </span>
                          </div>

                          {/* Panel expandido */}
                          {isExpanded && hasDetalle && (
                            <div className="px-4 pb-4 pt-1 bg-slate-50/40">
                              <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
                                {/* Subcategorias */}
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <h5 className="text-xs font-bold text-slate-700 mb-2">Subcategorias</h5>
                                  <div className="space-y-1.5">
                                    {(cat.subcategorias || []).map((sc) => {
                                      const scPct = sc.presupuestado > 0 ? (sc.gastado / sc.presupuestado) * 100 : sc.gastado > 0 ? 100 : 0
                                      return (
                                        <div key={sc.nombre} className="flex items-center gap-2 text-xs">
                                          <span className="text-slate-400">•</span>
                                          <span className="flex-1 truncate text-slate-700">{sc.nombre}</span>
                                          <span className="whitespace-nowrap text-slate-600">
                                            {formatGuaranies(sc.gastado)} <span className="text-slate-400">de {formatGuaranies(sc.presupuestado)}</span>
                                          </span>
                                          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgePctClass(scPct)}`}>{scPct.toFixed(0)}%</span>
                                        </div>
                                      )
                                    })}
                                    {(cat.subcategorias || []).length === 0 && (
                                      <p className="text-xs text-slate-400">Sin subcategorias registradas</p>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                                    <span className="font-semibold text-slate-600">{cat.diferencia >= 0 ? "Sobrante del presupuesto" : "Excedido del presupuesto"}</span>
                                    <span className={`font-bold ${cat.diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                                      {cat.diferencia >= 0 ? "" : "-"}{formatGuaranies(Math.abs(cat.diferencia))}
                                    </span>
                                  </div>
                                </div>

                                {/* Transacciones recientes */}
                                <div className="rounded-lg border border-slate-200 bg-white p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-xs font-bold text-slate-700">Transacciones recientes</h5>
                                    {txList.length > 4 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleVerTodas(cat.nombre)
                                        }}
                                        className="text-[11px] font-medium text-teal-600 hover:text-teal-700"
                                      >
                                        {verTodas ? "Ver menos" : "Ver todas"}
                                      </button>
                                    )}
                                  </div>
                                  {txVisible.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {txVisible.map((t) => (
                                        <div key={t.id} className="flex items-center gap-2 text-xs">
                                          <span className="text-slate-400 whitespace-nowrap w-12 flex-shrink-0">{formatFecha(t.fecha)}</span>
                                          <span className="flex-1 truncate text-slate-700">{tituloTransaccion(t)}</span>
                                          <span className="whitespace-nowrap font-medium text-slate-800">{formatGuaranies(t.monto)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-400">No hay transacciones en esta categoría</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* TOTAL */}
                    <div className="flex items-center gap-3 px-4 py-3 border-t-2 border-slate-200 bg-slate-50">
                      <span className="w-4 flex-shrink-0" />
                      <span className="w-40 flex-shrink-0 text-sm font-bold text-slate-900">TOTAL</span>
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <span className="text-xs whitespace-nowrap text-slate-900 font-bold w-44 text-right flex-shrink-0">
                          {formatGuaranies(totalGastado)} <span className="text-slate-400 font-normal">de {formatGuaranies(presupuestoDisplay)}</span>
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(porcentajeGeneral, 100)}%`, backgroundColor: porcentajeGeneral > 100 ? "#ef4444" : "#f59e0b" }} />
                        </div>
                      </div>
                      <span className={`w-32 text-right flex-shrink-0 text-xs font-bold ${diferencia >= 0 ? "text-teal-600" : "text-red-600"}`}>
                        {diferencia >= 0 ? "" : "-"}{formatGuaranies(Math.abs(diferencia))}
                      </span>
                      <span className="w-16 text-right flex-shrink-0">
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {porcentajeGeneral.toFixed(1)}%
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insight Card */}
          {mejorCategoria && peorCategoria && (
            <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">Insight del Mes</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Tu categoria mas controlada es <span className="font-bold text-teal-600">{getNombreCategoriaDisplay(mejorCategoria.nombre)}</span> ({mejorCategoria.porcentaje.toFixed(1)}% usado).
                      {peorCategoria.nombre !== mejorCategoria.nombre && (
                        <>
                          {" "}Tu categoria {peorCategoria.porcentaje > 100 ? "mas excedida" : "con mayor uso"} es{" "}
                          <span className={`font-bold ${peorCategoria.porcentaje > 100 ? "text-red-600" : "text-yellow-600"}`}>
                            {getNombreCategoriaDisplay(peorCategoria.nombre)}
                          </span>{" "}
                          ({peorCategoria.porcentaje.toFixed(1)}%).
                        </>
                      )}
                      {diferencia >= 0
                        ? ` En general, estas dentro del presupuesto con ${formatGuaranies(diferencia)} disponibles.`
                        : ` Atencion: has excedido el presupuesto general por ${formatGuaranies(Math.abs(diferencia))}.`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
