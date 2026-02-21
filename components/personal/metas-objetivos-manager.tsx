"use client"

import { useState, useEffect, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { 
  Target, Plus, CheckCircle2, Circle, Calendar, TrendingUp, 
  Award, Flame, ChevronLeft, ChevronRight, Trash2, Edit, 
  ListTodo, BarChart3, Clock, Star, Zap, Trophy, Repeat, RefreshCw
} from "lucide-react"

interface Meta {
  id: string
  perfil_id: string
  titulo: string
  descripcion: string | null
  tipo: "semanal" | "mensual" | "anual"
  categoria: string | null
  fecha_inicio: string
  fecha_fin: string
  valor_objetivo: number
  valor_actual: number
  unidad: string | null
  estado: "activa" | "completada" | "pausada" | "cancelada"
  prioridad: "baja" | "media" | "alta"
  color: string | null
  icono: string | null
  created_at: string
}

interface Habito {
  id: string
  perfil_id: string
  nombre: string
  descripcion: string | null
  frecuencia: "diario" | "semanal"
  dias_semana: number[] | null
  color: string
  activo: boolean
  created_at: string
}

interface RegistroHabito {
  id: string
  habito_id: string
  fecha: string
  completado: boolean
}

interface TareaMeta {
  id: string
  meta_id: string
  titulo: string
  completada: boolean
  orden: number
}

interface HabitoRecurrente {
  id: string
  nombre: string
  descripcion: string | null
  intervalo_dias: number
  fecha_inicio: string
  fecha_fin: string | null
  color: string
  icono: string
  activo: boolean
  ultima_completada: string | null
  proxima_ocurrencia: string | null
  created_at: string
}

interface RegistroHabitoRecurrente {
  id: string
  habito_id: string
  fecha: string
  completado: boolean
}

interface MetasObjetivosManagerProps {
  perfilId: string
}

// Helper para obtener fecha actual en Paraguay (UTC-3)
const getParaguayDate = () => {
  const now = new Date()
  const paraguayOffset = -3 * 60 // UTC-3 en minutos
  const localOffset = now.getTimezoneOffset()
  const diff = paraguayOffset - (-localOffset)
  const paraguayTime = new Date(now.getTime() + diff * 60 * 1000)
  return paraguayTime
}

const getParaguayDateString = () => {
  return getParaguayDate().toISOString().split("T")[0]
}

const COLORES_HABITOS = [
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
]

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const DIAS_SEMANA_COMPLETO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]

// Función auxiliar para convertir getDay() (0=Dom) a índice de DIAS_SEMANA (0=Lun)
const getDiaSemanaIndex = (date: Date): number => {
  const day = date.getDay()
  return day === 0 ? 6 : day - 1
}

