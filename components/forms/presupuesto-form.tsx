"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { CheckCircle, AlertCircle, DollarSign, Calendar, Heart, PiggyBank, ShoppingBag, Home, CreditCard, Smile, GraduationCap, TrendingUp, Plus, MoreVertical, Trash2, BarChart3, Wallet, ChevronDown, ChevronUp, ShoppingCart, Car, Stethoscope, User, Briefcase, Save, RotateCcw } from 'lucide-react'
import { getTodayDate, formatGuaranies, normalizarNombre as normalizarNombreUtil } from "@/lib/utils"
import { getColorCategoria } from "@/lib/categorias-egreso"
import { usePerfil } from "@/lib/contexts/perfil-context"

const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

// Configuración de categorías del presupuesto.
// El "label" es el nombre VISIBLE (puede cambiar); CATEGORIA_TO_TIPO mantiene
// el vínculo con el nombre INTERNO en la base de datos (no cambia).
// El orden coincide con la grilla de la sección de Egreso (3 columnas x 4 filas).
const CATEGORIAS_CONFIG = [
  { key: 'pct_gastos_vivienda', label: 'Vivienda', icon: Home, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  { key: 'pct_gastos_personales', label: 'Gastos Personales', icon: User, color: 'text-violet-500', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/30' },
  { key: 'pct_supermercado', label: 'Supermercado', icon: ShoppingCart, color: 'text-lime-500', bgColor: 'bg-lime-500/10', borderColor: 'border-lime-500/30' },
  { key: 'pct_pago_deudas', label: 'Deudas', icon: CreditCard, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  { key: 'pct_salud', label: 'Salud', icon: Stethoscope, color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/30' },
  { key: 'pct_disfrute', label: 'Disfrute', icon: Smile, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  { key: 'pct_transportes', label: 'Transportes', icon: Car, color: 'text-sky-500', bgColor: 'bg-sky-500/10', borderColor: 'border-sky-500/30' },
  { key: 'pct_educacion', label: 'Educación', icon: GraduationCap, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', borderColor: 'border-indigo-500/30' },
  { key: 'pct_donacion', label: 'Generosidad', icon: Heart, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  { key: 'pct_ahorro_2025', label: 'Ahorro / Sueños', icon: PiggyBank, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  { key: 'pct_gastos_varios', label: 'Imprevistos', icon: ShoppingBag, color: 'text-purple-500', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { key: 'pct_libertad_financiera', label: 'Inversión', icon: TrendingUp, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' },
  { key: 'pct_gastos_negocio', label: 'Gastos del Negocio', icon: Briefcase, color: 'text-blue-500', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
]

// Mapeo de clave de presupuesto -> nombre INTERNO de tipo_categoria (no cambia)
const CATEGORIA_TO_TIPO: Record<string, string> = {
  'pct_gastos_vivienda': 'Gastos Vivienda',
  'pct_gastos_personales': 'Gastos Personales',
  'pct_supermercado': 'Supermercado',
  'pct_pago_deudas': 'Pago Deudas',
  'pct_salud': 'Salud',
  'pct_disfrute': 'Disfrute',
  'pct_transportes': 'Transportes',
  'pct_educacion': 'Educacion',
  'pct_donacion': 'Donacion',
  'pct_ahorro_2025': 'Ahorro',
  'pct_gastos_varios': 'Gastos Varios',
  'pct_libertad_financiera': 'Libertad Financiera',
  'pct_gastos_negocio': 'Gastos del Negocio',
}

// Normaliza un nombre de categoría para comparaciones robustas:
// ignora mayúsculas, tildes/acentos y espacios extra. Asi "Donación",
// "donacion" y "Donacion" se consideran la misma categoría y no se duplican.
const normalizarNombre = normalizarNombreUtil

interface SubcategoriaItem {
  id: string
  nombre: string
  monto: number
  categoriaEgresoId?: string // ID en categorias_egreso
  tipoId?: string // ID del tipo_categoria_egreso
}

interface CategoriaData {
  subcategorias: SubcategoriaItem[]
  total: number
  tipoId?: string // ID del tipo en tipos_categoria_egreso
}

interface IngresoCategoria {
  id: string
  nombre: string
  montoPresupuestado: number
}

// ============================================================================
// Autoguardado de BORRADOR (respaldo local, discreto y no destructivo)
// ----------------------------------------------------------------------------
// Guarda un borrador de lo que el usuario va cargando ANTES de presionar
// "Establecer Presupuesto". Vive en localStorage (por perfil + mes + año), no
// toca la base de datos y no bloquea la interfaz. El borrador se conserva hasta
// que el guardado real en la base se confirma con éxito; si el guardado falla,
// el borrador permanece para no perder los datos.
// ============================================================================
const DRAFT_PREFIX = "presupuesto_draft_v1"

function draftKey(perfilId: string, anio: string, mes: string) {
  return `${DRAFT_PREFIX}:${perfilId}:${anio}-${mes}`
}

interface PresupuestoDraft {
  updatedAt: string
  presupuesto: string
  ingresos: Record<string, number>
  categorias: Record<string, number>
}

// Firma canónica de los valores del presupuesto. Sirve para detectar si el
// estado actual difiere de lo realmente guardado en la base (cambios sin
// confirmar) sin comparar objetos manualmente.
function serializePresupuesto(
  presupuesto: string,
  ingresos: IngresoCategoria[],
  categoriasData: Record<string, CategoriaData>,
): string {
  const ing = ingresos
    .map((i) => `${i.id}=${i.montoPresupuestado || 0}`)
    .sort()
    .join("|")
  const cats = Object.entries(categoriasData)
    .map(
      ([k, d]) =>
        `${k}:` +
        d.subcategorias
          .map((s) => `${(s.nombre || "").toLowerCase()}=${s.monto || 0}`)
          .sort()
          .join(","),
    )
    .sort()
    .join("|")
  return `m=${Number(presupuesto) || 0}||${ing}||${cats}`
}

function leerBorrador(perfilId: string, anio: string, mes: string): PresupuestoDraft | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(draftKey(perfilId, anio, mes))
    if (!raw) return null
    return JSON.parse(raw) as PresupuestoDraft
  } catch {
    return null
  }
}

function guardarBorrador(perfilId: string, anio: string, mes: string, draft: PresupuestoDraft) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(draftKey(perfilId, anio, mes), JSON.stringify(draft))
  } catch {
    // Silencioso: si localStorage no está disponible o está lleno, no
    // interrumpimos la experiencia del usuario.
  }
}

function borrarBorrador(perfilId: string, anio: string, mes: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(draftKey(perfilId, anio, mes))
  } catch {
    // no-op
  }
}

export function PresupuestoForm() {
  const { perfilActual } = usePerfil()
  const todayStr = getTodayDate()
  const [presupuesto, setPresupuesto] = useState("")
  const [mesSeleccionado, setMesSeleccionado] = useState(todayStr.slice(5, 7))
  const [anioSeleccionado, setAnioSeleccionado] = useState(todayStr.slice(0, 4))
  const [categoriasData, setCategoriasData] = useState<Record<string, CategoriaData>>({})
  const [tiposCategoriaMap, setTiposCategoriaMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState("")
  const [addingToCategoria, setAddingToCategoria] = useState<string | null>(null)
  const [ingresosCategoria, setIngresosCategoria] = useState<IngresoCategoria[]>([])
  const [showIngresos, setShowIngresos] = useState(true)
  // Autoguardado (borrador): snapshot de lo guardado en BD y estado del borrador
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipDraftRestoreRef = useRef(false)
  const router = useRouter()
  const supabase = createClient()

  // Cargar tipos de categoría y subcategorías del usuario
  const loadUserData = useCallback(async () => {
    if (!perfilActual?.id) return

    setIsLoadingData(true)

    try {
      const primerDiaMes = `${anioSeleccionado}-${mesSeleccionado}-01`

      // Las 4 consultas iniciales son independientes entre sí, así que las
      // ejecutamos en paralelo (Promise.all) en lugar de una tras otra. Esto
      // reduce notablemente la espera: pasa de 4 idas y vueltas encadenadas a 1.
      const [tiposRes, categoriasEgresoRes, presupuestoExistenteRes, itemsPresupuestoRes] = await Promise.all([
        // 1. Tipos de categoría de egreso del usuario
        supabase.from("tipos_categoria_egreso").select("id, nombre").eq("perfil_id", perfilActual.id),
        // 2. Categorías de egreso (subcategorías) del usuario
        supabase.from("categorias_egreso").select("id, nombre, tipo_categoria_id").eq("perfil_id", perfilActual.id),
        // 3. Presupuesto existente para el mes seleccionado
        supabase.from("presupuesto_mensual").select("*").eq("perfil_id", perfilActual.id).eq("fecha", primerDiaMes).single(),
        // 4. Items de presupuesto detallado del mes seleccionado
        supabase.from("presupuesto_categorias").select("*").eq("perfil_id", perfilActual.id).eq("mes", primerDiaMes),
      ])

      const tiposData = tiposRes.data
      const categoriasEgreso = categoriasEgresoRes.data
      const presupuestoExistente = presupuestoExistenteRes.data
      const itemsPresupuesto = itemsPresupuestoRes.data

      // Crear mapa de nombre a ID (clave normalizada para evitar problemas de tildes/mayúsculas)
      const tiposMap: Record<string, string> = {}
      tiposData?.forEach(tipo => {
        tiposMap[normalizarNombre(tipo.nombre)] = tipo.id
      })
      setTiposCategoriaMap(tiposMap)

      // Si el mes seleccionado aún no tiene presupuesto detallado cargado,
      // usar como valores predeterminados los del mes anterior más reciente
      // con datos. Se mantienen editables y se guardan recién al confirmar.
      let itemsParaMontos = itemsPresupuesto
      if (!itemsPresupuesto || itemsPresupuesto.length === 0) {
        const { data: mesesPrevios } = await supabase
          .from("presupuesto_categorias")
          .select("mes")
          .eq("perfil_id", perfilActual.id)
          .lt("mes", primerDiaMes)
          .order("mes", { ascending: false })
          .limit(1)
        const mesPrevio = mesesPrevios?.[0]?.mes
        if (mesPrevio) {
          const { data: itemsPrevios } = await supabase
            .from("presupuesto_categorias")
            .select("*")
            .eq("perfil_id", perfilActual.id)
            .eq("mes", mesPrevio)
          itemsParaMontos = itemsPrevios
        }
      }

      // Inicializar estructura de datos por categoría
      const initialData: Record<string, CategoriaData> = {}
      
      CATEGORIAS_CONFIG.forEach(cat => {
        const tipoNombre = CATEGORIA_TO_TIPO[cat.key]
        initialData[cat.key] = {
          subcategorias: [],
          total: 0,
          tipoId: tiposMap[normalizarNombre(tipoNombre)]
        }
      })

      // Crear mapa de montos guardados por nombre de categoría
      const montosGuardados: Record<string, number> = {}
      itemsParaMontos?.forEach(item => {
        montosGuardados[item.categoria] = Number(item.monto_presupuestado) || 0
      })

      // Siempre cargar las subcategorías desde categorias_egreso
      // y aplicar los montos guardados si existen
      categoriasEgreso?.forEach(catEgreso => {
        // Buscar el tipo de categoría
        const tipoId = catEgreso.tipo_categoria_id
        const tipoNombre = tiposData?.find(t => t.id === tipoId)?.nombre

        if (tipoNombre) {
          // Encontrar a qué categoría de presupuesto pertenece (comparación normalizada)
          const categoriaKey = Object.entries(CATEGORIA_TO_TIPO).find(
            ([, nombre]) => normalizarNombre(nombre) === normalizarNombre(tipoNombre)
          )?.[0]

          if (categoriaKey && initialData[categoriaKey]) {
            // Obtener el monto guardado si existe
            const montoGuardado = montosGuardados[catEgreso.nombre] || 0
            
            initialData[categoriaKey].subcategorias.push({
              id: `egreso_${catEgreso.id}`,
              nombre: catEgreso.nombre,
              monto: montoGuardado,
              categoriaEgresoId: catEgreso.id,
              tipoId: tipoId
            })
            initialData[categoriaKey].total += montoGuardado
          }
        }
      })

      // Cargar presupuesto total si existe; si no, tomar el del mes anterior.
      // (El estado se aplica al final, junto con el posible borrador local.)
      let presupuestoValue = ""
      if (presupuestoExistente) {
        presupuestoValue = String(presupuestoExistente.meta_salario || "")
      } else {
        const { data: metasPrevias } = await supabase
          .from("presupuesto_mensual")
          .select("meta_salario")
          .eq("perfil_id", perfilActual.id)
          .lt("fecha", primerDiaMes)
          .order("fecha", { ascending: false })
          .limit(1)
        const metaPrevia = metasPrevias?.[0]?.meta_salario
        presupuestoValue = metaPrevia ? String(metaPrevia) : ""
      }

      // 5. Cargar categorías de ingresos del usuario
      const { data: categoriasIngresos } = await supabase
        .from("categorias_ingresos")
        .select("id, nombre")
        .eq("perfil_id", perfilActual.id)
        .order("nombre")

      // 6. Cargar montos presupuestados de ingresos para el mes
      const { data: ingresosPresupuesto } = await supabase
        .from("presupuesto_ingresos")
        .select("categoria_ingreso_id, monto_presupuestado")
        .eq("perfil_id", perfilActual.id)
        .eq("mes", primerDiaMes)

      // Si el mes no tiene ingresos cargados, precargar los del mes anterior
      // más reciente como valores predeterminados (editables y guardables).
      let ingresosParaMontos = ingresosPresupuesto
      if (!ingresosPresupuesto || ingresosPresupuesto.length === 0) {
        const { data: mesesPreviosIng } = await supabase
          .from("presupuesto_ingresos")
          .select("mes")
          .eq("perfil_id", perfilActual.id)
          .lt("mes", primerDiaMes)
          .order("mes", { ascending: false })
          .limit(1)
        const mesPrevioIng = mesesPreviosIng?.[0]?.mes
        if (mesPrevioIng) {
          const { data: ingresosPrevios } = await supabase
            .from("presupuesto_ingresos")
            .select("categoria_ingreso_id, monto_presupuestado")
            .eq("perfil_id", perfilActual.id)
            .eq("mes", mesPrevioIng)
          ingresosParaMontos = ingresosPrevios
        }
      }

      // Crear mapa de montos presupuestados
      const ingresosMontoMap: Record<string, number> = {}
      ingresosParaMontos?.forEach(item => {
        ingresosMontoMap[item.categoria_ingreso_id] = Number(item.monto_presupuestado) || 0
      })

      // Mapear categorías de ingresos con sus montos
      const ingresosData: IngresoCategoria[] = (categoriasIngresos || []).map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        montoPresupuestado: ingresosMontoMap[cat.id] || 0
      }))

      // --- Autoguardado (borrador) ---
      // Snapshot de lo que REALMENTE está guardado en la base para este mes.
      const dbSnapshot = serializePresupuesto(presupuestoValue, ingresosData, initialData)

      // Intentar restaurar un borrador local más reciente (cambios sin confirmar).
      const draft = skipDraftRestoreRef.current
        ? null
        : leerBorrador(perfilActual.id, anioSeleccionado, mesSeleccionado)
      skipDraftRestoreRef.current = false

      if (draft) {
        // Aplicar los montos del borrador sobre la estructura recién cargada.
        if (typeof draft.presupuesto === "string") presupuestoValue = draft.presupuesto
        for (const ing of ingresosData) {
          if (draft.ingresos && ing.id in draft.ingresos) {
            ing.montoPresupuestado = Number(draft.ingresos[ing.id]) || 0
          }
        }
        for (const [catKey, data] of Object.entries(initialData)) {
          let total = 0
          for (const sub of data.subcategorias) {
            const k = `${catKey}|${(sub.nombre || "").toLowerCase()}`
            if (draft.categorias && k in draft.categorias) {
              sub.monto = Number(draft.categorias[k]) || 0
            }
            total += sub.monto
          }
          data.total = total
        }
        setDraftSavedAt(draft.updatedAt || null)
      } else {
        setDraftSavedAt(null)
      }

      // El snapshot "guardado" es siempre el de la base. Si hay un borrador, el
      // estado actual diferirá y se mostrará el indicador de cambios sin guardar.
      setSavedSnapshot(dbSnapshot)
      setCategoriasData(initialData)
      setPresupuesto(presupuestoValue)
      setIngresosCategoria(ingresosData)

    } catch (err) {
      console.error("Error loading user data:", err)
    } finally {
      setIsLoadingData(false)
    }
  }, [perfilActual?.id, mesSeleccionado, anioSeleccionado, supabase])

  useEffect(() => {
    const hoy = getTodayDate()
    setMesSeleccionado(hoy.slice(5, 7))
    setAnioSeleccionado(hoy.slice(0, 4))
  }, [])

  useEffect(() => {
    if (perfilActual?.id) {
      loadUserData()
    }
  }, [perfilActual?.id, mesSeleccionado, anioSeleccionado, loadUserData])

  // Firma actual de los valores en pantalla y comparación con lo guardado en BD.
  const currentSnapshot = serializePresupuesto(presupuesto, ingresosCategoria, categoriasData)
  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot

  // Autoguardado discreto del borrador: cada vez que el usuario modifica un
  // monto (y difiere de lo guardado en la base), se guarda un respaldo local
  // con debounce. No toca la base de datos ni bloquea la interfaz.
  useEffect(() => {
    if (isLoadingData || !perfilActual?.id || savedSnapshot === null || !isDirty) return

    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      const draft: PresupuestoDraft = {
        updatedAt: new Date().toISOString(),
        presupuesto,
        ingresos: Object.fromEntries(ingresosCategoria.map((i) => [i.id, i.montoPresupuestado || 0])),
        categorias: Object.fromEntries(
          Object.entries(categoriasData).flatMap(([catKey, d]) =>
            d.subcategorias.map((s) => [`${catKey}|${(s.nombre || "").toLowerCase()}`, s.monto || 0]),
          ),
        ),
      }
      guardarBorrador(perfilActual.id, anioSeleccionado, mesSeleccionado, draft)
      setDraftSavedAt(draft.updatedAt)
    }, 800)

    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [
    currentSnapshot,
    isDirty,
    isLoadingData,
    perfilActual?.id,
    anioSeleccionado,
    mesSeleccionado,
    savedSnapshot,
    presupuesto,
    ingresosCategoria,
    categoriasData,
  ])

  // Descartar el borrador local y volver a los valores guardados en la base.
  const handleDescartarBorrador = () => {
    if (!perfilActual?.id) return
    borrarBorrador(perfilActual.id, anioSeleccionado, mesSeleccionado)
    skipDraftRestoreRef.current = true
    setDraftSavedAt(null)
    loadUserData()
  }

  // Generar opciones de año (actual y +-2)
  const anioActual = parseInt(todayStr.slice(0, 4))
  const aniosDisponibles = Array.from({ length: 5 }, (_, i) => String(anioActual - 2 + i))

  // Calcular totales
  const totalAsignado = Object.values(categoriasData).reduce((sum, cat) => sum + cat.total, 0)
  const totalIngresos = ingresosCategoria.reduce((sum, ing) => sum + ing.montoPresupuestado, 0)
  const presupuestoNum = totalIngresos > 0 ? totalIngresos : Number(presupuesto) || 0
  const porcentajeTotal = presupuestoNum > 0 ? (totalAsignado / presupuestoNum) * 100 : 0

  // Manejar cambio de monto en ingreso
  const handleIngresoMontoChange = (ingresoId: string, newMonto: string) => {
    const montoNum = Number(newMonto.replace(/[^0-9]/g, "")) || 0
    setIngresosCategoria(prev => 
      prev.map(ing => ing.id === ingresoId ? { ...ing, montoPresupuestado: montoNum } : ing)
    )
  }

  // Manejar cambio de monto en subcategoría
  const handleMontoChange = (categoriaKey: string, itemId: string, newMonto: string) => {
    const montoNum = Number(newMonto.replace(/[^0-9]/g, "")) || 0
    
    setCategoriasData(prev => {
      const categoria = prev[categoriaKey]
      if (!categoria) return prev

      const updatedSubcategorias = categoria.subcategorias.map(sub => 
        sub.id === itemId ? { ...sub, monto: montoNum } : sub
      )
      
      const newTotal = updatedSubcategorias.reduce((sum, sub) => sum + sub.monto, 0)

      return {
        ...prev,
        [categoriaKey]: {
          ...categoria,
          subcategorias: updatedSubcategorias,
          total: newTotal
        }
      }
    })
  }

  // Agregar nueva subcategoría - también crea en categorias_egreso
  const handleAddSubcategoria = async (categoriaKey: string) => {
    if (!newItemName.trim() || !perfilActual?.id) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const tipoNombre = CATEGORIA_TO_TIPO[categoriaKey]
      let tipoId = tiposCategoriaMap[normalizarNombre(tipoNombre)]

      // Si no existe el tipo, crearlo (pero antes re-verificar en la BD por
      // cualquier variante con tildes/mayúsculas para nunca duplicar)
      if (!tipoId) {
        const { data: tiposExistentes } = await supabase
          .from("tipos_categoria_egreso")
          .select("id, nombre")
          .eq("perfil_id", perfilActual.id)

        const coincidencia = tiposExistentes?.find(
          t => normalizarNombre(t.nombre) === normalizarNombre(tipoNombre)
        )

        if (coincidencia) {
          tipoId = coincidencia.id
          setTiposCategoriaMap(prev => ({ ...prev, [normalizarNombre(tipoNombre)]: coincidencia.id }))
        } else {
          const { data: newTipo, error: tipoError } = await supabase
            .from("tipos_categoria_egreso")
            .insert({
              user_id: user.id,
              perfil_id: perfilActual.id,
              nombre: tipoNombre,
              color: getColorCategoria(tipoNombre)
            })
            .select("id")
            .single()

          if (tipoError) throw tipoError
          if (newTipo) {
            tipoId = newTipo.id
            setTiposCategoriaMap(prev => ({ ...prev, [normalizarNombre(tipoNombre)]: tipoId }))
          }
        }
      }

      if (!tipoId) return

      // Verificar si ya existe la categoría de egreso con ese nombre
      const { data: existingCat } = await supabase
        .from("categorias_egreso")
        .select("id")
        .eq("perfil_id", perfilActual.id)
        .eq("nombre", newItemName.trim())
        .eq("tipo_categoria_id", tipoId)
        .single()

      let categoriaEgresoId = existingCat?.id

      // Si no existe, crearla
      if (!categoriaEgresoId) {
        const { data: newCat, error: catError } = await supabase
          .from("categorias_egreso")
          .insert({
            user_id: user.id,
            perfil_id: perfilActual.id,
            nombre: newItemName.trim(),
            tipo_categoria_id: tipoId
          })
          .select("id")
          .single()

        if (catError) throw catError
        categoriaEgresoId = newCat?.id
      }

      // Agregar a la UI
      const newId = `new_${Date.now()}`
      
      setCategoriasData(prev => {
        const categoria = prev[categoriaKey]
        if (!categoria) return prev

        return {
          ...prev,
          [categoriaKey]: {
            ...categoria,
            subcategorias: [...categoria.subcategorias, { 
              id: newId, 
              nombre: newItemName.trim(), 
              monto: 0,
              categoriaEgresoId: categoriaEgresoId,
              tipoId: tipoId
            }],
            tipoId: tipoId
          }
        }
      })

      setNewItemName("")
      setAddingToCategoria(null)

    } catch (err) {
      console.error("Error adding subcategoria:", err)
      setError("Error al agregar subcategoría")
    }
  }

  // Eliminar subcategoría - también elimina de categorias_egreso
  const handleDeleteSubcategoria = async (categoriaKey: string, itemId: string) => {
    const categoria = categoriasData[categoriaKey]
    const item = categoria?.subcategorias.find(s => s.id === itemId)

    // Eliminar de categorias_egreso si tiene ID
    if (item?.categoriaEgresoId) {
      try {
        await supabase
          .from("categorias_egreso")
          .delete()
          .eq("id", item.categoriaEgresoId)
      } catch (err) {
        console.error("Error deleting from categorias_egreso:", err)
      }
    }

    // Actualizar UI
    setCategoriasData(prev => {
      const categoria = prev[categoriaKey]
      if (!categoria) return prev

      const updatedSubcategorias = categoria.subcategorias.filter(sub => sub.id !== itemId)
      const newTotal = updatedSubcategorias.reduce((sum, sub) => sum + sub.monto, 0)

      return {
        ...prev,
        [categoriaKey]: {
          ...categoria,
          subcategorias: updatedSubcategorias,
          total: newTotal
        }
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!perfilActual?.id) {
      setError("No hay perfil activo. Por favor selecciona un perfil.")
      return
    }

    if (totalIngresos <= 0 && (!presupuesto || presupuestoNum <= 0)) {
      setError("Ingresa al menos un monto en los ingresos.")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) throw userError
      if (!user) throw new Error("Usuario no autenticado")

      const primerDiaMes = `${anioSeleccionado}-${mesSeleccionado}-01`

      // Calcular porcentajes basados en los montos
      const porcentajes: Record<string, number> = {}
      CATEGORIAS_CONFIG.forEach(cat => {
        const catData = categoriasData[cat.key]
        porcentajes[cat.key] = presupuestoNum > 0 ? catData?.total / presupuestoNum : 0
      })

      // 1. Guardar/actualizar presupuesto mensual
      const { data: existente } = await supabase
        .from("presupuesto_mensual")
        .select("id")
        .eq("perfil_id", perfilActual.id)
        .eq("fecha", primerDiaMes)
        .single()

      const presupuestoData = {
        user_id: user.id,
        perfil_id: perfilActual.id,
        meta_salario: presupuestoNum,
        fecha: primerDiaMes,
        ...porcentajes
      }

      if (existente) {
        const { error: updateError } = await supabase
          .from("presupuesto_mensual")
          .update(presupuestoData)
          .eq("id", existente.id)
        
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from("presupuesto_mensual")
          .insert(presupuestoData)
        
        if (insertError) throw insertError
      }

      // 2. Preparar items de presupuesto detallado.
      // Se agrupan por nombre de categoria para NO violar la restriccion UNIQUE
      // (perfil_id, categoria, tipo_categoria, mes): si el usuario repite un nombre
      // (en la misma o en distinta categoria), sumamos los montos en una sola fila.
      const itemsMap = new Map<
        string,
        {
          perfil_id: string
          tipo_categoria: string
          categoria: string
          monto_presupuestado: number
          mes: string
        }
      >()

      for (const [, data] of Object.entries(categoriasData)) {
        for (const sub of data.subcategorias) {
          const nombre = sub.nombre.trim()
          if (!nombre) continue
          const key = nombre.toLowerCase()
          const existente = itemsMap.get(key)
          if (existente) {
            existente.monto_presupuestado += sub.monto
          } else {
            itemsMap.set(key, {
              perfil_id: perfilActual.id,
              tipo_categoria: 'egreso', // La tabla solo acepta 'ingreso' o 'egreso'
              categoria: nombre,
              monto_presupuestado: sub.monto,
              mes: primerDiaMes,
            })
          }
        }
      }

      const itemsToInsert = Array.from(itemsMap.values())

      // 3. Guardar de forma NO destructiva: primero upsert (nunca borra antes de
      // asegurar los datos nuevos), asi un fallo no deja el mes vacio.
      if (itemsToInsert.length > 0) {
        const { error: upsertItemsError } = await supabase
          .from("presupuesto_categorias")
          .upsert(itemsToInsert, { onConflict: 'perfil_id,categoria,tipo_categoria,mes' })

        if (upsertItemsError) {
          throw upsertItemsError
        }
      }

      // 4. Eliminar solo las categorias que el usuario quito (las que ya no estan
      // en la lista actual), buscandolas por id para evitar cualquier borrado masivo.
      const { data: itemsExistentes } = await supabase
        .from("presupuesto_categorias")
        .select("id, categoria")
        .eq("perfil_id", perfilActual.id)
        .eq("mes", primerDiaMes)

      const nombresActuales = new Set(itemsToInsert.map((i) => i.categoria.toLowerCase()))
      const idsItemsAEliminar = (itemsExistentes || [])
        .filter((row) => !nombresActuales.has((row.categoria || "").toLowerCase()))
        .map((row) => row.id)

      if (idsItemsAEliminar.length > 0) {
        await supabase.from("presupuesto_categorias").delete().in("id", idsItemsAEliminar)
      }

      // 5. Presupuestos de ingresos (mismo enfoque no destructivo)
      const ingresosToInsert = ingresosCategoria
        .filter(ing => ing.montoPresupuestado > 0)
        .map(ing => ({
          perfil_id: perfilActual.id,
          user_id: user.id,
          categoria_ingreso_id: ing.id,
          monto_presupuestado: ing.montoPresupuestado,
          mes: primerDiaMes
        }))

      if (ingresosToInsert.length > 0) {
        const { error: upsertIngresosError } = await supabase
          .from("presupuesto_ingresos")
          .upsert(ingresosToInsert, { onConflict: 'perfil_id,categoria_ingreso_id,mes' })

        if (upsertIngresosError) {
          throw upsertIngresosError
        }
      }

      // Eliminar ingresos que el usuario dejo en 0 o quito
      const idsIngresosActuales = new Set(ingresosToInsert.map((i) => i.categoria_ingreso_id))
      const { data: ingresosExistentes } = await supabase
        .from("presupuesto_ingresos")
        .select("id, categoria_ingreso_id")
        .eq("perfil_id", perfilActual.id)
        .eq("mes", primerDiaMes)

      const idsIngresosAEliminar = (ingresosExistentes || [])
        .filter((row) => !idsIngresosActuales.has(row.categoria_ingreso_id))
        .map((row) => row.id)

      if (idsIngresosAEliminar.length > 0) {
        await supabase.from("presupuesto_ingresos").delete().in("id", idsIngresosAEliminar)
      }

      // Guardado confirmado en la base: el estado actual pasa a ser el "guardado"
      // y se elimina el borrador local. Si el guardado hubiese fallado, se lanza
      // una excepción antes de llegar aquí y el borrador se conserva intacto.
      setSavedSnapshot(serializePresupuesto(presupuesto, ingresosCategoria, categoriasData))
      borrarBorrador(perfilActual.id, anioSeleccionado, mesSeleccionado)
      setDraftSavedAt(null)
      skipDraftRestoreRef.current = true

      setSuccess(true)

      setTimeout(() => {
        router.refresh()
        loadUserData()
      }, 1500)
    } catch (err: unknown) {
      console.error("Error al guardar presupuesto:", err)
      const errorObj = err as { message?: string; details?: string }
      setError(errorObj?.message || errorObj?.details || "Error al registrar presupuesto")
    } finally {
      setIsLoading(false)
    }
  }

  if (!perfilActual) {
    return (
      <Card className="max-w-6xl mx-auto glass-effect border-border/50">
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p>Cargando perfil...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-6xl mx-auto glass-effect border-border/50">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl sm:text-2xl">Establecer Presupuesto Mensual</CardTitle>
            <CardDescription className="text-sm">Define tu presupuesto mensual y distribuyelo por categorias en {perfilActual.nombre}</CardDescription>
          </div>
          <Link href="/dashboard/personal/analisis?tab=presupuesto-vs-realidad" className="flex-shrink-0">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              className="w-full sm:w-auto border-purple-500/50 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-500/10 text-xs sm:text-sm"
            >
              <BarChart3 className="w-4 h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="truncate">Ver Presupuesto vs Realidad</span>
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sección INGRESOS */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowIngresos(!showIngresos)}
              className="flex items-center justify-between w-full"
            >
              <Label className="flex items-center gap-2 text-base sm:text-lg font-semibold cursor-pointer">
                <TrendingUp className="w-5 h-5 text-green-500" />
                INGRESOS
                {totalIngresos > 0 && (
                  <span className="text-green-500 font-bold ml-2">
                    {formatGuaranies(totalIngresos)}
                  </span>
                )}
              </Label>
              {showIngresos ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showIngresos && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-3">
                {isLoadingData ? (
                  <div className="space-y-2" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 rounded bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : ingresosCategoria.length > 0 ? (
                  ingresosCategoria.map((ingreso) => (
                    <div key={ingreso.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="flex-1 text-sm font-medium">{ingreso.nombre}</span>
                      <div className="w-32 sm:w-40">
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0"
                          value={ingreso.montoPresupuestado || ""}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "")
                            handleIngresoMontoChange(ingreso.id, value)
                          }}
                          className="h-8 text-right bg-background/50 text-sm"
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No hay categorias de ingreso. Crea una en la seccion de Ingresos.
                  </p>
                )}
                {totalIngresos > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-green-500/20">
                    <span className="font-semibold text-green-600">Total Ingresos:</span>
                    <span className="font-bold text-green-600">{formatGuaranies(totalIngresos)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mes y Año */}
          <div className="grid gap-6 md:grid-cols-2">

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Mes del Presupuesto
              </Label>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={anio}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Gastos por categorias */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 border-b pb-2">
              <Label className="text-base sm:text-lg font-semibold">Gastos por categorias</Label>
              <div className={`text-sm sm:text-lg font-bold ${Math.abs(porcentajeTotal - 100) < 0.01 ? 'text-green-500' : porcentajeTotal > 100 ? 'text-red-500' : 'text-cyan-500'}`}>
                Total: {formatGuaranies(presupuestoNum)} ({porcentajeTotal.toFixed(1)}%)
              </div>
            </div>

            {isLoadingData ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando categorias...
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {CATEGORIAS_CONFIG.map((categoria) => {
                  const Icon = categoria.icon
                  const catData = categoriasData[categoria.key] || { subcategorias: [], total: 0 }
                  const porcentajeCategoria = presupuestoNum > 0 ? (catData.total / presupuestoNum) * 100 : 0
                  
                  return (
                    <Card key={categoria.key} className={`${categoria.bgColor} ${categoria.borderColor} border`}>
                      <CardHeader className="pb-2 pt-3 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Icon className={`w-4 h-4 flex-shrink-0 ${categoria.color}`} />
                            <span className={`font-semibold truncate ${categoria.color}`}>{categoria.label}</span>
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap flex-shrink-0">
                            {formatGuaranies(catData.total)} ({porcentajeCategoria.toFixed(1)}%)
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2">
                        {/* Lista de subcategorías */}
                        {catData.subcategorias.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between gap-2 py-1">
                            <span className="text-sm text-foreground truncate flex-1 min-w-0">{sub.nombre}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Input
                                type="text"
                                inputMode="numeric"
                                value={sub.monto > 0 ? sub.monto.toLocaleString('es-PY') : ""}
                                onChange={(e) => handleMontoChange(categoria.key, sub.id, e.target.value)}
                                placeholder="0"
                                className="w-24 sm:w-28 h-7 text-right text-sm bg-background/50"
                              />
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteSubcategoria(categoria.key, sub.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}

                        {/* Agregar nueva subcategoría */}
                        {addingToCategoria === categoria.key ? (
                          <div className="flex items-center gap-2 pt-2">
                            <Input
                              type="text"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                              placeholder="Nombre..."
                              className="h-8 text-sm bg-background/50 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleAddSubcategoria(categoria.key)
                                } else if (e.key === 'Escape') {
                                  setAddingToCategoria(null)
                                  setNewItemName("")
                                }
                              }}
                            />
                            <Button 
                              type="button"
                              size="sm" 
                              variant="secondary"
                              className="h-8"
                              onClick={() => handleAddSubcategoria(categoria.key)}
                            >
                              Agregar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setAddingToCategoria(categoria.key)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {presupuestoNum > 0 && totalAsignado > presupuestoNum && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-500">
                  Has excedido el presupuesto por {formatGuaranies(totalAsignado - presupuestoNum)}
                </p>
              </div>
            )}

            {presupuestoNum > 0 && totalAsignado < presupuestoNum && totalAsignado > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-amber-500">
                  Te faltan {formatGuaranies(presupuestoNum - totalAsignado)} por asignar ({(100 - porcentajeTotal).toFixed(1)}%)
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <CheckCircle className="w-4 h-4 text-sky-500" />
              <p className="text-sm text-sky-500">Presupuesto registrado exitosamente</p>
            </div>
          )}

          {/* Autoguardado: indicador discreto del borrador local */}
          {isDirty && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Save className="w-3.5 h-3.5 text-sky-500 flex-shrink-0" />
              <span>
                Borrador guardado automáticamente
                {draftSavedAt
                  ? ` · ${new Date(draftSavedAt).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
                {". "}
                Presiona <span className="font-medium text-foreground">Establecer Presupuesto</span> para confirmar.
              </span>
              <button
                type="button"
                onClick={handleDescartarBorrador}
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                <RotateCcw className="w-3 h-3" />
                Descartar
              </button>
            </div>
          )}

              <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700 text-white" disabled={isLoading || presupuestoNum <= 0}>
            {isLoading ? "Registrando..." : "Establecer Presupuesto"}
          </Button>

          {/* Botón para ver Presupuesto vs Realidad */}
          <Link href="/dashboard/personal/analisis?tab=presupuesto-vs-realidad" className="block">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full border-purple-500/50 text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-500/10"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Presupuesto vs Realidad
            </Button>
          </Link>
        </form>
      </CardContent>
    </Card>
  )
}
