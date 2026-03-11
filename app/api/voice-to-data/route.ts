import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import * as z from "zod"

// Schema para los datos extraidos
const extractedDataSchema = z.object({
  tipo_transaccion: z.enum(["ingreso", "egreso"]).nullable().describe("Tipo de transaccion"),
  monto: z.number().nullable().describe("Monto numerico"),
  categoria: z.string().nullable().describe("Categoria exacta de la lista"),
  subcategoria: z.string().nullable().describe("Subcategoria o concepto breve"),
  concepto: z.string().nullable().describe("Descripcion adicional"),
  fecha: z.string().describe("Fecha en formato YYYY-MM-DD"),
  origen_destino: z.string().nullable().describe("Caja de ahorro o efectivo"),
  usa_tarjeta_credito: z.boolean().describe("Si usa tarjeta de credito"),
  nombre_tarjeta: z.string().nullable().describe("Nombre de la tarjeta"),
  confianza: z.enum(["alta", "media", "baja"]).describe("Nivel de confianza"),
  campos_faltantes: z.array(z.string()).describe("Campos que no se pudieron extraer"),
  sugerencias: z.object({
    categoria_sugerida: z.string().nullable(),
    subcategoria_sugerida: z.string().nullable(),
    requiere_crear_categoria: z.boolean().nullable(),
    mensaje: z.string().nullable(),
  }).describe("Sugerencias para el usuario"),
})

interface ExtractedData {
  tipo_transaccion: "ingreso" | "egreso" | null
  monto: number | null
  categoria: string | null
  subcategoria: string | null
  concepto: string | null
  fecha: string
  origen_destino: string | null
  usa_tarjeta_credito: boolean
  nombre_tarjeta: string | null
  confianza: "alta" | "media" | "baja"
  texto_original: string
  campos_faltantes: string[]
  sugerencias: {
    categoria_sugerida?: string | null
    subcategoria_sugerida?: string | null
    requiere_crear_categoria?: boolean | null
    mensaje?: string | null
  }
}

export async function POST(request: NextRequest) {
  console.log("[v0] POST /api/voice-to-data iniciado")
  
  // Verificar API key de OpenAI
  const openaiApiKey = process.env.OPENAI_API_KEY
  if (!openaiApiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY no configurada", detalle: "Agrega tu API key de OpenAI en Settings > Environment Variables" },
      { status: 500 }
    )
  }

  try {
    console.log("[v0] Parseando formData...")
    const formData = await request.formData()
    
    const textoDirecto = formData.get("texto") as string | null
    console.log("[v0] textoDirecto:", textoDirecto?.substring(0, 50))
    
    // Datos dinamicos del usuario
    const categoriasEgresoJSON = formData.get("categorias_egreso") as string | null
    const categoriasIngresoJSON = formData.get("categorias_ingreso") as string | null
    const cajasAhorroJSON = formData.get("cajas_ahorro") as string | null
    const tarjetasCreditoJSON = formData.get("tarjetas_credito") as string | null
    const tiposCategoriaJSON = formData.get("tipos_categoria") as string | null

    if (!textoDirecto) {
      return NextResponse.json(
        { error: "Se requiere texto para procesar" },
        { status: 400 }
      )
    }

    // Parsear datos del usuario
    const categoriasEgreso = categoriasEgresoJSON ? JSON.parse(categoriasEgresoJSON) : []
    const categoriasIngreso = categoriasIngresoJSON ? JSON.parse(categoriasIngresoJSON) : []
    const cajasAhorro = cajasAhorroJSON ? JSON.parse(cajasAhorroJSON) : []
    const tarjetasCredito = tarjetasCreditoJSON ? JSON.parse(tarjetasCreditoJSON) : []
    const tiposCategoria = tiposCategoriaJSON ? JSON.parse(tiposCategoriaJSON) : []
    
    console.log("[v0] Datos parseados. Llamando a IA...")

    // Crear cliente de OpenAI con la API key del usuario
    const openai = createOpenAI({
      apiKey: openaiApiKey,
    })

    // Extraer datos usando AI SDK
    const datosExtraidos = await extraerDatosConIA(
      openai,
      textoDirecto,
      tiposCategoria,
      categoriasEgreso,
      categoriasIngreso,
      cajasAhorro,
      tarjetasCredito
    )

    console.log("[v0] Datos extraidos:", datosExtraidos.tipo_transaccion, datosExtraidos.monto)
    
    return NextResponse.json({
      success: true,
      transcripcion: textoDirecto,
      datos: datosExtraidos,
    })
  } catch (error) {
    console.error("[v0] Error en voice-to-data:", error)
    
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    
    return NextResponse.json(
      { 
        error: "Error al procesar",
        detalle: errorMessage
      },
      { status: 500 }
    )
  }
}

