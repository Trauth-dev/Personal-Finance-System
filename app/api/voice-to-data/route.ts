import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Verificar API key al inicio
const apiKey = process.env.OPENAI_API_KEY

// Inicializar cliente de OpenAI solo si hay API key
const openai = apiKey ? new OpenAI({ apiKey }) : null

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
    mensaje?: string
  }
}

// Endpoint para convertir audio a texto usando Whisper y extraer datos con GPT
export async function POST(request: NextRequest) {
  console.log("[v0] POST /api/voice-to-data iniciado")
  console.log("[v0] OPENAI_API_KEY existe:", !!process.env.OPENAI_API_KEY)
  console.log("[v0] openai client existe:", !!openai)
  
  // Verificar que la API key este configurada
  if (!openai) {
    console.error("[v0] OPENAI_API_KEY no esta configurada")
    return NextResponse.json(
      { 
        error: "API de OpenAI no configurada",
        detalle: "La variable de entorno OPENAI_API_KEY no esta configurada. Ve a Settings > Environment Variables y agrega tu API key de OpenAI."
      },
      { status: 500 }
    )
  }

  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null
    const textoDirecto = formData.get("texto") as string | null
    
    // Datos dinamicos del usuario para contextualizar la IA
    const categoriasEgresoJSON = formData.get("categorias_egreso") as string | null
    const categoriasIngresoJSON = formData.get("categorias_ingreso") as string | null
    const cajasAhorroJSON = formData.get("cajas_ahorro") as string | null
    const tarjetasCreditoJSON = formData.get("tarjetas_credito") as string | null
    const tiposCategoriaJSON = formData.get("tipos_categoria") as string | null

    if (!audioFile && !textoDirecto) {
      return NextResponse.json(
        { error: "Se requiere un archivo de audio o texto" },
        { status: 400 }
      )
    }

    // Parsear datos del usuario
    const categoriasEgreso = categoriasEgresoJSON ? JSON.parse(categoriasEgresoJSON) : []
    const categoriasIngreso = categoriasIngresoJSON ? JSON.parse(categoriasIngresoJSON) : []
    const cajasAhorro = cajasAhorroJSON ? JSON.parse(cajasAhorroJSON) : []
    const tarjetasCredito = tarjetasCreditoJSON ? JSON.parse(tarjetasCreditoJSON) : []
    const tiposCategoria = tiposCategoriaJSON ? JSON.parse(tiposCategoriaJSON) : []

    let transcripcion: string

    // Si tenemos texto directo (de Web Speech API), usamos ese
    if (textoDirecto) {
      transcripcion = textoDirecto
    } else if (audioFile) {
      // Convertir el archivo a un formato que OpenAI acepte
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      const file = new File([audioBuffer], "audio.webm", { type: audioFile.type })

      // Transcribir con Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "es",
        response_format: "text",
      })

      transcripcion = transcription
    } else {
      return NextResponse.json(
        { error: "No se pudo procesar el audio" },
        { status: 400 }
      )
    }

    // Extraer datos estructurados del texto usando GPT-4o mini
    const datosExtraidos = await extraerDatosCompletos(
      openai,
      transcripcion,
      tiposCategoria,
      categoriasEgreso,
      categoriasIngreso,
      cajasAhorro,
      tarjetasCredito
    )

    return NextResponse.json({
      success: true,
      transcripcion,
      datos: datosExtraidos,
    })
  } catch (error) {
    console.error("[v0] Error en voice-to-data:", error)
    
    // Detectar errores especificos de OpenAI
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    let detalle = errorMessage
    
    if (errorMessage.includes("API key")) {
      detalle = "API Key de OpenAI invalida o expirada. Verifica tu key en platform.openai.com"
    } else if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      detalle = "Has excedido tu cuota de OpenAI. Verifica tu saldo en platform.openai.com"
    } else if (errorMessage.includes("rate")) {
      detalle = "Demasiadas solicitudes. Espera un momento e intenta de nuevo."
    }
    
    return NextResponse.json(
      { 
        error: "Error al procesar la voz",
        detalle
      },
      { status: 500 }
    )
  }
}

