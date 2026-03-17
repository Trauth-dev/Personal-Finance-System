"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Mic,
  MicOff,
  LayoutDashboard,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Building2,
  Banknote,
  PiggyBank,
  Volume2,
  RefreshCw,
  Save,
  X,
  Plus,
  HelpCircle,
  ChevronRight,
} from "lucide-react"
import { formatGuaranies, getTodayDate } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface TipoCategoria {
  id: string
  nombre: string
  color: string
}

interface CategoriaEgreso {
  id: string
  nombre: string
  tipo_categoria_id: string
}

interface CategoriaIngreso {
  id: string
  nombre: string
}

interface CajaAhorro {
  id: string
  nombre: string
  monto_actual: number
  moneda: string
  color: string | null
  tipo_cuenta: string | null
  banco: string | null
}

interface TarjetaCredito {
  id: string
  nombre: string
  tipo_deuda: string
  limite_credito: number | null
  monto_total: number
  monto_pagado: number
}

interface ExtractedData {
  tipo_transaccion: "ingreso" | "egreso" | null
  monto: number | null
  categoria: string | null
  subcategoria: string | null
  concepto: string | null
  fecha: string | null
  origen_destino: string | null
  usa_tarjeta_credito: boolean
  nombre_tarjeta: string | null
  confianza: "alta" | "media" | "baja"
  texto_original: string
  campos_faltantes: string[]
  sugerencias: {
    categoria_sugerida?: string
    subcategoria_sugerida?: string
    requiere_crear_categoria?: boolean
    // Para ingresos
    tipo_ingreso_sugerido?: string
    requiere_crear_ingreso?: boolean
    mensaje?: string
  }
}

interface VoiceEntryClientProps {
  userId: string
  perfilId: string
  userName: string
  tiposCategoria: TipoCategoria[]
  categoriasEgreso: CategoriaEgreso[]
  categoriasIngreso: CategoriaIngreso[]
  cajasAhorro: CajaAhorro[]
  tarjetasCredito: TarjetaCredito[]
}