async function extraerDatosConIA(
  openai: ReturnType<typeof createOpenAI>,
  texto: string,
  tiposCategoria: Array<{ id: string; nombre: string }>,
  categoriasEgreso: Array<{ id: string; nombre: string; tipo_categoria_id: string }>,
  categoriasIngreso: Array<{ id: string; nombre: string }>,
  cajasAhorro: Array<{ id: string; nombre: string }>,
  tarjetasCredito: Array<{ id: string; nombre: string }>
): Promise<ExtractedData> {
  const hoy = new Date().toISOString().split("T")[0]
  const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  
  const tiposCategoriaLista = tiposCategoria.map(t => t.nombre).join(", ") || "Gastos Varios, Vivienda, Disfrute, Educacion, Ahorro, Donacion, Pago Deudas, Suenos, Libertad Financiera"
  const categoriasIngresoLista = categoriasIngreso.map(c => c.nombre).join(", ") || "Salario, Freelance, Inversiones"
  const cajasAhorroLista = cajasAhorro.map(c => c.nombre).join(", ") || "(ninguna registrada)"
  const tarjetasCreditoLista = tarjetasCredito.map(t => t.nombre).join(", ") || "(ninguna registrada)"
  
  const systemPrompt = `Eres un asistente financiero que extrae datos de texto hablado en espanol latinoamericano.

CONTEXTO DEL USUARIO:
- Tipos de categoria de egreso: ${tiposCategoriaLista}
- Categorias de ingreso: ${categoriasIngresoLista}
- Cajas de ahorro: ${cajasAhorroLista}
- Tarjetas de credito: ${tarjetasCreditoLista}

REGLAS DE EXTRACCION:
1. TIPO: "gaste/pague/compre" = egreso, "recibi/cobre/me pagaron" = ingreso
2. MONTO: "mil"=1000, "millon"=1000000. En Paraguay son guaranies (montos grandes)
3. CATEGORIA: Debe coincidir con las listas del usuario. Si no existe, sugerir donde iria.
4. FECHA: "hoy"=${hoy}, "ayer"=${ayer}. Si no menciona, usa ${hoy}
5. ORIGEN/DESTINO: De que caja sale/entra el dinero, o "efectivo", o tarjeta de credito
6. CONFIANZA: "alta" si tienes tipo+monto+categoria+origen, "media" si tipo+monto, "baja" si falta algo importante`

  // Reintentos con backoff exponencial para errores temporales
  const maxRetries = 3
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[v0] Intento ${attempt} de ${maxRetries}`)
      
      const jsonPrompt = `Extrae los datos financieros del siguiente texto y responde SOLO con un JSON valido (sin markdown, sin explicaciones):

TEXTO: "${texto}"

Responde con este formato JSON exacto:
{
  "tipo_transaccion": "egreso" o "ingreso" o null,
  "monto": numero o null,
  "categoria": "nombre categoria" o null,
  "subcategoria": "detalle" o null,
  "concepto": "descripcion" o null,
  "fecha": "${hoy}",
  "origen_destino": "nombre caja o efectivo" o null,
  "usa_tarjeta_credito": false,
  "nombre_tarjeta": null,
  "confianza": "alta" o "media" o "baja",
  "campos_faltantes": ["lista de campos no detectados"],
  "sugerencias": {}
}`

      const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt: jsonPrompt,
      })

      if (!text) {
        throw new Error("No se obtuvo respuesta de la IA")
      }

      console.log("[v0] IA respondio:", text.substring(0, 100))
      
      // Limpiar la respuesta de posibles caracteres extra
      let cleanedText = text.trim()
      // Remover markdown code blocks si existen
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7)
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3)
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3)
      }
      cleanedText = cleanedText.trim()
      
      const output = JSON.parse(cleanedText)

      console.log("[v0] JSON parseado exitosamente")
      
      return {
        tipo_transaccion: output.tipo_transaccion,
        monto: output.monto,
        categoria: output.categoria,
        subcategoria: output.subcategoria,
        concepto: output.concepto,
        fecha: output.fecha || hoy,
        origen_destino: output.origen_destino,
        usa_tarjeta_credito: output.usa_tarjeta_credito || false,
        nombre_tarjeta: output.nombre_tarjeta,
        confianza: output.confianza || "baja",
        texto_original: texto,
        campos_faltantes: output.campos_faltantes || [],
        sugerencias: output.sugerencias || {},
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      console.error(`[v0] Error en intento ${attempt}:`, lastError.message)
      
      // Solo reintentar si es un error de red/gateway, no si es un error de API
      const isRetryable = lastError.message.includes("fetch failed") || 
                          lastError.message.includes("Gateway") ||
                          lastError.message.includes("Too Many") ||
                          lastError.message.includes("rate limit") ||
                          lastError.message.includes("timeout")
      
      if (!isRetryable || attempt === maxRetries) {
        break
      }
      
      // Esperar antes de reintentar (backoff exponencial: 1s, 2s, 4s)
      const waitTime = Math.pow(2, attempt - 1) * 1000
      console.log(`[v0] Esperando ${waitTime}ms antes de reintentar...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  // Si llegamos aqui, todos los intentos fallaron
  console.error("[v0] Todos los intentos fallaron, error final:", lastError?.message)
  
  return {
    tipo_transaccion: null,
    monto: null,
    categoria: null,
    subcategoria: null,
    concepto: null,
    fecha: hoy,
    origen_destino: null,
    usa_tarjeta_credito: false,
    nombre_tarjeta: null,
    confianza: "baja",
    texto_original: texto,
    campos_faltantes: ["tipo_transaccion", "monto", "categoria", "origen_destino"],
    sugerencias: {
      mensaje: lastError?.message.includes("Too Many") || lastError?.message.includes("rate limit")
        ? "Demasiadas solicitudes. Espera unos segundos e intenta de nuevo."
        : "Error de conexion. Verifica tu internet e intenta de nuevo.",
    },
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    mensaje: "Endpoint de voz a datos con IA",
    version: "3.0",
  })
}