async function extraerDatosCompletos(
  openaiClient: OpenAI,
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
  const categoriasIngresoLista = categoriasIngreso.map(c => c.nombre).join(", ") || "Salario, Freelance, Inversiones, Venta, Regalo"
  const cajasAhorroLista = cajasAhorro.map(c => c.nombre).join(", ") || "(ninguna registrada)"
  const tarjetasCreditoLista = tarjetasCredito.map(t => t.nombre).join(", ") || "(ninguna registrada)"
  
  const prompt = `Eres un asistente financiero inteligente que extrae datos de texto hablado en espanol (Paraguay/Latinoamerica).

CONTEXTO DEL USUARIO:
- Tipos de categoria de egreso disponibles: ${tiposCategoriaLista}
- Categorias de ingreso disponibles: ${categoriasIngresoLista}
- Cajas de ahorro disponibles: ${cajasAhorroLista}
- Tarjetas de credito disponibles: ${tarjetasCreditoLista}

Del siguiente texto, extrae TODOS los datos posibles:

1. TIPO_TRANSACCION: "ingreso" o "egreso". Detecta si es un gasto/pago (egreso) o si recibio dinero (ingreso).
   - Palabras como "gaste", "pague", "compre", "me costo" = egreso
   - Palabras como "recibi", "me pagaron", "cobre", "me dieron" = ingreso

2. MONTO: El valor numerico. 
   - "mil" = 1000, "millon" = 1000000
   - "50 mil" = 50000, "cien mil" = 100000
   - En Paraguay los montos suelen ser grandes (guaranies)

3. CATEGORIA: 
   - Para EGRESO: debe coincidir con uno de los tipos de categoria del usuario: ${tiposCategoriaLista}
   - Para INGRESO: debe coincidir con una categoria de ingreso: ${categoriasIngresoLista}
   - Si menciona algo que NO existe en las listas, marca requiere_crear_categoria=true y sugiere donde podria ir

4. SUBCATEGORIA/CONCEPTO: Descripcion breve del gasto/ingreso (max 5 palabras)

5. FECHA: 
   - "hoy" = ${hoy}
   - "ayer" = ${ayer}
   - Si no menciona fecha, usa ${hoy}

6. ORIGEN/DESTINO DEL DINERO:
   - Para EGRESO: de donde sale el dinero. Debe coincidir con: ${cajasAhorroLista} o "efectivo" o una tarjeta de credito
   - Para INGRESO: a donde va el dinero. Debe coincidir con: ${cajasAhorroLista}
   - Si dice "tarjeta" o "credito", marca usa_tarjeta_credito=true

7. TARJETA DE CREDITO: Si usa tarjeta, detecta cual. Tarjetas disponibles: ${tarjetasCreditoLista}

TEXTO: "${texto}"

Responde SOLO con un JSON valido (sin markdown, sin \`\`\`):
{
  "tipo_transaccion": "ingreso" | "egreso" | null,
  "monto": numero_o_null,
  "categoria": "nombre_exacto_de_la_lista_o_null",
  "subcategoria": "concepto_breve_o_null",
  "concepto": "descripcion_adicional_o_null",
  "fecha": "YYYY-MM-DD",
  "origen_destino": "nombre_caja_o_efectivo_o_null",
  "usa_tarjeta_credito": boolean,
  "nombre_tarjeta": "nombre_tarjeta_o_null",
  "confianza": "alta" | "media" | "baja",
  "campos_faltantes": ["lista", "de", "campos", "que", "faltan"],
  "sugerencias": {
    "categoria_sugerida": "si menciono algo que no existe, sugiere la categoria mas cercana",
    "subcategoria_sugerida": "nombre para crear como subcategoria",
    "requiere_crear_categoria": boolean,
    "mensaje": "mensaje para el usuario si falta algo importante"
  }
}

REGLAS:
- campos_faltantes debe incluir todo lo que NO se pudo extraer claramente
- Si falta el origen/destino del dinero, incluir "origen_destino" en campos_faltantes
- Si tiene varias tarjetas y no especifica cual, incluir "tarjeta_especifica" en campos_faltantes
- confianza es "alta" solo si tienes tipo, monto, categoria y origen/destino
- confianza es "media" si tienes al menos tipo y monto
- confianza es "baja" si falta monto o tipo`

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })

    const respuesta = completion.choices[0]?.message?.content || "{}"
    
    // Limpiar la respuesta de posibles caracteres extra
    const jsonLimpio = respuesta
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    
    const datos = JSON.parse(jsonLimpio)
    
    return {
      tipo_transaccion: datos.tipo_transaccion || null,
      monto: datos.monto || null,
      categoria: datos.categoria || null,
      subcategoria: datos.subcategoria || null,
      concepto: datos.concepto || null,
      fecha: datos.fecha || hoy,
      origen_destino: datos.origen_destino || null,
      usa_tarjeta_credito: datos.usa_tarjeta_credito || false,
      nombre_tarjeta: datos.nombre_tarjeta || null,
      confianza: datos.confianza || "baja",
      texto_original: texto,
      campos_faltantes: datos.campos_faltantes || [],
      sugerencias: datos.sugerencias || {},
    }
  } catch (parseError) {
    console.error("[v0] Error parseando respuesta de GPT:", parseError)
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
        mensaje: "No se pudo procesar el texto. Por favor intenta de nuevo con mas claridad.",
      },
    }
  }
}

// Endpoint GET para verificar que la API esta funcionando
export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY
  
  return NextResponse.json({
    status: "ok",
    mensaje: "Endpoint de voz a datos con IA",
    openai_configurado: hasApiKey,
    version: "2.0",
    instrucciones: {
      metodo: "POST",
      body: "FormData con 'audio' (archivo) o 'texto' (string)",
      datos_opcionales: "categorias_egreso, categorias_ingreso, cajas_ahorro, tarjetas_credito, tipos_categoria (JSON strings)",
    },
  })
}