export function VoiceEntryClient({
  userId,
  perfilId,
  userName,
  tiposCategoria: initialTiposCategoria,
  categoriasEgreso: initialCategoriasEgreso,
  categoriasIngreso: initialCategoriasIngreso,
  cajasAhorro: initialCajasAhorro,
  tarjetasCredito: initialTarjetasCredito,
}: VoiceEntryClientProps) {
  const router = useRouter()
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [transcripcion, setTranscripcion] = useState("")
  const [datosExtraidos, setDatosExtraidos] = useState<ExtractedData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Estados para edicion manual
  const [tipoTransaccion, setTipoTransaccion] = useState<"ingreso" | "egreso" | null>(null)
  const [monto, setMonto] = useState("")
  const [fecha, setFecha] = useState(getTodayDate())
  const [concepto, setConcepto] = useState("")
  
  // Para egresos
  const [selectedTipoCategoria, setSelectedTipoCategoria] = useState("")
  const [selectedSubcategoria, setSelectedSubcategoria] = useState("")
  const [origenTipo, setOrigenTipo] = useState<"caja_ahorro" | "tarjeta_credito" | "efectivo" | "">("")
  const [origenId, setOrigenId] = useState("")
  
  // Para ingresos
  const [selectedCategoriaIngreso, setSelectedCategoriaIngreso] = useState("")
  const [destinoCajaId, setDestinoCajaId] = useState("")

  // Dialogs
  const [showTarjetaSelector, setShowTarjetaSelector] = useState(false)
  const [showCrearCategoria, setShowCrearCategoria] = useState(false)
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("")
  const [nuevaCategoriaParaTipo, setNuevaCategoriaParaTipo] = useState("")
  
  // Dialog para crear caja de ahorro
  const [showCrearCaja, setShowCrearCaja] = useState(false)
  const [nuevaCajaNombre, setNuevaCajaNombre] = useState("")

  // Datos dinamicos
  const [tiposCategoria, setTiposCategoria] = useState(initialTiposCategoria)
  const [categoriasEgreso, setCategoriasEgreso] = useState(initialCategoriasEgreso)
  const [categoriasIngreso, setCategoriasIngreso] = useState(initialCategoriasIngreso)
  const [cajasAhorro, setCajasAhorro] = useState(initialCajasAhorro)
  const [tarjetasCredito, setTarjetasCredito] = useState(initialTarjetasCredito)

  // Refs para grabacion
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<any>(null)
  const transcripcionRef = useRef<string>("")
  const shouldProcessRef = useRef<boolean>(false)

  // Estado de resumen listo para guardar
  const [showResumen, setShowResumen] = useState(false)

  // Verificar si el navegador soporta Web Speech API
  const supportsWebSpeech = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  // Cleanup al desmontar el componente (navegacion a otra pagina)
  useEffect(() => {
    return () => {
      // Limpiar reconocimiento de voz
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch (e) {
          // Ignorar errores al abortar
        }
        recognitionRef.current = null
      }
      
      // Limpiar MediaRecorder y tracks de audio
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
          }
          mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
        } catch (e) {
          // Ignorar errores al detener
        }
        mediaRecorderRef.current = null
      }
    }
  }, [])

  // Cargar datos frescos
  const reloadData = async () => {
    const supabase = createClient()
    
    const [
      { data: tipos },
      { data: catEgreso },
      { data: catIngreso },
      { data: cajas },
      { data: tarjetas },
    ] = await Promise.all([
      supabase.from("tipos_categoria_egreso").select("id, nombre, color").eq("perfil_id", perfilId).order("nombre"),
      supabase.from("categorias_egreso").select("id, nombre, tipo_categoria_id").eq("perfil_id", perfilId).order("nombre"),
      supabase.from("categorias_ingresos").select("id, nombre").eq("perfil_id", perfilId).order("nombre"),
      supabase.from("cajas_ahorro").select("id, nombre, monto_actual, moneda, color, tipo_cuenta, banco").eq("perfil_id", perfilId).eq("activa", true).order("nombre"),
      supabase.from("deudas").select("id, nombre, tipo_deuda, limite_credito, monto_total, monto_pagado").eq("perfil_id", perfilId).eq("tipo_deuda", "tarjeta_credito").eq("estado", "activa").order("nombre"),
    ])

    if (tipos) setTiposCategoria(tipos)
    if (catEgreso) setCategoriasEgreso(catEgreso)
    if (catIngreso) setCategoriasIngreso(catIngreso)
    if (cajas) setCajasAhorro(cajas)
    if (tarjetas) setTarjetasCredito(tarjetas)
  }

  // Iniciar grabacion
  const startRecording = async () => {
    setError(null)
    setSuccess(false)
    setShowResumen(false)
    setDatosExtraidos(null)
    setTranscripcion("")
    transcripcionRef.current = ""
    shouldProcessRef.current = false
    
    // Usar Web Speech API si esta disponible
    if (supportsWebSpeech) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = "es-PY"
      recognition.continuous = true
      recognition.interimResults = true
      
      recognition.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        const newTranscript = finalTranscript || interimTranscript
        transcripcionRef.current = newTranscript
        setTranscripcion(newTranscript)
        console.log("[v0] Transcripcion actualizada:", newTranscript)
      }
      
      recognition.onerror = (event: any) => {
        // "no-speech" es un caso normal, no un error - el usuario simplemente no hablo
        if (event.error === "no-speech") {
          console.log("[v0] No se detecto voz - caso normal")
          // No mostrar error, simplemente detener silenciosamente
        } else if (event.error === "aborted") {
          console.log("[v0] Reconocimiento de voz abortado - caso normal al navegar")
          // No mostrar error cuando se aborta intencionalmente
        } else {
          console.error("[v0] Error en reconocimiento de voz:", event.error)
          setError("Error en el reconocimiento de voz. Intenta de nuevo.")
        }
        setIsRecording(false)
      }
      
      recognition.onend = () => {
        if (isRecording) {
          // Solo procesar si terminamos de grabar
        }
      }
      
      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
    } else {
      // Fallback a grabacion de audio con MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        
        audioChunksRef.current = []
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
          await processAudio(audioBlob)
        }
        
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.start()
        setIsRecording(true)
      } catch (err) {
        setError("No se pudo acceder al microfono. Verifica los permisos.")
      }
    }
  }

  // Cancelar grabacion sin procesar (para navegacion)
  const cancelRecording = () => {
    setIsRecording(false)
    setTranscripcion("")
    transcripcionRef.current = ""
    
    if (recognitionRef.current) {
      recognitionRef.current.abort() // Usar abort en lugar de stop para no procesar
      recognitionRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      mediaRecorderRef.current = null
    }
  }
  
  // Navegar al panel cancelando el microfono primero
  const navegarAlPanel = () => {
    cancelRecording()
    router.push("/dashboard/personal")
  }

  // Detener grabacion
  const stopRecording = async () => {
    const textoActual = transcripcionRef.current
    console.log("[v0] Deteniendo grabacion, transcripcion actual:", textoActual)
    
    setIsRecording(false)
    shouldProcessRef.current = true
    
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    
    // Procesar inmediatamente despues de detener usando el ref
    if (textoActual && textoActual.trim()) {
      console.log("[v0] Procesando texto inmediatamente:", textoActual)
      processText(textoActual)
    } else {
      console.log("[v0] No hay texto para procesar")
      setError("No se detecto ningun texto. Intenta hablar mas claro y cerca del microfono.")
    }
  }

  // Procesar audio con Whisper
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")
      formData.append("tipos_categoria", JSON.stringify(tiposCategoria))
      formData.append("categorias_egreso", JSON.stringify(categoriasEgreso))
      formData.append("categorias_ingreso", JSON.stringify(categoriasIngreso))
      formData.append("cajas_ahorro", JSON.stringify(cajasAhorro))
      formData.append("tarjetas_credito", JSON.stringify(tarjetasCredito))
      
      const response = await fetch("/api/voice-to-data", {
        method: "POST",
        body: formData,
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || "Error al procesar el audio")
      }
      
      setTranscripcion(result.transcripcion)
      handleDatosExtraidos(result.datos)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el audio")
    } finally {
      setIsProcessing(false)
    }
  }

  // Procesar texto con GPT
  const processText = async (texto: string) => {
    console.log("[v0] processText iniciado con:", texto)
    setIsProcessing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      formData.append("texto", texto)
      formData.append("tipos_categoria", JSON.stringify(tiposCategoria))
      formData.append("categorias_egreso", JSON.stringify(categoriasEgreso))
      formData.append("categorias_ingreso", JSON.stringify(categoriasIngreso))
      formData.append("cajas_ahorro", JSON.stringify(cajasAhorro))
      formData.append("tarjetas_credito", JSON.stringify(tarjetasCredito))
      
      console.log("[v0] Enviando request a /api/voice-to-data")
      const response = await fetch("/api/voice-to-data", {
        method: "POST",
        body: formData,
      })
      
      console.log("[v0] Response status:", response.status)
      
      // Manejar respuestas no-JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("[v0] Respuesta no-JSON:", textResponse)
        throw new Error("Error del servidor. Verifica que la API Key de OpenAI este configurada correctamente en Settings > Environment Variables.")
      }
      
      const result = await response.json()
      console.log("[v0] Result:", result)
      
      if (!response.ok) {
        throw new Error(result.detalle || result.error || "Error al procesar el texto")
      }
      
      console.log("[v0] Llamando handleDatosExtraidos con:", result.datos)
      handleDatosExtraidos(result.datos)
    } catch (err) {
      console.error("[v0] Error en processText:", err)
      setError(err instanceof Error ? err.message : "Error al procesar el texto")
    } finally {
      setIsProcessing(false)
    }
  }

  // Manejar datos extraidos
  const handleDatosExtraidos = (datos: ExtractedData) => {
    console.log("[v0] handleDatosExtraidos llamado con:", datos)
    setDatosExtraidos(datos)
    
    // Rellenar campos automaticamente
    setTipoTransaccion(datos.tipo_transaccion)
    setMonto(datos.monto ? String(datos.monto) : "")
    setFecha(datos.fecha || getTodayDate())
    setConcepto(datos.concepto || datos.subcategoria || "")
    
    if (datos.tipo_transaccion === "egreso") {
      // PRIMERO: Buscar si la subcategoria existe en las descripciones registradas
      let categoriaEncontrada = false
      
      if (datos.subcategoria) {
        const subcatLower = datos.subcategoria.toLowerCase()
        
        // Buscar la descripcion en categoriasEgreso
        const descripcionMatch = categoriasEgreso.find(c => 
          c.nombre.toLowerCase() === subcatLower ||
          c.nombre.toLowerCase().includes(subcatLower) ||
          subcatLower.includes(c.nombre.toLowerCase())
        )
        
        if (descripcionMatch) {
          // Encontramos la descripcion, ahora seleccionamos su categoria padre
          setSelectedSubcategoria(descripcionMatch.id)
          setSelectedTipoCategoria(descripcionMatch.tipo_categoria_id)
          categoriaEncontrada = true
          console.log("[v0] Subcategoria encontrada:", descripcionMatch.nombre, "-> Categoria:", descripcionMatch.tipo_categoria_id)
        }
      }
      
      // SEGUNDO: Si no encontramos por subcategoria, buscar por categoria directa
      if (!categoriaEncontrada && datos.categoria) {
        const tipoMatch = tiposCategoria.find(t => 
          t.nombre.toLowerCase() === datos.categoria?.toLowerCase()
        )
        if (tipoMatch) {
          setSelectedTipoCategoria(tipoMatch.id)
          console.log("[v0] Categoria encontrada directamente:", tipoMatch.nombre)
        }
      }
      
      // Determinar origen
      if (datos.usa_tarjeta_credito) {
        setOrigenTipo("tarjeta_credito")
        if (datos.nombre_tarjeta && tarjetasCredito.length > 0) {
          const tarjetaMatch = tarjetasCredito.find(t => 
            t.nombre.toLowerCase().includes(datos.nombre_tarjeta?.toLowerCase() || "")
          )
          if (tarjetaMatch) {
            setOrigenId(tarjetaMatch.id)
          } else if (tarjetasCredito.length === 1) {
            setOrigenId(tarjetasCredito[0].id)
          } else if (tarjetasCredito.length > 1) {
            setShowTarjetaSelector(true)
          }
        }
      } else if (datos.origen_destino) {
        const origenLower = datos.origen_destino.toLowerCase()
        
        // Buscar coincidencia en cajas de ahorro (busqueda mas flexible)
        const cajaMatch = cajasAhorro.find(c => {
          const nombreCaja = c.nombre.toLowerCase()
          // Coincidencia si el origen contiene el nombre de la caja o viceversa
          return nombreCaja.includes(origenLower) || 
                 origenLower.includes(nombreCaja) ||
                 // Tambien buscar palabras clave como "caja" + nombre
                 origenLower.includes("caja " + nombreCaja) ||
                 origenLower.includes("cuenta " + nombreCaja)
        })
        
        if (cajaMatch) {
          setOrigenTipo("caja_ahorro")
          setOrigenId(cajaMatch.id)
        } else if (origenLower.includes("efectivo") || origenLower.includes("cash")) {
          setOrigenTipo("efectivo")
        } else {
          // Si no encontro match exacto, buscar por palabras parciales
          const cajaMatchParcial = cajasAhorro.find(c => {
            const palabrasCaja = c.nombre.toLowerCase().split(" ")
            const palabrasOrigen = origenLower.split(" ")
            // Ver si alguna palabra del origen coincide con alguna palabra de la caja
            return palabrasCaja.some(p => palabrasOrigen.includes(p) && p.length > 2)
          })
          
          if (cajaMatchParcial) {
            setOrigenTipo("caja_ahorro")
            setOrigenId(cajaMatchParcial.id)
          }
        }
      }
    } else if (datos.tipo_transaccion === "ingreso") {
      // Buscar tipo de ingreso - busqueda flexible
      let tipoIngresoEncontrado = false
      
      if (datos.categoria) {
        const catLower = datos.categoria.toLowerCase()
        
        // Buscar coincidencia exacta o parcial
        const catMatch = categoriasIngreso.find(c => 
          c.nombre.toLowerCase() === catLower ||
          c.nombre.toLowerCase().includes(catLower) ||
          catLower.includes(c.nombre.toLowerCase())
        )
        
        if (catMatch) {
          setSelectedCategoriaIngreso(catMatch.id)
          tipoIngresoEncontrado = true
          console.log("[v0] Tipo de ingreso encontrado:", catMatch.nombre)
        }
      }
      
      // Si no encontro el tipo de ingreso, verificar sugerencias
      if (!tipoIngresoEncontrado && datos.sugerencias?.requiere_crear_ingreso && datos.sugerencias?.tipo_ingreso_sugerido) {
        // Preparar dialogo para crear nuevo tipo de ingreso
        setNuevaCategoriaNombre(datos.sugerencias.tipo_ingreso_sugerido)
        setNuevaCategoriaParaTipo("") // No hay categoria padre para ingresos
        setShowCrearCategoria(true)
        console.log("[v0] Tipo de ingreso no encontrado, abriendo dialogo para crear:", datos.sugerencias.tipo_ingreso_sugerido)
      }
      
      // Buscar destino (caja de ahorro) - OBLIGATORIO para ingresos
      if (datos.origen_destino) {
        const destinoLower = datos.origen_destino.toLowerCase()
        
        // Buscar coincidencia en cajas de ahorro (busqueda flexible)
        const cajaMatch = cajasAhorro.find(c => {
          const nombreCaja = c.nombre.toLowerCase()
          return nombreCaja.includes(destinoLower) || 
                 destinoLower.includes(nombreCaja) ||
                 destinoLower.includes("caja " + nombreCaja) ||
                 destinoLower.includes("cuenta " + nombreCaja)
        })
        
        if (cajaMatch) {
          setDestinoCajaId(cajaMatch.id)
          console.log("[v0] Destino encontrado:", cajaMatch.nombre)
        } else {
          // Busqueda por palabras parciales
          const cajaMatchParcial = cajasAhorro.find(c => {
            const palabrasCaja = c.nombre.toLowerCase().split(" ")
            const palabrasDestino = destinoLower.split(" ")
            return palabrasCaja.some(p => palabrasDestino.includes(p) && p.length > 2)
          })
          
          if (cajaMatchParcial) {
            setDestinoCajaId(cajaMatchParcial.id)
            console.log("[v0] Destino encontrado (parcial):", cajaMatchParcial.nombre)
          }
        }
      }
    }
    
    // Verificar si necesita crear categoria (subcategoria no encontrada)
    if (datos.sugerencias?.requiere_crear_categoria && datos.sugerencias?.subcategoria_sugerida) {
      // Preparar los datos para el dialogo
      setNuevaCategoriaParaTipo(datos.sugerencias.categoria_sugerida || "")
      setNuevaCategoriaNombre(datos.sugerencias.subcategoria_sugerida || datos.subcategoria || "")
      // Abrir automaticamente el dialogo para crear la nueva descripcion
      setShowCrearCategoria(true)
      console.log("[v0] Subcategoria no encontrada, abriendo dialogo para crear:", datos.sugerencias.subcategoria_sugerida)
    }
    
    // Mostrar resumen
    console.log("[v0] Estableciendo showResumen = true")
    setShowResumen(true)
  }

  // Verificar si los datos estan completos
  const datosCompletos = (): boolean => {
    if (!tipoTransaccion || !monto || parseFloat(monto) <= 0) return false
    
    if (tipoTransaccion === "egreso") {
      if (!selectedTipoCategoria) return false
      // Origen es opcional pero recomendado
    }
    
    if (tipoTransaccion === "ingreso") {
      if (!selectedCategoriaIngreso) return false
    }
    
    return true
  }

  // Obtener campos faltantes
  const getCamposFaltantes = (): string[] => {
    const faltantes: string[] = []
    
    if (!tipoTransaccion) faltantes.push("Tipo (ingreso/egreso)")
    if (!monto || parseFloat(monto) <= 0) faltantes.push("Monto")
    
    if (tipoTransaccion === "egreso") {
      if (!selectedTipoCategoria) faltantes.push("Categoria")
      if (!origenTipo && !origenId) faltantes.push("Origen del dinero (caja/tarjeta/efectivo)")
    }
    
    if (tipoTransaccion === "ingreso") {
      if (!selectedCategoriaIngreso) faltantes.push("Tipo de ingreso")
      if (!destinoCajaId) faltantes.push("Destino del dinero (caja)")
    }
    
    return faltantes
  }

  // Crear nueva categoria
  const handleCrearCategoria = async () => {
    if (!nuevaCategoriaNombre.trim()) return
    
    const supabase = createClient()
    
    if (tipoTransaccion === "egreso" && nuevaCategoriaParaTipo) {
      // Buscar el tipo de categoria
      let tipoId = tiposCategoria.find(t => 
        t.nombre.toLowerCase() === nuevaCategoriaParaTipo.toLowerCase()
      )?.id
      
      if (!tipoId) {
        // Crear el tipo de categoria primero
        const { data: nuevoTipo } = await supabase
          .from("tipos_categoria_egreso")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            nombre: nuevaCategoriaParaTipo,
            color: "#6b7280",
          })
          .select()
          .single()
        
        if (nuevoTipo) {
          tipoId = nuevoTipo.id
          setTiposCategoria([...tiposCategoria, nuevoTipo])
        }
      }
      
      if (tipoId) {
        // Crear la subcategoria
        const { data: nuevaCat } = await supabase
          .from("categorias_egreso")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            tipo_categoria_id: tipoId,
            nombre: nuevaCategoriaNombre.trim(),
          })
          .select()
          .single()
        
        if (nuevaCat) {
          setCategoriasEgreso([...categoriasEgreso, nuevaCat])
          setSelectedTipoCategoria(tipoId)
          setSelectedSubcategoria(nuevaCat.id)
          console.log("[v0] Descripcion creada exitosamente:", nuevaCat.nombre, "en categoria:", nuevaCategoriaParaTipo)
        }
      }
    } else if (tipoTransaccion === "ingreso") {
      const { data: nuevaCat } = await supabase
        .from("categorias_ingresos")
        .insert({
          user_id: userId,
          perfil_id: perfilId,
          nombre: nuevaCategoriaNombre.trim(),
        })
        .select()
        .single()
      
    if (nuevaCat) {
      setCategoriasIngreso([...categoriasIngreso, nuevaCat])
      setSelectedCategoriaIngreso(nuevaCat.id)
      console.log("[v0] Tipo de ingreso creado exitosamente:", nuevaCat.nombre)
    }
    }
    
  setShowCrearCategoria(false)
  setNuevaCategoriaNombre("")
  setNuevaCategoriaParaTipo("")
  }
  
  // Crear nueva caja de ahorro
  const handleCrearCaja = async () => {
    if (!nuevaCajaNombre.trim()) return
    
    const supabase = createClient()
    
    const { data: nuevaCaja, error: errorCaja } = await supabase
      .from("cajas_ahorro")
      .insert({
        nombre: nuevaCajaNombre.trim(),
        user_id: userId,
        perfil_id: perfilId,
        monto_actual: 0,
        moneda: "PYG",
        tipo: "ahorro",
        activa: true,
      })
      .select("id, nombre, monto_actual, moneda, color, tipo_cuenta, banco")
      .single()
    
    if (errorCaja) {
      console.error("[v0] Error al crear caja:", errorCaja)
      return
    }
    
    if (nuevaCaja) {
      console.log("[v0] Caja creada exitosamente:", nuevaCaja)
      setCajasAhorro([...cajasAhorro, nuevaCaja])
      setDestinoCajaId(nuevaCaja.id)
    }
    
    setShowCrearCaja(false)
    setNuevaCajaNombre("")
  }
  
  // Guardar transaccion
  const handleGuardar = async () => {
    if (!datosCompletos()) {
      setError("Faltan campos obligatorios")
      return
    }
    
    setIsSaving(true)
    setError(null)
    
    try {
      const supabase = createClient()
      const montoNumerico = parseFloat(monto)
      
      if (tipoTransaccion === "egreso") {
        // Validar saldo si es caja de ahorro - obtener saldo actual de la DB
        if (origenTipo === "caja_ahorro" && origenId) {
          const { data: cajaOrigen, error: validationError } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual, nombre")
            .eq("id", origenId)
            .single()
          
          if (validationError) throw validationError
          
          if (cajaOrigen && montoNumerico > Number(cajaOrigen.monto_actual)) {
            throw new Error(`Saldo insuficiente en "${cajaOrigen.nombre}". Disponible: ${formatGuaranies(Number(cajaOrigen.monto_actual))}`)
          }
        }
        
        // Insertar egreso
        const { error: insertError } = await supabase
          .from("egresos")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            tipo_categoria_id: selectedTipoCategoria,
            categoria_id: selectedSubcategoria || null,
            monto: montoNumerico,
            fecha: fecha,
            concepto: concepto || null,
            origen_tipo: origenTipo || null,
            origen_id: origenId || null,
          })
        
        if (insertError) throw insertError
        
        // Descontar del origen - obtener saldo actual de la DB para evitar problemas de concurrencia
        if (origenTipo === "caja_ahorro" && origenId) {
          // Obtener el saldo ACTUAL de la base de datos, no del estado local
          const { data: cajaActual, error: fetchError } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual, nombre")
            .eq("id", origenId)
            .single()
          
          if (fetchError) throw fetchError
          
          if (cajaActual) {
            const saldoActual = Number(cajaActual.monto_actual)
            const nuevoMonto = saldoActual - montoNumerico
            
            const { error: updateError } = await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: nuevoMonto })
              .eq("id", origenId)
            
            if (updateError) throw updateError
            
            await supabase.from("movimientos_caja").insert({
              caja_id: origenId,
              tipo: "retiro",
              monto: montoNumerico,
              concepto: `Egreso: ${concepto || "Gasto"}`,
              fecha: fecha,
            })
          }
          } else if (origenTipo === "tarjeta_credito" && origenId) {
          // Para tarjetas de credito: restar del credito disponible (monto_total)
          const { data: tarjetaActual, error: fetchError } = await supabase
          .from("deudas")
          .select("monto_total, monto_pagado, limite_credito")
          .eq("id", origenId)
          .single()
          
          if (fetchError) throw fetchError
          
          if (tarjetaActual) {
          const disponibleActual = Number(tarjetaActual.monto_total)
          const nuevoDisponible = disponibleActual - montoNumerico
          
          if (nuevoDisponible < 0) {
            throw new Error("Credito insuficiente en la tarjeta seleccionada")
          }
          
          const { error: updateError } = await supabase
          .from("deudas")
          .update({ monto_total: nuevoDisponible })
          .eq("id", origenId)
          
          if (updateError) throw updateError
          }
          }
        
      } else if (tipoTransaccion === "ingreso") {
        // Obtener nombre de categoria
        const catIngreso = categoriasIngreso.find(c => c.id === selectedCategoriaIngreso)
        
        // Insertar ingreso
        const { error: insertError } = await supabase
          .from("ingresos")
          .insert({
            user_id: userId,
            perfil_id: perfilId,
            tipo_ingreso: catIngreso?.nombre || "",
            monto: montoNumerico,
            fecha: fecha,
            destino_caja_id: destinoCajaId || null,
          })
        
        if (insertError) throw insertError
        
        // Depositar en caja destino - obtener saldo actual de la DB
        if (destinoCajaId) {
          // Obtener el saldo ACTUAL de la base de datos, no del estado local
          const { data: cajaActual, error: fetchError } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual, nombre")
            .eq("id", destinoCajaId)
            .single()
          
          if (fetchError) throw fetchError
          
          if (cajaActual) {
            const saldoActual = Number(cajaActual.monto_actual)
            const nuevoMonto = saldoActual + montoNumerico
            
            const { error: updateError } = await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: nuevoMonto })
              .eq("id", destinoCajaId)
            
            if (updateError) throw updateError
            
            await supabase.from("movimientos_caja").insert({
              caja_id: destinoCajaId,
              tipo: "deposito",
              monto: montoNumerico,
              concepto: `Ingreso: ${catIngreso?.nombre || "Ingreso"}`,
              fecha: fecha,
            })
          }
        }
      }
      
      setSuccess(true)
      
      // Resetear formulario
      setTimeout(() => {
        resetForm()
        reloadData()
      }, 2000)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setIsSaving(false)
    }
  }

  // Resetear formulario
  const resetForm = () => {
    setTranscripcion("")
    setDatosExtraidos(null)
    setTipoTransaccion(null)
    setMonto("")
    setFecha(getTodayDate())
    setConcepto("")
    setSelectedTipoCategoria("")
    setSelectedSubcategoria("")
    setOrigenTipo("")
    setOrigenId("")
    setSelectedCategoriaIngreso("")
    setDestinoCajaId("")
    setShowResumen(false)
    setSuccess(false)
    setError(null)
  }

  // Subcategorias filtradas por tipo
  const subcategoriasFiltradas = categoriasEgreso.filter(
    c => c.tipo_categoria_id === selectedTipoCategoria
  )

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos dias"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">FinanzasPro</h1>
              <p className="text-xs text-slate-400">Carga Inteligente</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/personal")}
            className="gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            <LayoutDashboard className="w-4 h-4" />
            Ir al Panel
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Saludo */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {getGreeting()}, {userName}
          </h2>
          <p className="text-slate-400">
            Carga tus ingresos y egresos con tu voz
          </p>
        </div>

        {/* Boton de grabacion principal */}
        {!showResumen && !success && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6">
                {/* Boton de microfono */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 relative",
                    isRecording
                      ? "bg-red-500 shadow-lg shadow-red-500/50 animate-pulse"
                      : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:shadow-lg hover:shadow-cyan-500/50 hover:scale-105",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {isProcessing ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-12 h-12 text-white" />
                  ) : (
                    <Mic className="w-12 h-12 text-white" />
                  )}
                  
                  {isRecording && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-red-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  )}
                </button>

                <div className="text-center">
                  <p className="text-lg font-medium text-white mb-1">
                    {isProcessing
                      ? "Procesando..."
                      : isRecording
                      ? "Escuchando... Presiona para detener"
                      : "Presiona para hablar"}
                  </p>
                  <p className="text-sm text-slate-400">
                    Di algo como: "Gaste 50 mil en supermercado de la caja asalariado"
                  </p>
                </div>

                {/* Transcripcion en tiempo real */}
                {transcripcion && isRecording && (
                  <div className="w-full p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-slate-400 uppercase tracking-wide">Transcripcion</span>
                    </div>
                    <p className="text-white">{transcripcion}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guia de ejemplo */}
        {!showResumen && !success && !isRecording && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-cyan-400" />
                <CardTitle className="text-lg text-white">Como usar la carga por voz</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Para egresos</p>
                    <p className="text-xs text-slate-400">"Gaste 150 mil en supermercado de la caja asalariado"</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Para ingresos</p>
                    <p className="text-xs text-slate-400">"Recibi 5 millones de salario a la cuenta del banco"</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-3 h-3 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Con tarjeta</p>
                    <p className="text-xs text-slate-400">"Pague 80 mil en restaurante con tarjeta de credito"</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen y edicion */}
        {showResumen && !success && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    tipoTransaccion === "egreso"
                      ? "bg-red-500/20"
                      : "bg-green-500/20"
                  )}>
                    {tipoTransaccion === "egreso" ? (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">
                      Confirmar {tipoTransaccion === "egreso" ? "Egreso" : "Ingreso"}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Verifica y ajusta los datos antes de guardar
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetForm}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Texto original */}
              {transcripcion && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-xs text-cyan-400 uppercase tracking-wide mb-1">Lo que dijiste</p>
                  <p className="text-white">"{transcripcion}"</p>
                </div>
              )}

              {/* Tipo de transaccion */}
              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de transaccion</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTipoTransaccion("egreso")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all flex items-center gap-3",
                      tipoTransaccion === "egreso"
                        ? "border-red-500 bg-red-500/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <TrendingDown className={cn(
                      "w-5 h-5",
                      tipoTransaccion === "egreso" ? "text-red-400" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "font-medium",
                      tipoTransaccion === "egreso" ? "text-red-400" : "text-slate-300"
                    )}>Egreso</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setTipoTransaccion("ingreso")}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all flex items-center gap-3",
                      tipoTransaccion === "ingreso"
                        ? "border-green-500 bg-green-500/20"
                        : "border-white/10 hover:border-white/30"
                    )}
                  >
                    <TrendingUp className={cn(
                      "w-5 h-5",
                      tipoTransaccion === "ingreso" ? "text-green-400" : "text-slate-400"
                    )} />
                    <span className={cn(
                      "font-medium",
                      tipoTransaccion === "ingreso" ? "text-green-400" : "text-slate-300"
                    )}>Ingreso</span>
                  </button>
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-2">
                <Label className="text-slate-300">Monto (Guaranies)</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="100000"
                  className="bg-white/5 border-white/10 text-white text-lg"
                />
                {monto && (
                  <p className="text-sm text-cyan-400">{formatGuaranies(parseFloat(monto) || 0)}</p>
                )}
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label className="text-slate-300">Fecha</Label>
                <Input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Campos para EGRESO */}
              {tipoTransaccion === "egreso" && (
                <>
                  {/* Categoria */}
                  <div className="space-y-2">
                    <Label className="text-slate-300">Categoria</Label>
                    <Select value={selectedTipoCategoria} onValueChange={(val) => {
                  setSelectedTipoCategoria(val)
                  setSelectedSubcategoria("") // Reset subcategoria cuando cambia la categoria
                }}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Selecciona una categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCategoria.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subcategoria */}
                  {selectedTipoCategoria && subcategoriasFiltradas.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Descripcion (opcional)</Label>
                      <Select value={selectedSubcategoria} onValueChange={setSelectedSubcategoria}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecciona o deja vacio" />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategoriasFiltradas.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Origen del dinero */}
                  <div className="space-y-3">
                    <Label className="text-slate-300">Origen del dinero</Label>
                    
                    <div className="grid gap-2">
                      {/* Cajas de ahorro */}
                      {cajasAhorro.map((caja) => (
                        <button
                          key={caja.id}
                          type="button"
                          onClick={() => {
                            setOrigenTipo("caja_ahorro")
                            setOrigenId(caja.id)
                          }}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                            origenTipo === "caja_ahorro" && origenId === caja.id
                              ? "border-blue-500 bg-blue-500/20"
                              : "border-white/10 hover:border-white/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <PiggyBank className={cn(
                              "w-5 h-5",
                              origenTipo === "caja_ahorro" && origenId === caja.id
                                ? "text-blue-400"
                                : "text-slate-400"
                            )} />
                            <span className={cn(
                              "font-medium",
                              origenTipo === "caja_ahorro" && origenId === caja.id
                                ? "text-blue-400"
                                : "text-slate-300"
                            )}>{caja.nombre}</span>
                          </div>
                          <span className="text-sm text-emerald-400">
                            {formatGuaranies(Number(caja.monto_actual))}
                          </span>
                        </button>
                      ))}

                      {/* Tarjetas de credito */}
                      {tarjetasCredito.map((tarjeta) => (
                        <button
                          key={tarjeta.id}
                          type="button"
                          onClick={() => {
                            setOrigenTipo("tarjeta_credito")
                            setOrigenId(tarjeta.id)
                          }}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                            origenTipo === "tarjeta_credito" && origenId === tarjeta.id
                              ? "border-purple-500 bg-purple-500/20"
                              : "border-white/10 hover:border-white/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <CreditCard className={cn(
                              "w-5 h-5",
                              origenTipo === "tarjeta_credito" && origenId === tarjeta.id
                                ? "text-purple-400"
                                : "text-slate-400"
                            )} />
                            <span className={cn(
                              "font-medium",
                              origenTipo === "tarjeta_credito" && origenId === tarjeta.id
                                ? "text-purple-400"
                                : "text-slate-300"
                            )}>{tarjeta.nombre}</span>
                          </div>
                          <div className="text-right">
                            {(() => {
                              // Para tarjetas: monto_total = monto disponible actual
                              const disponible = Number(tarjeta.monto_total) || 0
                              const limite = Number(tarjeta.limite_credito) || 0
                              const montoNum = monto ? Number(monto.replace(/\./g, "").replace(",", ".")) : 0
                              const insuficiente = montoNum > 0 && montoNum > disponible
                              return (
                                <>
                                  <p className={cn("text-sm font-bold", insuficiente ? "text-red-400" : "text-emerald-400")}>
                                    {formatGuaranies(disponible)}
                                  </p>
                                  {limite > 0 && (
                                    <p className="text-[10px] text-slate-500">
                                      Lim: {formatGuaranies(limite)}
                                    </p>
                                  )}
                                  {insuficiente && (
                                    <p className="text-[10px] text-red-400">Credito insuficiente</p>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        </button>
                      ))}

                      {cajasAhorro.length === 0 && tarjetasCredito.length === 0 && (
                        <p className="text-sm text-slate-400 text-center py-4">
                          No tienes cajas de ahorro ni tarjetas registradas.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Campos para INGRESO */}
              {tipoTransaccion === "ingreso" && (
                <>
                  {/* Categoria de ingreso */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Tipo de ingreso</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCrearCategoria(true)}
                        className="text-cyan-400 hover:text-cyan-300 gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Nueva
                      </Button>
                    </div>
                    
                    {categoriasIngreso.length > 0 ? (
                      <Select value={selectedCategoriaIngreso} onValueChange={setSelectedCategoriaIngreso}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecciona el tipo de ingreso" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasIngreso.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
                        <p className="text-sm text-slate-400 mb-2">No tienes tipos de ingreso creados</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCrearCategoria(true)}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Crear primer tipo de ingreso
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Destino del dinero */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-300">Destino del dinero</Label>
                      <button
                        type="button"
                        onClick={() => setShowCrearCaja(true)}
                        className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Nueva
                      </button>
                    </div>
                    
                    <div className="grid gap-2">
                      {/* Cajas de ahorro */}
                      {cajasAhorro.map((caja) => (
                        <button
                          key={caja.id}
                          type="button"
                          onClick={() => setDestinoCajaId(caja.id)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                            destinoCajaId === caja.id
                              ? "border-green-500 bg-green-500/20"
                              : "border-white/10 hover:border-white/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <PiggyBank className={cn(
                              "w-5 h-5",
                              destinoCajaId === caja.id ? "text-green-400" : "text-slate-400"
                            )} />
                            <span className={cn(
                              "font-medium",
                              destinoCajaId === caja.id ? "text-green-400" : "text-slate-300"
                            )}>{caja.nombre}</span>
                          </div>
                          <span className="text-sm text-emerald-400">
                            {formatGuaranies(Number(caja.monto_actual))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Concepto adicional */}
              <div className="space-y-2">
                <Label className="text-slate-300">Concepto / Nota (opcional)</Label>
                <Input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder="Descripcion adicional..."
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              {/* Campos faltantes */}
              {getCamposFaltantes().length > 0 && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Campos faltantes</span>
                  </div>
                  <ul className="text-sm text-amber-300 list-disc list-inside">
                    {getCamposFaltantes().map((campo, i) => (
                      <li key={i}>{campo}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">{error}</span>
                  </div>
                </div>
              )}

              {/* Botones de accion */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="flex-1 border-white/20 text-slate-300 hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reiniciar
                </Button>
                
                <Button
                  onClick={handleGuardar}
                  disabled={!datosCompletos() || isSaving}
                  className={cn(
                    "flex-1",
                    tipoTransaccion === "egreso"
                      ? "bg-red-500 hover:bg-red-600"
                      : "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Guardar {tipoTransaccion === "egreso" ? "Egreso" : "Ingreso"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mensaje de exito */}
        {success && (
          <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-green-400 mb-1">
                    Guardado exitosamente
                  </h3>
                  <p className="text-slate-400">
                    Tu {tipoTransaccion === "egreso" ? "egreso" : "ingreso"} ha sido registrado
                  </p>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={resetForm}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva carga
                  </Button>
                  <Button
  onClick={navegarAlPanel}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    Ver Dashboard
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Acceso rapido al dashboard */}
        {!showResumen && !success && (
          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => router.push("/dashboard/personal")}
              className="text-slate-400 hover:text-white gap-2"
            >
              <LayoutDashboard className="w-4 h-4" />
              Ir directamente al panel sin cargar datos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>

      {/* Dialog para crear categoria/descripcion */}
      <Dialog open={showCrearCategoria} onOpenChange={setShowCrearCategoria}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">
              {tipoTransaccion === "ingreso"
                ? nuevaCategoriaNombre
                  ? `Agregar tipo de ingreso "${nuevaCategoriaNombre}"`
                  : "Crear tipo de ingreso"
                : nuevaCategoriaNombre
                  ? `Agregar "${nuevaCategoriaNombre}"`
                  : "Crear descripcion"
              }
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {tipoTransaccion === "ingreso"
                ? nuevaCategoriaNombre
                  ? `No encontramos "${nuevaCategoriaNombre}" en tus tipos de ingreso registrados. Confirma para agregarlo.`
                  : "Agrega un nuevo tipo de ingreso para tus transacciones"
                : nuevaCategoriaNombre && nuevaCategoriaParaTipo
                  ? `No encontramos "${nuevaCategoriaNombre}" en tus descripciones. Te sugerimos agregarla en "${nuevaCategoriaParaTipo}".`
                  : nuevaCategoriaNombre
                    ? `No encontramos "${nuevaCategoriaNombre}" en tus descripciones. Selecciona en que categoria agregarla.`
                    : "Agrega una nueva descripcion para tus transacciones"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {tipoTransaccion === "egreso" && (
              <div className="space-y-2">
                <Label className="text-slate-300">Categoria principal</Label>
                <Select value={nuevaCategoriaParaTipo} onValueChange={setNuevaCategoriaParaTipo}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecciona o escribe una nueva" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCategoria.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-slate-300">
                {tipoTransaccion === "ingreso" ? "Nombre del tipo de ingreso" : "Nombre de la subcategoria"}
              </Label>
              <Input
                value={nuevaCategoriaNombre}
                onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                placeholder={tipoTransaccion === "ingreso" ? "Ej: Salario, Freelance" : "Ej: Supermercado, Alquiler"}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCrearCategoria(false)}
              className="border-white/20 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCrearCategoria}
              disabled={!nuevaCategoriaNombre.trim()}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog selector de tarjeta */}
      <Dialog open={showTarjetaSelector} onOpenChange={setShowTarjetaSelector}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Selecciona tu tarjeta de credito</DialogTitle>
            <DialogDescription className="text-slate-400">
              Tienes varias tarjetas registradas. Selecciona cual usaste.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            {tarjetasCredito.map((tarjeta) => (
              <button
                key={tarjeta.id}
                onClick={() => {
                  setOrigenTipo("tarjeta_credito")
                  setOrigenId(tarjeta.id)
                  setShowTarjetaSelector(false)
                }}
                className="w-full p-4 rounded-lg border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all flex items-center gap-3"
              >
                <CreditCard className="w-6 h-6 text-purple-400" />
                <span className="text-white font-medium">{tarjeta.nombre}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear caja de ahorro */}
      <Dialog open={showCrearCaja} onOpenChange={setShowCrearCaja}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Crear caja de ahorro</DialogTitle>
            <DialogDescription className="text-slate-400">
              Agrega una nueva caja de ahorro para registrar tus ingresos.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nombre de la caja</Label>
              <Input
                value={nuevaCajaNombre}
                onChange={(e) => setNuevaCajaNombre(e.target.value)}
                placeholder="Ej: Cuenta Banco, Billetera, Asalariado..."
                className="bg-slate-800 border-white/10 text-white"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCrearCaja(false)}
              className="border-white/20 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCrearCaja}
              disabled={!nuevaCajaNombre.trim()}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Crear caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