export function MetasObjetivosManager({ perfilId }: MetasObjetivosManagerProps) {
  const [metas, setMetas] = useState<Meta[]>([])
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [registrosHabitos, setRegistrosHabitos] = useState<RegistroHabito[]>([])
  const [tareasMetas, setTareasMetas] = useState<TareaMeta[]>([])
  const [tareasDelDia, setTareasDelDia] = useState<{id: string, titulo: string, completada: boolean, prioridad: string, fecha_limite: string}[]>([])
  const [tareasPorFecha, setTareasPorFecha] = useState<Record<string, {id: string, titulo: string, completada: boolean, prioridad: string, fecha_limite: string}[]>>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("tareas")
  const [userId, setUserId] = useState<string | null>(null)
  
  // Estados para hábitos recurrentes (Tareas Programadas)
  const [habitosRecurrentes, setHabitosRecurrentes] = useState<HabitoRecurrente[]>([])
  const [registrosHabitosRecurrentes, setRegistrosHabitosRecurrentes] = useState<Record<string, boolean>>({})
  const [showHabitoRecurrenteModal, setShowHabitoRecurrenteModal] = useState(false)
  const [verDiasFuturos, setVerDiasFuturos] = useState(false)
  const [ocurrenciasExcluidas, setOcurrenciasExcluidas] = useState<Set<string>>(new Set())
  const [tareaAEliminar, setTareaAEliminar] = useState<{ id: string; fecha: string; nombre: string } | null>(null)
  const [tareaAFinalizar, setTareaAFinalizar] = useState<HabitoRecurrente | null>(null)
  const [fechaFinTarea, setFechaFinTarea] = useState("")
  const [habitoRecurrenteForm, setHabitoRecurrenteForm] = useState({
    nombre: "",
    descripcion: "",
    intervalo_dias: 1,
    fecha_inicio: getParaguayDateString(),
    fecha_fin: "",
  })
  
  // Estados para tareas del día
  const [showTareaModal, setShowTareaModal] = useState(false)
  const [editingTarea, setEditingTarea] = useState<{id: string, titulo: string, completada: boolean, prioridad: string} | null>(null)
  const [tareaForm, setTareaForm] = useState({ titulo: "", prioridad: "media" })
  const [deletingTarea, setDeletingTarea] = useState<string | null>(null)
  
  // Estados para modales
  const [showMetaModal, setShowMetaModal] = useState(false)
  const [showHabitoModal, setShowHabitoModal] = useState(false)
  const [editingMeta, setEditingMeta] = useState<Meta | null>(null)
  const [editingHabito, setEditingHabito] = useState<Habito | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "meta" | "habito", id: string } | null>(null)
  
  // Estados para formularios
  const [metaForm, setMetaForm] = useState({
    titulo: "",
    descripcion: "",
    tipo: "mensual" as "semanal" | "mensual" | "anual",
    prioridad: "media" as "baja" | "media" | "alta",
    fecha_inicio: getParaguayDateString(),
    fecha_fin: ""
  })
  
  const [habitoForm, setHabitoForm] = useState({
    nombre: "",
    descripcion: "",
    frecuencia: "diario" as "diario" | "semanal",
    dias_semana: [1, 2, 3, 4, 5] as number[],
    color: COLORES_HABITOS[0]
  })
  
  // Estado para navegación de calendario
  const [currentDate, setCurrentDate] = useState(getParaguayDate())
  const [viewMode, setViewMode] = useState<"semana" | "mes">("semana")
  
  // Nueva tarea para meta
  const [newTarea, setNewTarea] = useState<{ metaId: string, titulo: string } | null>(null)
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  // Cargar datos
  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      // Obtener user_id
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
      
      const hoy = getParaguayDate()
      const hace5Dias = new Date(hoy)
      hace5Dias.setDate(hoy.getDate() - 5)
      const hace6Dias = new Date(hoy)
      hace6Dias.setDate(hoy.getDate() - 6)
      
      const hoyStr = getParaguayDateString()
      const hace5DiasStr = hace5Dias.toISOString().split("T")[0]
      const hace6DiasStr = hace6Dias.toISOString().split("T")[0]
      
      // Eliminar tareas de más de 6 días
      await supabase.from("tareas_meta")
        .delete()
        .eq("perfil_id", perfilId)
        .is("meta_id", null)
        .lt("fecha_limite", hace6DiasStr)
      
      const [metasRes, habitosRes, registrosRes, tareasMetaRes, tareasUltimos5DiasRes] = await Promise.all([
        supabase.from("metas").select("*").eq("perfil_id", perfilId).order("created_at", { ascending: false }),
        supabase.from("habitos").select("*").eq("perfil_id", perfilId).eq("activo", true).order("created_at", { ascending: true }),
        supabase.from("registro_habitos").select("*").gte("fecha", getStartOfMonth(currentDate)).lte("fecha", getEndOfMonth(currentDate)),
        supabase.from("tareas_meta").select("*").order("orden", { ascending: true }),
        supabase.from("tareas_meta").select("*").eq("perfil_id", perfilId).is("meta_id", null).gte("fecha_limite", hace5DiasStr).lte("fecha_limite", hoyStr).order("fecha_limite", { ascending: false })
      ])
      
      if (metasRes.data) setMetas(metasRes.data)
      if (habitosRes.data) setHabitos(habitosRes.data)
      if (registrosRes.data) setRegistrosHabitos(registrosRes.data)
      if (tareasMetaRes.data) setTareasMetas(tareasMetaRes.data)
      
      // Agrupar tareas por fecha
      if (tareasUltimos5DiasRes.data) {
        const agrupadasPorFecha: Record<string, typeof tareasUltimos5DiasRes.data> = {}
        for (const tarea of tareasUltimos5DiasRes.data) {
          if (!agrupadasPorFecha[tarea.fecha_limite]) {
            agrupadasPorFecha[tarea.fecha_limite] = []
          }
          agrupadasPorFecha[tarea.fecha_limite].push(tarea)
        }
        setTareasPorFecha(agrupadasPorFecha)
        setTareasDelDia(tareasUltimos5DiasRes.data.filter(t => t.fecha_limite === hoyStr))
      }
      
      // Cargar tareas programadas (hábitos recurrentes)
      const { data: habitosRecData } = await supabase
        .from("habitos_recurrentes")
        .select("*")
        .eq("perfil_id", perfilId)
        .eq("activo", true)
        .order("created_at", { ascending: false })
      
      if (habitosRecData) {
        setHabitosRecurrentes(habitosRecData)
        
        // Cargar registros de las ultimas 3 semanas (para cubrir semana anterior completa)
        if (habitosRecData.length > 0) {
          const habitoIds = habitosRecData.map((h) => h.id)
          const haceTresSemanas = getParaguayDate()
          haceTresSemanas.setDate(haceTresSemanas.getDate() - 21)
          const fechaDesde = haceTresSemanas.toISOString().split("T")[0]
          
          const { data: registrosRec } = await supabase
            .from("registro_habitos_recurrentes")
            .select("*")
            .in("habito_id", habitoIds)
            .gte("fecha", fechaDesde)
          
          const registrosMap: Record<string, boolean> = {}
          const excluidos = new Set<string>()
          registrosRec?.forEach((r) => {
            const clave = `${r.habito_id}-${r.fecha}`
            if (r.notas === "__EXCLUIDO__") {
              excluidos.add(clave)
            } else {
              registrosMap[clave] = r.completado
            }
          })
          setRegistrosHabitosRecurrentes(registrosMap)
          setOcurrenciasExcluidas(excluidos)
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    }
    setLoading(false)
  }, [perfilId, supabase, currentDate])
  
  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])
  
  // Funciones de fecha
  function getStartOfMonth(date: Date): string {
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0]
  }
  
  function getEndOfMonth(date: Date): string {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split("T")[0]
  }
  
  function getWeekDates(date: Date): Date[] {
    const start = new Date(date)
    const day = start.getDay()
    // Ajustar para que la semana empiece en Lunes (0 = Lunes, 6 = Domingo)
    const diff = day === 0 ? -6 : 1 - day
    start.setDate(start.getDate() + diff)
    
    const dates: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      dates.push(d)
    }
    return dates
  }
  
  function getMonthWeeks(date: Date): Date[][] {
    const weeks: Date[][] = []
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    
    let currentWeekStart = new Date(firstDay)
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())
    
    while (currentWeekStart <= lastDay || weeks.length < 5) {
      const week: Date[] = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart)
        d.setDate(currentWeekStart.getDate() + i)
        week.push(d)
      }
      weeks.push(week)
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      if (weeks.length >= 6) break
    }
    
    return weeks
  }
  
  function getDaysInMonth(date: Date): Date[] {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Date[] = []
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d))
    }
    
    return days
  }
  
  function formatDate(date: Date): string {
    return date.toISOString().split("T")[0]
  }
  
  function getWeekNumber(date: Date): number {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const dayOfMonth = date.getDate()
    const firstDayWeekday = firstDayOfMonth.getDay()
    return Math.ceil((dayOfMonth + firstDayWeekday) / 7)
  }
  
  // Guardar meta
  const guardarMeta = async () => {
    try {
      if (editingMeta) {
        const { error } = await supabase
          .from("metas")
          .update({
            titulo: metaForm.titulo,
            descripcion: metaForm.descripcion || null,
            tipo: metaForm.tipo,
            prioridad: metaForm.prioridad,
            fecha_inicio: metaForm.fecha_inicio,
            fecha_fin: metaForm.fecha_fin
          })
          .eq("id", editingMeta.id)
        
        if (error) throw error
      } else {
        if (!userId) {
          console.error("[v0] No se encontró el user_id al crear meta")
          return
        }
        const { error } = await supabase
          .from("metas")
          .insert({
            perfil_id: perfilId,
            user_id: userId,
            titulo: metaForm.titulo,
            descripcion: metaForm.descripcion || null,
            tipo: metaForm.tipo,
            prioridad: metaForm.prioridad,
            fecha_inicio: metaForm.fecha_inicio,
            fecha_fin: metaForm.fecha_fin,
            valor_objetivo: 100,
            valor_actual: 0,
            estado: "activa"
          })
        
        if (error) throw error
      }
      
      setShowMetaModal(false)
      setEditingMeta(null)
      resetMetaForm()
      cargarDatos()
    } catch (error) {
      console.error("Error guardando meta:", error)
    }
  }
  
  // Guardar hábito
  const guardarHabito = async () => {
    try {
      if (editingHabito) {
        const { error } = await supabase
          .from("habitos")
          .update({
            nombre: habitoForm.nombre,
            descripcion: habitoForm.descripcion || null,
            frecuencia: habitoForm.frecuencia,
            dias_semana: habitoForm.frecuencia === "semanal" ? habitoForm.dias_semana : null,
            color: habitoForm.color
          })
          .eq("id", editingHabito.id)
        
        if (error) throw error
      } else {
        if (!userId) {
          console.error("No se encontró el user_id")
          return
        }
        const { error } = await supabase
          .from("habitos")
          .insert({
            perfil_id: perfilId,
            user_id: userId,
            nombre: habitoForm.nombre,
            descripcion: habitoForm.descripcion || null,
            frecuencia: habitoForm.frecuencia,
            dias_semana: habitoForm.frecuencia === "semanal" ? habitoForm.dias_semana : null,
            color: habitoForm.color,
            activo: true
          })
        
        if (error) throw error
      }
      
      setShowHabitoModal(false)
      setEditingHabito(null)
      resetHabitoForm()
      cargarDatos()
    } catch (error) {
      console.error("Error guardando hábito:", error)
    }
  }
  
  // Toggle registro de hábito
  const toggleRegistroHabito = async (habitoId: string, fecha: string, completado: boolean) => {
    try {
      const existente = registrosHabitos.find(r => r.habito_id === habitoId && r.fecha === fecha)
      
      if (existente) {
        if (completado) {
          const { error } = await supabase
            .from("registro_habitos")
            .update({ completado: true })
            .eq("id", existente.id)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from("registro_habitos")
            .delete()
            .eq("id", existente.id)
          if (error) throw error
        }
      } else if (completado) {
        if (!userId) {
          console.error("[v0] No se encontró el user_id al insertar registro de hábito")
          return
        }
        const { error } = await supabase
          .from("registro_habitos")
          .insert({
            habito_id: habitoId,
            perfil_id: perfilId,
            user_id: userId,
            fecha: fecha,
            completado: true
          })
        if (error) throw error
      }
      
      cargarDatos()
    } catch (error) {
      console.error("Error actualizando registro:", error)
    }
  }
  
  // Eliminar meta o hábito
  const eliminar = async () => {
    if (!deleteConfirm) return
    
    try {
      if (deleteConfirm.type === "meta") {
        await supabase.from("tareas_meta").delete().eq("meta_id", deleteConfirm.id)
        await supabase.from("metas").delete().eq("id", deleteConfirm.id)
      } else {
        await supabase.from("registro_habitos").delete().eq("habito_id", deleteConfirm.id)
        await supabase.from("habitos").delete().eq("id", deleteConfirm.id)
      }
      
      setDeleteConfirm(null)
      cargarDatos()
    } catch (error) {
      console.error("Error eliminando:", error)
    }
  }
  
  // Agregar tarea a meta
  const agregarTarea = async (metaId: string, titulo: string) => {
    try {
      if (!userId) {
        console.error("[v0] No se encontró el user_id al agregar tarea")
        return
      }
      const maxOrden = tareasMetas.filter(t => t.meta_id === metaId).length
      const { error } = await supabase
        .from("tareas_meta")
        .insert({
          meta_id: metaId,
          perfil_id: perfilId,
          user_id: userId,
          titulo: titulo,
          completada: false,
          orden: maxOrden + 1
        })
      
      if (error) throw error
      setNewTarea(null)
      cargarDatos()
      actualizarProgresoMeta(metaId)
    } catch (error) {
      console.error("Error agregando tarea:", error)
    }
  }
  
  // Toggle tarea completada
  const toggleTarea = async (tareaId: string, metaId: string) => {
    try {
      const tarea = tareasMetas.find(t => t.id === tareaId)
      if (!tarea) return
      
      const { error } = await supabase
        .from("tareas_meta")
        .update({ completada: !tarea.completada })
        .eq("id", tareaId)
      
      if (error) throw error
      
      // Actualizar progreso inmediatamente después de cambiar el estado
      await actualizarProgresoMeta(metaId)
      // Recargar datos para reflejar cambios en la UI
      cargarDatos()
    } catch (error) {
      console.error("Error actualizando tarea:", error)
    }
  }
  
  // Actualizar progreso de meta
  const actualizarProgresoMeta = async (metaId: string) => {
    try {
      // Obtener las tareas actualizadas directamente de la base de datos
      const { data: tareasActualizadas, error } = await supabase
        .from("tareas_meta")
        .select("*")
        .eq("meta_id", metaId)
      
      if (error) throw error
      if (!tareasActualizadas || tareasActualizadas.length === 0) return
      
      const completadas = tareasActualizadas.filter(t => t.completada).length
      const valorActual = Math.round((completadas / tareasActualizadas.length) * 100)
      const estado = valorActual === 100 ? "completada" : "activa"
      
      await supabase
        .from("metas")
        .update({ valor_actual: valorActual, estado })
        .eq("id", metaId)
    } catch (error) {
      console.error("Error actualizando progreso:", error)
    }
  }
  
  // Eliminar tarea
  const eliminarTarea = async (tareaId: string, metaId: string) => {
    try {
      const { error } = await supabase
        .from("tareas_meta")
        .delete()
        .eq("id", tareaId)
      
      if (error) throw error
      cargarDatos()
      actualizarProgresoMeta(metaId)
    } catch (error) {
      console.error("Error eliminando tarea:", error)
    }
  }
  
  // Reset forms
  const resetMetaForm = () => {
    setMetaForm({
      titulo: "",
      descripcion: "",
      tipo: "mensual",
      prioridad: "media",
      fecha_inicio: getParaguayDateString(),
      fecha_fin: ""
    })
  }
  
  const resetHabitoForm = () => {
    setHabitoForm({
      nombre: "",
      descripcion: "",
      frecuencia: "diario",
      dias_semana: [1, 2, 3, 4, 5],
      color: COLORES_HABITOS[0]
    })
  }
  
  // Funciones para hábitos recurrentes
  const guardarHabitoRecurrente = async () => {
    try {
      if (!userId) return
      
      const fechaInicio = habitoRecurrenteForm.fecha_inicio || getParaguayDateString()
      const { error } = await supabase.from("habitos_recurrentes").insert({
        perfil_id: perfilId,
        user_id: userId,
        nombre: habitoRecurrenteForm.nombre,
        descripcion: habitoRecurrenteForm.descripcion || null,
        intervalo_dias: habitoRecurrenteForm.intervalo_dias,
        fecha_inicio: fechaInicio,
        fecha_fin: habitoRecurrenteForm.fecha_fin || null,
        proxima_ocurrencia: fechaInicio,
      })
      
      if (error) throw error
      
      setShowHabitoRecurrenteModal(false)
      setHabitoRecurrenteForm({ nombre: "", descripcion: "", intervalo_dias: 1, fecha_inicio: getParaguayDateString(), fecha_fin: "" })
      cargarDatos()
    } catch (error) {
      console.error("Error guardando hábito recurrente:", error)
    }
  }
  
  const toggleTareaProgramada = async (habitoId: string, fecha: string, completado: boolean) => {
    try {
      const { data: existingRecord } = await supabase
        .from("registro_habitos_recurrentes")
        .select("id")
        .eq("habito_id", habitoId)
        .eq("fecha", fecha)
        .single()
      
      if (existingRecord) {
        await supabase
          .from("registro_habitos_recurrentes")
          .update({ completado })
          .eq("id", existingRecord.id)
      } else {
        if (!userId) return
        await supabase.from("registro_habitos_recurrentes").insert({
          habito_id: habitoId,
          perfil_id: perfilId,
          user_id: userId,
          fecha: fecha,
          completado,
        })
      }
      
      // Actualizar última completada y próxima ocurrencia si se completó
      if (completado) {
        const habito = habitosRecurrentes.find((h) => h.id === habitoId)
        if (habito) {
          const fechaActual = new Date(fecha)
          const proximaFecha = new Date(fechaActual)
          proximaFecha.setDate(proximaFecha.getDate() + habito.intervalo_dias)
          await supabase
            .from("habitos_recurrentes")
            .update({ 
              ultima_completada: fecha, 
              proxima_ocurrencia: proximaFecha.toISOString().split("T")[0] 
            })
            .eq("id", habitoId)
        }
      }
      
      const clave = `${habitoId}-${fecha}`
      setRegistrosHabitosRecurrentes((prev) => ({ ...prev, [clave]: completado }))
      cargarDatos()
    } catch (error) {
      console.error("Error actualizando tarea programada:", error)
    }
  }
  
  const confirmarEliminarTarea = (id: string, fecha: string, nombre: string) => {
    setTareaAEliminar({ id, fecha, nombre })
  }
  
  // Eliminar = solo quita la ocurrencia de ESE dia especifico
  // Registra un "completado = false" especial para excluir esa fecha
  const eliminarTareaProgramada = async () => {
    if (!tareaAEliminar) return
    try {
      // Insertar un registro con completado=false para excluir esa fecha
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from("registro_habitos_recurrentes")
        .upsert({
          habito_id: tareaAEliminar.id,
          perfil_id: perfilId,
          user_id: user.id,
          fecha: tareaAEliminar.fecha,
          completado: false,
          notas: "__EXCLUIDO__"
        }, { onConflict: "habito_id,fecha" })
      
      setTareaAEliminar(null)
      cargarDatos()
    } catch (error) {
      console.error("Error eliminando ocurrencia de tarea:", error)
    }
  }
  
  // Finalizar = desactiva la tarea ENTERA, desaparece de todos los dias
  const finalizarTareaProgramada = async () => {
    if (!tareaAFinalizar) return
    try {
      await supabase
        .from("habitos_recurrentes")
        .update({ activo: false })
        .eq("id", tareaAFinalizar.id)

      setTareaAFinalizar(null)
      setFechaFinTarea("")
      cargarDatos()
    } catch (error) {
      console.error("Error finalizando tarea programada:", error)
    }
  }

  const getIntervaloLabel = (dias: number) => {
    if (dias === 1) return "Diario"
    if (dias === 7) return "Semanal"
    if (dias === 30) return "Mensual"
    return `Cada ${dias} días`
  }
  
  // Función para calcular ocurrencias de una tarea en un rango de fechas
  const calcularOcurrencias = (tarea: HabitoRecurrente, fechaInicio: Date, fechaFin: Date) => {
    const ocurrencias: { fecha: string; diaNombre: string }[] = []
    const inicio = new Date(tarea.fecha_inicio)
    let fechaActual = new Date(Math.max(inicio.getTime(), fechaInicio.getTime()))
    
    while (fechaActual <= fechaFin) {
      if (fechaActual >= inicio && (!tarea.fecha_fin || fechaActual <= new Date(tarea.fecha_fin))) {
        const fechaStr = fechaActual.toISOString().split("T")[0]
        const diaNombre = fechaActual.toLocaleDateString("es-PY", { weekday: "long" })
        ocurrencias.push({ fecha: fechaStr, diaNombre: diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1) })
      }
      fechaActual.setDate(fechaActual.getDate() + tarea.intervalo_dias)
    }
    
    return ocurrencias
  }
  
  // Obtener tareas agrupadas por día
  const getTareasPorDia = () => {
    const hoy = getParaguayDate()
    hoy.setHours(0, 0, 0, 0)
    
    const inicioDeSemana = new Date(hoy)
    const diaSemana = hoy.getDay()
    inicioDeSemana.setDate(hoy.getDate() - diaSemana)
    
    const finDeSemana = new Date(inicioDeSemana)
    finDeSemana.setDate(inicioDeSemana.getDate() + (verDiasFuturos ? 13 : 6))
    
    const tareasPorDia: Record<string, { tarea: HabitoRecurrente; fecha: string; diaNombre: string; completada: boolean }[]> = {}
    
    habitosRecurrentes.forEach((tarea) => {
      const ocurrencias = calcularOcurrencias(tarea, inicioDeSemana, finDeSemana)
      ocurrencias.forEach((ocurrencia) => {
        if (!tareasPorDia[ocurrencia.fecha]) {
          tareasPorDia[ocurrencia.fecha] = []
        }
        const clave = `${tarea.id}-${ocurrencia.fecha}`
        const completada = registrosHabitosRecurrentes[clave] || false
        tareasPorDia[ocurrencia.fecha].push({ 
          tarea, 
          fecha: ocurrencia.fecha, 
          diaNombre: ocurrencia.diaNombre,
          completada 
        })
      })
    })
    
    return tareasPorDia
  }
  
  const tareasPorDia = getTareasPorDia()
  const diasConTareas = Object.keys(tareasPorDia).sort()
  
  // Calcular estadísticas
  const calcularEstadisticasHabitos = () => {
    const hoy = getParaguayDate()
    const inicioSemana = new Date(hoy)
    inicioSemana.setDate(hoy.getDate() - hoy.getDay())
    
    let totalPosibles = 0
    let completados = 0
    
    habitos.forEach(habito => {
      const diasSemana = getWeekDates(hoy)
      diasSemana.forEach(dia => {
        if (dia <= hoy) {
          const diaSemana = dia.getDay()
          if (habito.frecuencia === "diario" || (habito.dias_semana && habito.dias_semana.includes(diaSemana))) {
            totalPosibles++
            const registro = registrosHabitos.find(
              r => r.habito_id === habito.id && r.fecha === formatDate(dia) && r.completado
            )
            if (registro) completados++
          }
        }
      })
    })
    
    return {
      totalHabitos: habitos.length,
      completadosHoy: registrosHabitos.filter(r => r.fecha === formatDate(hoy) && r.completado).length,
      porcentajeSemanal: totalPosibles > 0 ? Math.round((completados / totalPosibles) * 100) : 0,
      rachaActual: calcularRacha()
    }
  }
  
  const calcularRacha = () => {
    if (habitos.length === 0) return 0
    
    let racha = 0
    const hoy = getParaguayDate()
    
    for (let i = 0; i < 365; i++) {
      const fecha = new Date(hoy)
      fecha.setDate(hoy.getDate() - i)
      const fechaStr = formatDate(fecha)
      
      let todosCumplidos = true
      habitos.forEach(habito => {
        const diaSemana = fecha.getDay()
        const debeCompletar = habito.frecuencia === "diario" || 
          (habito.dias_semana && habito.dias_semana.includes(diaSemana))
        
        if (debeCompletar) {
          const registro = registrosHabitos.find(
            r => r.habito_id === habito.id && r.fecha === fechaStr && r.completado
          )
          if (!registro) todosCumplidos = false
        }
      })
      
      if (todosCumplidos && habitos.length > 0) {
        racha++
      } else if (i > 0) {
        break
      }
    }
    
    return racha
  }
  
  const estadisticas = calcularEstadisticasHabitos()
  
  // Editar meta
  const editarMeta = (meta: Meta) => {
    setEditingMeta(meta)
    setMetaForm({
      titulo: meta.titulo,
      descripcion: meta.descripcion || "",
      tipo: meta.tipo,
      prioridad: meta.prioridad,
      fecha_inicio: meta.fecha_inicio,
      fecha_fin: meta.fecha_fin
    })
    setShowMetaModal(true)
  }
  
  // Editar hábito
  const editarHabito = (habito: Habito) => {
    setEditingHabito(habito)
    setHabitoForm({
      nombre: habito.nombre,
      descripcion: habito.descripcion || "",
      frecuencia: habito.frecuencia,
      dias_semana: habito.dias_semana || [1, 2, 3, 4, 5],
      color: habito.color
    })
    setShowHabitoModal(true)
  }
  
  // Navegación de fechas
  const navegarFecha = (direccion: "anterior" | "siguiente") => {
    const newDate = new Date(currentDate)
    if (viewMode === "semana") {
      newDate.setDate(newDate.getDate() + (direccion === "anterior" ? -7 : 7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direccion === "anterior" ? -1 : 1))
    }
    setCurrentDate(newDate)
  }
  
  const isHabitoCompletado = (habitoId: string, fecha: string): boolean => {
    return registrosHabitos.some(r => r.habito_id === habitoId && r.fecha === fecha && r.completado)
  }
  
  const debeCompletarHabito = (habito: Habito, fecha: Date): boolean => {
    const diaSemana = fecha.getDay()
    return habito.frecuencia === "diario" || 
      (habito.dias_semana !== null && habito.dias_semana.includes(diaSemana))
  }
  
  // Calcular progreso del día
  const calcularProgresoDia = (fecha: Date): number => {
    const fechaStr = formatDate(fecha)
    let total = 0
    let completados = 0
    
    habitos.forEach(habito => {
      if (debeCompletarHabito(habito, fecha)) {
        total++
        if (isHabitoCompletado(habito.id, fechaStr)) completados++
      }
    })
    
    return total > 0 ? Math.round((completados / total) * 100) : 0
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Hábitos Activos</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-500">{estadisticas.totalHabitos}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-500/20 rounded-full">
                <ListTodo className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Completados Hoy</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-500">{estadisticas.completadosHoy}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-500/20 rounded-full">
                <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Progreso Semanal</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-500">{estadisticas.porcentajeSemanal}%</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-500/20 rounded-full">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Racha Actual</p>
                <p className="text-2xl sm:text-3xl font-bold text-orange-500">{estadisticas.rachaActual} <span className="text-base sm:text-xl">días</span></p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-500/20 rounded-full">
                <Flame className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 h-auto p-1">
          <TabsTrigger value="tareas" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white group px-2 py-2 sm:py-2.5">
            <CheckCircle2 className="h-4 w-4 text-blue-600 group-data-[state=active]:text-white" />
            <span className="text-blue-600 group-data-[state=active]:text-white font-medium text-xs sm:text-sm hidden sm:inline">Tareas del Día</span>
            <span className="text-blue-600 group-data-[state=active]:text-white font-medium text-xs sm:hidden">Tareas</span>
          </TabsTrigger>
      <TabsTrigger value="habitos" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white group px-2 py-2 sm:py-2.5">
        <ListTodo className="h-4 w-4 text-amber-600 group-data-[state=active]:text-white" />
        <span className="text-amber-600 group-data-[state=active]:text-white font-medium text-xs sm:text-sm hidden sm:inline">Hábitos Diarios</span>
        <span className="text-amber-600 group-data-[state=active]:text-white font-medium text-xs sm:hidden">Hábitos</span>
      </TabsTrigger>
      <TabsTrigger value="recurrentes" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-cyan-600 data-[state=active]:text-white group px-2 py-2 sm:py-2.5">
        <Repeat className="h-4 w-4 text-cyan-600 group-data-[state=active]:text-white" />
        <span className="text-cyan-600 group-data-[state=active]:text-white font-medium text-xs sm:text-sm hidden sm:inline">Tareas Programadas</span>
        <span className="text-cyan-600 group-data-[state=active]:text-white font-medium text-xs sm:hidden">Programadas</span>
      </TabsTrigger>
          <TabsTrigger value="metas" className="flex items-center justify-center gap-1 sm:gap-2 data-[state=active]:bg-green-600 data-[state=active]:text-white group px-2 py-2 sm:py-2.5">
            <Target className="h-4 w-4 text-green-600 group-data-[state=active]:text-white" />
            <span className="text-green-600 group-data-[state=active]:text-white font-medium text-xs sm:text-sm hidden sm:inline">Metas y Plan de Acción</span>
            <span className="text-green-600 group-data-[state=active]:text-white font-medium text-xs sm:hidden">Metas</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Tab de Tareas del Día */}
        <TabsContent value="tareas" className="space-y-4">
          {/* Botón para nueva tarea */}
          <div className="flex justify-end">
            <Button onClick={() => { setTareaForm({ titulo: "", prioridad: "media" }); setEditingTarea(null); setShowTareaModal(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Tarea
            </Button>
          </div>
          
          {Object.keys(tareasPorFecha).length === 0 ? (
            <Card className="border-blue-200">
              <CardContent className="py-12">
                <div className="text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-blue-200 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes tareas registradas</h3>
                  <p className="text-muted-foreground mb-4">Agrega tareas para organizar tu día</p>
                  <Button onClick={() => { setTareaForm({ titulo: "", prioridad: "media" }); setShowTareaModal(true); }} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primera tarea
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.keys(tareasPorFecha).sort((a, b) => b.localeCompare(a)).map((fecha) => {
                const tareas = tareasPorFecha[fecha]
                const fechaObj = new Date(fecha + "T12:00:00")
                const esHoy = fecha === getParaguayDateString()
                
                return (
                  <Card key={fecha} className={`border-blue-200 ${esHoy ? "ring-2 ring-blue-400" : ""}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-blue-600 flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {esHoy ? "Hoy - " : ""}{fechaObj.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                        {esHoy && <Badge variant="default" className="ml-2 bg-blue-600">Hoy</Badge>}
                      </CardTitle>
                      <CardDescription>
                        {tareas.filter(t => t.completada).length} de {tareas.length} completadas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {[...tareas].sort((a, b) => {
                          // Primero las pendientes (no completadas), luego las completadas
                          if (a.completada !== b.completada) {
                            return a.completada ? 1 : -1
                          }
                          // Mantener el orden original dentro de cada grupo
                          return 0
                        }).map((tarea) => (
                          <div 
                            key={tarea.id} 
                            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                              tarea.completada ? "bg-green-50 border-green-200" : "bg-card hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Checkbox 
                                checked={tarea.completada} 
                                onCheckedChange={async (checked) => {
                                  await supabase.from("tareas_meta").update({ completada: checked }).eq("id", tarea.id)
                                  cargarDatos()
                                }}
                                className="h-5 w-5 rounded-full"
                              />
                              <div>
                                <p className={`font-medium ${tarea.completada ? "line-through text-muted-foreground" : ""}`}>
                                  {tarea.titulo}
                                </p>
                                <Badge variant={tarea.prioridad === "alta" ? "destructive" : tarea.prioridad === "media" ? "default" : "secondary"} className="text-xs">
                                  {tarea.prioridad}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => { setEditingTarea(tarea); setTareaForm({ titulo: tarea.titulo, prioridad: tarea.prioridad }); setShowTareaModal(true); }}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Editar tarea"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setDeletingTarea(tarea.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Eliminar tarea"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        
                        {/* Progreso del día */}
                        <div className="mt-4 pt-4 border-t flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                              Progreso del día
                            </span>
                            <Progress 
                              value={(tareas.filter(t => t.completada).length / tareas.length) * 100} 
                              className="w-32 h-2" 
                            />
                          </div>
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round((tareas.filter(t => t.completada).length / tareas.length) * 100)}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Tab de Hábitos */}
          <TabsContent value="habitos" className="space-y-4">
            {/* Título de sección */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Hábitos Diarios
                </h2>
                <p className="text-muted-foreground">Construye hábitos positivos con seguimiento diario</p>
              </div>
            </div>
            
            {/* Controles de navegación y visualización de hábitos */}
            <Card className="border-amber-200">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => navegarFecha("anterior")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center min-w-[200px]">
                    <p className="font-semibold">
                      {currentDate.toLocaleDateString("es-ES", { 
                        month: "long", 
                        year: "numeric" 
                      })}
                    </p>
                    {viewMode === "semana" && (
                      <p className="text-sm text-muted-foreground">
                        Semana {getWeekNumber(currentDate)}
                      </p>
                    )}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => navegarFecha("siguiente")}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select value={viewMode} onValueChange={(v) => setViewMode(v as "semana" | "mes")}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semana">Semana</SelectItem>
                      <SelectItem value="mes">Mes</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button onClick={() => { resetHabitoForm(); setEditingHabito(null); setShowHabitoModal(true); }} className="bg-amber-500 hover:bg-amber-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Hábito
                  </Button>
                </div>
              </div>
              
              {habitos.length === 0 ? (
                <div className="text-center py-12">
                  <ListTodo className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes hábitos configurados</h3>
                  <p className="text-muted-foreground mb-4">Comienza agregando hábitos para hacer seguimiento diario</p>
                  <Button onClick={() => { resetHabitoForm(); setShowHabitoModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar primer hábito
                  </Button>
                </div>
              ) : viewMode === "semana" ? (
                /* Vista semanal */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="text-left p-2 min-w-[200px]">Hábito</th>
                        {getWeekDates(currentDate).map((fecha, idx) => {
                          const isToday = formatDate(fecha) === getParaguayDateString()
                          return (
                            <th key={idx} className={`text-center p-2 min-w-[80px] ${isToday ? "bg-primary/20 rounded-t-lg" : ""}`}>
                              <div className="text-xs text-muted-foreground">{DIAS_SEMANA[getDiaSemanaIndex(fecha)]}</div>
                              <div className={`text-lg font-bold ${isToday ? "text-primary" : ""}`}>
                                {fecha.getDate()}
                              </div>
                            </th>
                          )
                        })}
                        <th className="text-center p-2 min-w-[80px]">Progreso</th>
                        <th className="text-center p-2 min-w-[100px]">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {habitos.map(habito => {
                        const diasSemana = getWeekDates(currentDate)
                        const completadosSemana = diasSemana.filter(d => 
                          debeCompletarHabito(habito, d) && isHabitoCompletado(habito.id, formatDate(d))
                        ).length
                        const totalSemana = diasSemana.filter(d => debeCompletarHabito(habito, d)).length
                        const porcentaje = totalSemana > 0 ? Math.round((completadosSemana / totalSemana) * 100) : 0
                        
                        return (
                          <tr key={habito.id} className="border-t border-border/50 hover:bg-muted/30">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: habito.color }}
                                />
                                <span className="font-medium">{habito.nombre}</span>
                              </div>
                              {habito.descripcion && (
                                <p className="text-xs text-muted-foreground mt-1">{habito.descripcion}</p>
                              )}
                            </td>
                            {diasSemana.map((fecha, idx) => {
                              const fechaStr = formatDate(fecha)
                              const debeCompletar = debeCompletarHabito(habito, fecha)
                              const completado = isHabitoCompletado(habito.id, fechaStr)
                              const isToday = fechaStr === getParaguayDateString()
                              const isFuture = fecha > getParaguayDate()
                              
                              return (
                                <td key={idx} className={`text-center p-2 ${isToday ? "bg-primary/20" : ""}`}>
                                  {debeCompletar ? (
                                    <button
                                      onClick={() => !isFuture && toggleRegistroHabito(habito.id, fechaStr, !completado)}
                                      disabled={isFuture}
                                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all mx-auto ${
                                        isFuture 
                                          ? "bg-muted/30 cursor-not-allowed" 
                                          : completado 
                                            ? "bg-green-500 text-white shadow-lg shadow-green-500/30" 
                                            : "bg-muted/50 hover:bg-muted"
                                      }`}
                                    >
                                      {completado ? (
                                        <CheckCircle2 className="h-5 w-5" />
                                      ) : (
                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </button>
                                  ) : (
                                    <span className="text-muted-foreground/30">-</span>
                                  )}
                                </td>
                              )
                            })}
                            <td className="text-center p-2">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-bold" style={{ color: habito.color }}>
                                  {porcentaje}%
                                </span>
                                <Progress value={porcentaje} className="w-16 h-2" />
                              </div>
                            </td>
                            <td className="text-center p-2">
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                                  onClick={() => editarHabito(habito)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                  onClick={() => setDeleteConfirm({ type: "habito", id: habito.id })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border">
                        <td className="p-2 font-semibold">Progreso del día</td>
                        {getWeekDates(currentDate).map((fecha, idx) => {
                          const progreso = calcularProgresoDia(fecha)
                          const isToday = formatDate(fecha) === getParaguayDateString()
                          return (
                            <td key={idx} className={`text-center p-2 ${isToday ? "bg-primary/20 rounded-b-lg" : ""}`}>
                              <div className={`text-sm font-bold ${
                                progreso >= 80 ? "text-green-500" :
                                progreso >= 50 ? "text-yellow-500" :
                                progreso > 0 ? "text-orange-500" : "text-muted-foreground"
                              }`}>
                                {progreso}%
                              </div>
                            </td>
                          )
                        })}
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                /* Vista mensual */
                <div className="space-y-4">
                  {getMonthWeeks(currentDate).map((week, weekIdx) => (
                    <div key={weekIdx} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-2 font-semibold flex items-center justify-between">
                        <span>Semana {weekIdx + 1}</span>
                        <div className="flex gap-4">
                          {week.map((fecha, idx) => {
                            const isCurrentMonth = fecha.getMonth() === currentDate.getMonth()
                            const isToday = formatDate(fecha) === getParaguayDateString()
                            return (
                              <div 
                                key={idx} 
                                className={`text-center min-w-[60px] ${!isCurrentMonth ? "opacity-30" : ""}`}
                              >
                                <div className="text-xs text-muted-foreground">{DIAS_SEMANA[getDiaSemanaIndex(fecha)]}</div>
                                <div className={`text-sm font-medium ${isToday ? "text-primary bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}>
                                  {fecha.getDate()}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                      <div className="divide-y divide-border/50">
                        {habitos.map(habito => (
                          <div key={habito.id} className="flex items-center px-4 py-2 hover:bg-muted/30">
                            <div className="flex items-center gap-2 min-w-[180px]">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: habito.color }}
                              />
                              <span className="text-sm font-medium truncate">{habito.nombre}</span>
                            </div>
                            <div className="flex gap-4 ml-auto">
                              {week.map((fecha, idx) => {
                                const fechaStr = formatDate(fecha)
                                const isCurrentMonth = fecha.getMonth() === currentDate.getMonth()
                                const debeCompletar = debeCompletarHabito(habito, fecha)
                                const completado = isHabitoCompletado(habito.id, fechaStr)
                                const isFuture = fecha > getParaguayDate()
                                
                                return (
                                  <div key={idx} className={`min-w-[60px] flex justify-center ${!isCurrentMonth ? "opacity-30" : ""}`}>
                                    {debeCompletar && isCurrentMonth ? (
                                      <button
                                        onClick={() => !isFuture && toggleRegistroHabito(habito.id, fechaStr, !completado)}
                                        disabled={isFuture || !isCurrentMonth}
                                        className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                                          isFuture 
                                            ? "bg-muted/30 cursor-not-allowed" 
                                            : completado 
                                              ? "bg-green-500 text-white" 
                                              : "bg-muted/50 hover:bg-muted border border-border"
                                        }`}
                                      >
                                        {completado && <CheckCircle2 className="h-4 w-4" />}
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground/30 text-xs">-</span>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Gráfico de progreso semanal */}
          {habitos.length > 0 && (
            <Card>
              <CardHeader>
<CardTitle className="flex items-center gap-2 text-amber-600">
                    <BarChart3 className="h-5 w-5" />
                    Progreso por Día
                  </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-4">
                  {getWeekDates(currentDate).map((fecha, idx) => {
                    const progreso = calcularProgresoDia(fecha)
                    const isToday = formatDate(fecha) === getParaguayDateString()
                    const isFuture = fecha > getParaguayDate()
                    
                    return (
                      <div key={idx} className="flex flex-col items-center gap-2">
                        <div className="relative">
                          <svg className="w-16 h-16 transform -rotate-90">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="transparent"
                              className="text-muted/30"
                            />
                            {!isFuture && (
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="transparent"
                                strokeDasharray={`${progreso * 1.76} 176`}
                                className={`${
                                  progreso >= 80 ? "text-green-500" :
                                  progreso >= 50 ? "text-yellow-500" :
                                  progreso > 0 ? "text-orange-500" : "text-muted"
                                }`}
                              />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-sm font-bold ${isFuture ? "text-muted-foreground" : ""}`}>
                              {isFuture ? "-" : `${progreso}%`}
                            </span>
                          </div>
                        </div>
                        <div className={`text-center ${isToday ? "bg-primary/20 px-3 py-1 rounded-full" : ""}`}>
                          <p className={`text-xs ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                            {DIAS_SEMANA_COMPLETO[getDiaSemanaIndex(fecha)]}
                          </p>
                          <p className={`text-xs ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                            {fecha.getDate()}/{fecha.getMonth() + 1}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Progreso Mensual - Al final */}
          {habitos.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-600 flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5" />
                  Progreso del Mes - {currentDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {habitos.map(habito => {
                    const diasDelMes = getDaysInMonth(currentDate)
                    const completadosMes = diasDelMes.filter(d => 
                      debeCompletarHabito(habito, d) && isHabitoCompletado(habito.id, formatDate(d))
                    ).length
                    const totalMes = diasDelMes.filter(d => debeCompletarHabito(habito, d)).length
                    const porcentajeMes = totalMes > 0 ? Math.round((completadosMes / totalMes) * 100) : 0
                    
                    return (
  <div key={habito.id} className="bg-white rounded-lg p-3 border border-amber-100 shadow-sm">
  <div className="flex items-center gap-2 mb-2">
  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: habito.color }} />
  <p className="font-medium text-sm truncate text-black">{habito.nombre}</p>
  </div>
  <div className="space-y-1">
  <div className="flex items-center justify-between text-xs text-gray-700">
  <span>{completadosMes}/{totalMes} días</span>
                            <span className="font-bold text-amber-600">{porcentajeMes}%</span>
                          </div>
                          <Progress value={porcentajeMes} className="h-1.5" />
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Resumen general del mes */}
                <div className="mt-4 pt-4 border-t border-amber-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-700">Progreso Total del Mes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-amber-600">
                        {habitos.length > 0 ? Math.round(habitos.reduce((acc, habito) => {
                          const diasDelMes = getDaysInMonth(currentDate)
                          const completadosMes = diasDelMes.filter(d => 
                            debeCompletarHabito(habito, d) && isHabitoCompletado(habito.id, formatDate(d))
                          ).length
                          const totalMes = diasDelMes.filter(d => debeCompletarHabito(habito, d)).length
                          return acc + (totalMes > 0 ? (completadosMes / totalMes) * 100 : 0)
                        }, 0) / habitos.length) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
  </TabsContent>
      
      {/* Tab de Tareas Programadas */}
      <TabsContent value="recurrentes" className="space-y-4">
        {/* Navegacion Semana Actual / Proxima Semana */}
        <div className="flex items-center justify-center gap-3 mb-1">
          <button
            onClick={() => setVerDiasFuturos(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 text-sm font-medium">
            <button
              onClick={() => setVerDiasFuturos(false)}
              className={`transition-colors ${!verDiasFuturos ? "text-foreground" : "text-muted-foreground hover:text-foreground cursor-pointer"}`}
            >
              Semana Actual
            </button>
            <span className="text-muted-foreground/40">-</span>
            <button
              onClick={() => setVerDiasFuturos(true)}
              className={`transition-colors ${verDiasFuturos ? "text-foreground" : "text-muted-foreground hover:text-foreground cursor-pointer"}`}
            >
              Proxima Semana
            </button>
          </div>
          <button
            onClick={() => setVerDiasFuturos(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Header: Titulo + Boton Nueva Tarea */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              Tareas Recurrentes
            </h2>
            <p className="text-sm text-muted-foreground">
              Aqui puedes visualizar todas tus tareas pendientes programadas para la semana.
            </p>
          </div>
          <Button onClick={() => setShowHabitoRecurrenteModal(true)} className="bg-cyan-600 hover:bg-cyan-700 shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>

        {/* Vista semanal en columnas */}
        {(() => {
          const hoy = getParaguayDate()
          hoy.setHours(0, 0, 0, 0)

          // Calcular inicio de la semana (Domingo)
          const inicioSemana = new Date(hoy)
          const diaSemanaHoy = hoy.getDay()
          inicioSemana.setDate(hoy.getDate() - diaSemanaHoy)

          if (verDiasFuturos) {
            inicioSemana.setDate(inicioSemana.getDate() + 7)
          }

          const diasSemana: { fecha: Date; nombre: string; nombreCorto: string }[] = []
          const NOMBRES_DIAS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
          const COLORES_DIAS = [
            "bg-red-500/80 text-white",
            "bg-blue-500/80 text-white",
            "bg-slate-500/80 text-white",
            "bg-slate-600/80 text-white",
            "bg-emerald-500/80 text-white",
            "bg-amber-600/80 text-white",
            "bg-purple-500/80 text-white",
          ]

          for (let i = 0; i < 7; i++) {
            const fecha = new Date(inicioSemana)
            fecha.setDate(inicioSemana.getDate() + i)
            const nombreDia = fecha.toLocaleDateString("es-PY", { weekday: "long" })
            diasSemana.push({
              fecha,
              nombre: nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1),
              nombreCorto: NOMBRES_DIAS[i],
            })
          }

          // Agrupar tareas por cada dia de la semana
          const tareasPorDiaSemana: Record<number, { tarea: HabitoRecurrente; fecha: string; completada: boolean }[]> = {}
          for (let i = 0; i < 7; i++) {
            tareasPorDiaSemana[i] = []
          }

          const finSemana = new Date(inicioSemana)
          finSemana.setDate(inicioSemana.getDate() + 6)

          habitosRecurrentes.forEach((tarea) => {
            const ocurrencias = calcularOcurrencias(tarea, inicioSemana, finSemana)
            ocurrencias.forEach((oc) => {
              const fechaOc = new Date(oc.fecha + "T12:00:00")
              const diaIndex = Math.round((fechaOc.getTime() - inicioSemana.getTime()) / (1000 * 60 * 60 * 24))
              if (diaIndex >= 0 && diaIndex < 7) {
                const clave = `${tarea.id}-${oc.fecha}`
                // No mostrar ocurrencias excluidas (eliminadas de un dia especifico)
                if (ocurrenciasExcluidas.has(clave)) return
                const completada = registrosHabitosRecurrentes[clave] || false
                tareasPorDiaSemana[diaIndex].push({ tarea, fecha: oc.fecha, completada })
              }
            })
          })

          const COLORES_BADGE: Record<number, string> = {
            1: "bg-blue-600 text-white",
            2: "bg-orange-500 text-white",
            3: "bg-cyan-600 text-white",
            7: "bg-green-600 text-white",
            14: "bg-purple-600 text-white",
            30: "bg-red-600 text-white",
          }

          const getBadgeColor = (dias: number) => {
            return COLORES_BADGE[dias] || "bg-slate-600 text-white"
          }

          return (
            <>
              {/* Vista Desktop: Tabs + Grid de columnas */}
              <div className="hidden md:block">
                {/* Tabs de dias */}
                <div className="flex gap-0">
                  {diasSemana.map((dia, i) => {
                    const esHoyDia = dia.fecha.getTime() === hoy.getTime()
                    return (
                      <div
                        key={i}
                        className={`flex-1 text-center py-2 px-1 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
                          esHoyDia
                            ? `${COLORES_DIAS[i]} border-transparent`
                            : "bg-muted/50 text-muted-foreground border-border/30"
                        }`}
                      >
                        {dia.nombreCorto}
                      </div>
                    )
                  })}
                </div>

                {/* Grid de columnas */}
                <div className="grid grid-cols-7 border border-border/30 rounded-b-lg overflow-hidden min-h-[300px]">
                  {diasSemana.map((dia, i) => {
                    const tareasDia = tareasPorDiaSemana[i]
                    const esHoyDia = dia.fecha.getTime() === hoy.getTime()

                    return (
                      <div
                        key={i}
                        className={`border-r last:border-r-0 border-border/20 p-2 flex flex-col gap-0 ${
                          esHoyDia ? "bg-cyan-500/5" : "bg-card"
                        }`}
                      >
                        <p className={`text-xs font-semibold mb-2 ${esHoyDia ? "text-cyan-400" : "text-muted-foreground"}`}>
                          {dia.nombre}
                        </p>

                        {tareasDia.length > 0 ? (
                          <div className="space-y-3">
                            {tareasDia.map(({ tarea, fecha: fechaTarea, completada }) => (
                              <div key={`${tarea.id}-${fechaTarea}`} className="pb-2.5 border-b border-border/10 last:border-b-0 last:pb-0">
                                <div className="flex items-start gap-1.5">
                                  <button
                                    onClick={() => toggleTareaProgramada(tarea.id, fechaTarea, !completada)}
                                    className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                      completada
                                        ? "bg-cyan-600 border-cyan-600"
                                        : "border-muted-foreground/40 hover:border-cyan-500"
                                    }`}
                                  >
                                    {completada && (
                                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <span className={`text-xs font-medium leading-tight ${completada ? "line-through text-muted-foreground/50" : ""}`}>
                                    {tarea.nombre}
                                  </span>
                                </div>
                                <div className="ml-5 mt-1">
                                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium ${getBadgeColor(tarea.intervalo_dias)}`}>
                                    {getIntervaloLabel(tarea.intervalo_dias)}
                                  </span>
                                </div>
                                <div className="ml-5 mt-1 flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setTareaAFinalizar(tarea)
                                      setFechaFinTarea(tarea.fecha_fin || "")
                                    }}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors font-medium"
                                  >
                                    Finalizar
                                  </button>
                                  <span className="text-border/40">|</span>
                                  <button
                                    onClick={() => confirmarEliminarTarea(tarea.id, fechaTarea, tarea.nombre)}
                                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground/40 italic mt-2">Sin tareas</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Vista Movil: Cards por dia */}
              <div className="md:hidden space-y-3">
                {diasSemana.map((dia, i) => {
                  const tareasDia = tareasPorDiaSemana[i]
                  const esHoyDia = dia.fecha.getTime() === hoy.getTime()
                  
                  // Saltar dias sin tareas en movil
                  if (tareasDia.length === 0) return null

                  return (
                    <Card key={i} className={`${esHoyDia ? "border-2 border-cyan-500" : "border-border"}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-md text-sm font-bold ${COLORES_DIAS[i]}`}>
                              {dia.nombreCorto}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{dia.nombre}</p>
                              <p className="text-xs text-muted-foreground">
                                {dia.fecha.toLocaleDateString("es-PY", { day: "numeric", month: "short" })}
                              </p>
                            </div>
                          </div>
                          {esHoyDia && (
                            <Badge className="bg-cyan-600 text-white">Hoy</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {tareasDia.map(({ tarea, fecha: fechaTarea, completada }) => (
                          <div key={`${tarea.id}-${fechaTarea}`} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleTareaProgramada(tarea.id, fechaTarea, !completada)}
                                className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                                  completada
                                    ? "bg-cyan-600 border-cyan-600"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {completada && (
                                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${completada ? "line-through text-muted-foreground" : ""}`}>
                                  {tarea.nombre}
                                </p>
                                <div className="mt-2">
                                  <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${getBadgeColor(tarea.intervalo_dias)}`}>
                                    {getIntervaloLabel(tarea.intervalo_dias)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                  <button
                                    onClick={() => {
                                      setTareaAFinalizar(tarea)
                                      setFechaFinTarea(tarea.fecha_fin || "")
                                    }}
                                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                                  >
                                    Finalizar
                                  </button>
                                  <span className="text-border/40">|</span>
                                  <button
                                    onClick={() => confirmarEliminarTarea(tarea.id, fechaTarea, tarea.nombre)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Mensaje si no hay tareas en la semana */}
                {diasSemana.every((dia, i) => tareasPorDiaSemana[i].length === 0) && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-8">
                      <Calendar className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground text-center">
                        No hay tareas programadas para {verDiasFuturos ? "la proxima semana" : "esta semana"}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {habitosRecurrentes.length === 0 && (
                <Card className="border-2 border-dashed border-cyan-500/30">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Repeat className="w-12 h-12 text-cyan-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sin tareas programadas</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Crea tu primera tarea programada para organizar actividades recurrentes
                    </p>
                    <Button onClick={() => setShowHabitoRecurrenteModal(true)} className="bg-cyan-600 hover:bg-cyan-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Primera Tarea
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )
        })()}
      </TabsContent>
      
      <TabsContent value="metas" className="space-y-4">
        <div className="flex items-center justify-between">
        <div>
        <h2 className="text-xl font-bold text-green-600 flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Mis Metas y Plan de Acción
                </h2>
                <p className="text-muted-foreground">Establece y da seguimiento a tus objetivos personales</p>
              </div>
              <Button onClick={() => { resetMetaForm(); setEditingMeta(null); setShowMetaModal(true); }} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Meta
              </Button>
            </div>
          
          {metas.length === 0 ? (
            <Card>
              <CardContent className="pt-12 pb-12">
                <div className="text-center">
                  <Target className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes metas configuradas</h3>
                  <p className="text-muted-foreground mb-4">Define tus metas semanales, mensuales o anuales</p>
                  <Button onClick={() => { resetMetaForm(); setShowMetaModal(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primera meta
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Filtros por tipo */}
              <div className="flex gap-2 flex-wrap">
                {["todas", "semanal", "mensual", "anual"].map(tipo => {
                  const count = tipo === "todas" 
                    ? metas.length 
                    : metas.filter(m => m.tipo === tipo).length
                  return (
                    <Badge 
                      key={tipo} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/20 capitalize"
                    >
                      {tipo} ({count})
                    </Badge>
                  )
                })}
              </div>
              
              {/* Lista de metas */}
              <div className="grid gap-4 md:grid-cols-2">
                {metas.map(meta => {
                  const tareas = tareasMetas.filter(t => t.meta_id === meta.id)
                  const tareasCompletadas = tareas.filter(t => t.completada).length
                  
                  return (
                    <Card key={meta.id} className="overflow-hidden">
                      <div className={`h-1 ${
                        meta.estado === "completada" ? "bg-green-500" :
                        meta.estado === "en_progreso" ? "bg-blue-500" :
                        meta.estado === "cancelada" ? "bg-red-500" : "bg-muted"
                      }`} />
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{meta.titulo}</CardTitle>
                            {meta.descripcion && (
                              <CardDescription>{meta.descripcion}</CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              meta.tipo === "semanal" ? "default" :
                              meta.tipo === "mensual" ? "secondary" : "outline"
                            } className="capitalize">
                              {meta.tipo}
                            </Badge>
                            <Badge variant={
                              meta.prioridad === "alta" ? "destructive" :
                              meta.prioridad === "media" ? "default" : "secondary"
                            } className="capitalize">
                              {meta.prioridad}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Progreso */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Progreso</span>
                            <span className="font-semibold">{meta.valor_objetivo > 0 ? Math.round((meta.valor_actual / meta.valor_objetivo) * 100) : 0}%</span>
                          </div>
                          <Progress value={meta.valor_objetivo > 0 ? Math.round((meta.valor_actual / meta.valor_objetivo) * 100) : 0} className="h-2" />
                        </div>
                        
                        {/* Fechas */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Inicio: {new Date(meta.fecha_inicio).toLocaleDateString("es-ES")}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Fin: {new Date(meta.fecha_fin).toLocaleDateString("es-ES")}</span>
                          </div>
                        </div>
                        
                        {/* Tareas */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Tareas ({tareasCompletadas}/{tareas.length})
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setNewTarea({ metaId: meta.id, titulo: "" })}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agregar
                            </Button>
                          </div>
                          
                          {newTarea?.metaId === meta.id && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Nueva tarea..."
                                value={newTarea.titulo}
                                onChange={(e) => setNewTarea({ ...newTarea, titulo: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && newTarea.titulo.trim()) {
                                    agregarTarea(meta.id, newTarea.titulo.trim())
                                  }
                                }}
                                autoFocus
                              />
                              <Button 
                                size="sm"
                                onClick={() => {
                                  if (newTarea.titulo.trim()) {
                                    agregarTarea(meta.id, newTarea.titulo.trim())
                                  }
                                }}
                              >
                                Agregar
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setNewTarea(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                          
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {tareas.map(tarea => (
                              <div 
                                key={tarea.id}
                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                              >
                                <Checkbox
                                  checked={tarea.completada}
                                  onCheckedChange={() => toggleTarea(tarea.id, meta.id)}
                                />
                                <span className={`flex-1 text-sm ${tarea.completada ? "line-through text-muted-foreground" : ""}`}>
                                  {tarea.titulo}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600"
                                  onClick={() => eliminarTarea(tarea.id, meta.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            {tareas.length === 0 && (
                              <p className="text-sm text-muted-foreground text-center py-2">
                                No hay tareas. Agrega una para empezar.
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Acciones */}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10 bg-transparent"
                            onClick={() => editarMeta(meta)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 border-red-500/50 hover:bg-red-500/10 bg-transparent"
                            onClick={() => setDeleteConfirm({ type: "meta", id: meta.id })}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Modal de Meta */}
      <Dialog open={showMetaModal} onOpenChange={setShowMetaModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-600">{editingMeta ? "Editar Meta" : "Nueva Meta"}</DialogTitle>
            <DialogDescription>
              {editingMeta ? "Modifica los detalles de tu meta" : "Define una nueva meta para alcanzar"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                placeholder="Ej: Ahorrar para vacaciones"
                value={metaForm.titulo}
                onChange={(e) => setMetaForm({ ...metaForm, titulo: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                placeholder="Describe tu meta..."
                value={metaForm.descripcion}
                onChange={(e) => setMetaForm({ ...metaForm, descripcion: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select 
                  value={metaForm.tipo} 
                  onValueChange={(v) => setMetaForm({ ...metaForm, tipo: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select 
                  value={metaForm.prioridad} 
                  onValueChange={(v) => setMetaForm({ ...metaForm, prioridad: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={metaForm.fecha_inicio}
                  onChange={(e) => setMetaForm({ ...metaForm, fecha_inicio: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={metaForm.fecha_fin}
                  onChange={(e) => setMetaForm({ ...metaForm, fecha_fin: e.target.value })}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMetaModal(false)}>
              Cancelar
            </Button>
<Button
              onClick={guardarMeta}
              disabled={!metaForm.titulo.trim() || !metaForm.fecha_fin}
              className="bg-green-600 hover:bg-green-700"
            >
              {editingMeta ? "Guardar cambios" : "Crear meta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Hábito */}
      <Dialog open={showHabitoModal} onOpenChange={setShowHabitoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600">{editingHabito ? "Editar Hábito" : "Nuevo Hábito"}</DialogTitle>
            <DialogDescription>
              {editingHabito ? "Modifica los detalles del hábito" : "Crea un nuevo hábito para dar seguimiento"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del hábito</Label>
              <Input
                placeholder="Ej: Meditar 10 minutos"
                value={habitoForm.nombre}
                onChange={(e) => setHabitoForm({ ...habitoForm, nombre: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Detalles adicionales..."
                value={habitoForm.descripcion}
                onChange={(e) => setHabitoForm({ ...habitoForm, descripcion: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select 
                value={habitoForm.frecuencia} 
                onValueChange={(v) => setHabitoForm({ ...habitoForm, frecuencia: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Todos los días</SelectItem>
                  <SelectItem value="semanal">Días específicos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {habitoForm.frecuencia === "semanal" && (
              <div className="space-y-2">
                <Label>Días de la semana</Label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map((dia, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const dias = habitoForm.dias_semana.includes(idx)
                          ? habitoForm.dias_semana.filter(d => d !== idx)
                          : [...habitoForm.dias_semana, idx]
                        setHabitoForm({ ...habitoForm, dias_semana: dias })
                      }}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        habitoForm.dias_semana.includes(idx)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORES_HABITOS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setHabitoForm({ ...habitoForm, color })}
                    className={`w-8 h-8 rounded-full transition-all ${
                      habitoForm.color === color ? "ring-2 ring-offset-2 ring-primary" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHabitoModal(false)}>
              Cancelar
            </Button>
<Button
              onClick={guardarHabito}
              disabled={!habitoForm.nombre.trim()}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {editingHabito ? "Guardar cambios" : "Crear hábito"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Tarea del Día */}
      <Dialog open={showTareaModal} onOpenChange={setShowTareaModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-blue-600">
              {editingTarea ? "Editar Tarea" : "Nueva Tarea del Día"}
            </DialogTitle>
            <DialogDescription>
              Agrega una tarea para completar hoy
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="tarea-titulo">Título de la tarea</Label>
              <Input
                id="tarea-titulo"
                value={tareaForm.titulo}
                onChange={(e) => setTareaForm({ ...tareaForm, titulo: e.target.value })}
                placeholder="Ej: Revisar correos, Llamar al cliente..."
              />
            </div>
            
            <div>
              <Label>Prioridad</Label>
              <Select value={tareaForm.prioridad} onValueChange={(v) => setTareaForm({ ...tareaForm, prioridad: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTareaModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (!userId || !tareaForm.titulo.trim()) {
                    console.error("[v0] No se puede crear tarea: falta userId o título")
                    return
                  }
                  const hoy = getParaguayDateString()
                  
                  if (editingTarea) {
                    const { error } = await supabase.from("tareas_meta").update({ 
                      titulo: tareaForm.titulo, 
                      prioridad: tareaForm.prioridad 
                    }).eq("id", editingTarea.id)
                    
                    if (error) {
                      console.error("[v0] Error actualizando tarea:", error)
                      throw error
                    }
                  } else {
                    const { data, error } = await supabase.from("tareas_meta").insert({
                      perfil_id: perfilId,
                      user_id: userId,
                      titulo: tareaForm.titulo,
                      prioridad: tareaForm.prioridad,
                      fecha_limite: hoy,
                      completada: false,
                      meta_id: null
                    }).select()
                    
                    if (error) {
                      console.error("[v0] Error creando tarea del día:", error)
                      throw error
                    }
                  }
                  
                  setShowTareaModal(false)
                  setEditingTarea(null)
                  setTareaForm({ titulo: "", prioridad: "media" })
                  cargarDatos()
                } catch (error) {
                  console.error("[v0] Error en modal de tarea:", error)
                }
              }}
              disabled={!tareaForm.titulo.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingTarea ? "Guardar cambios" : "Crear tarea"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmación de eliminación de meta/hábito */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "meta" 
                ? "Esta acción eliminará la meta y todas sus tareas asociadas. Esta acción no se puede deshacer."
                : "Esta acción eliminará el hábito y todo su historial de registros. Esta acción no se puede deshacer."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={eliminar}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Confirmación de eliminación de tarea del día */}
      <AlertDialog open={!!deletingTarea} onOpenChange={() => setDeletingTarea(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarea del día</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (deletingTarea) {
                  await supabase.from("tareas_meta").delete().eq("id", deletingTarea)
                  setDeletingTarea(null)
                  cargarDatos()
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal de Tarea Programada */}
      <Dialog open={showHabitoRecurrenteModal} onOpenChange={setShowHabitoRecurrenteModal}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-cyan-500">Nueva Tarea Programada</DialogTitle>
            <DialogDescription>Crea una tarea que se repite automaticamente</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); guardarHabitoRecurrente(); }} className="space-y-4">
            <div>
              <Label htmlFor="nombre-recurrente">Nombre de la tarea</Label>
              <Input
                id="nombre-recurrente"
                value={habitoRecurrenteForm.nombre}
                onChange={(e) => setHabitoRecurrenteForm({ ...habitoRecurrenteForm, nombre: e.target.value })}
                placeholder="Ej: Limpiar Patio, Revisar Notebook..."
                required
              />
            </div>

            <div>
              <Label htmlFor="descripcion-recurrente">Descripcion (opcional)</Label>
              <Textarea
                id="descripcion-recurrente"
                value={habitoRecurrenteForm.descripcion}
                onChange={(e) => setHabitoRecurrenteForm({ ...habitoRecurrenteForm, descripcion: e.target.value })}
                placeholder="Detalles adicionales"
                rows={2}
              />
            </div>

            <div>
              <Label>Repetir cada</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: 1, label: "Diario" },
                  { value: 2, label: "Cada 2 dias" },
                  { value: 3, label: "Cada 3 dias" },
                  { value: 7, label: "Semanal" },
                  { value: 14, label: "Cada 2 sem." },
                  { value: 30, label: "Mensual" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHabitoRecurrenteForm({ ...habitoRecurrenteForm, intervalo_dias: opt.value })}
                    className={`p-2.5 rounded-lg border-2 text-xs font-medium text-center transition-all ${
                      habitoRecurrenteForm.intervalo_dias === opt.value
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-400"
                        : "border-border/50 hover:border-border text-muted-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fecha-inicio-recurrente">Fecha de inicio</Label>
                <Input
                  id="fecha-inicio-recurrente"
                  type="date"
                  value={habitoRecurrenteForm.fecha_inicio}
                  onChange={(e) => setHabitoRecurrenteForm({ ...habitoRecurrenteForm, fecha_inicio: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="fecha-fin-recurrente">Fecha fin (opcional)</Label>
                <Input
                  id="fecha-fin-recurrente"
                  type="date"
                  value={habitoRecurrenteForm.fecha_fin}
                  onChange={(e) => setHabitoRecurrenteForm({ ...habitoRecurrenteForm, fecha_fin: e.target.value })}
                  min={habitoRecurrenteForm.fecha_inicio}
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setShowHabitoRecurrenteModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white" disabled={!habitoRecurrenteForm.nombre.trim() || !habitoRecurrenteForm.fecha_inicio}>
                Crear Tarea
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* AlertDialog para confirmar eliminación */}
      {/* Modal Finalizar Tarea - Desactiva la tarea de TODOS los dias */}
      <Dialog open={tareaAFinalizar !== null} onOpenChange={(open) => { if (!open) { setTareaAFinalizar(null); setFechaFinTarea(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-500">Finalizar Tarea Completa</DialogTitle>
            <DialogDescription>
              Esta accion finalizara la tarea y desaparecera de todos los dias (pasados y futuros).
            </DialogDescription>
          </DialogHeader>
          {tareaAFinalizar && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="font-medium text-sm">{tareaAFinalizar.nombre}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Frecuencia: {getIntervaloLabel(tareaAFinalizar.intervalo_dias)}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-400">
                  Al finalizar, esta tarea dejara de aparecer en el calendario semanal por completo.
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => { setTareaAFinalizar(null); setFechaFinTarea(""); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={finalizarTareaProgramada}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Finalizar Tarea
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={tareaAEliminar !== null} onOpenChange={(open) => !open && setTareaAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarea de este dia</AlertDialogTitle>
            <AlertDialogDescription>
              {tareaAEliminar && (
                <>
                  Se eliminara <span className="font-semibold">{tareaAEliminar.nombre}</span> solo del dia{" "}
                  <span className="font-semibold">
                    {new Date(tareaAEliminar.fecha + "T12:00:00").toLocaleDateString("es-PY", { weekday: "long", day: "numeric", month: "short" })}
                  </span>.
                  Las demas ocurrencias de la tarea no se veran afectadas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminarTareaProgramada} className="bg-red-600 hover:bg-red-700">
              Eliminar de este dia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
