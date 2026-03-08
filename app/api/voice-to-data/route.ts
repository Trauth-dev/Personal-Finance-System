import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Tipos de categorias disponibles en el sistema
const TIPOS_CATEGORIA_EGRESO = [
  "Donación",
  "Ahorro",
  "Gastos Varios",
  "Vivienda",
  "Pago Deudas",
  "Disfrute",
  "Educación",
  "Sueños",
  "Libertad Financiera",
]

const TIPOS_INGRESO = [
  "Salario",
  "Freelance",
  "Inversiones",
  "Alquiler",
  "Venta",
  "Regalo",
  "Reembolso",
  "Otro",
]

interface ExtractedEgresoData {
  monto: number | null
  tipo_categoria: string | null
  concepto: string | null
  fecha: string | null
  confianza: "alta" | "media" | "baja"
  texto_original: string
}

interface ExtractedIngresoData {
  monto: number | null
  tipo_ingreso: string | null
  fecha: string | null
  confianza: "alta" | "media" | "baja"
  texto_original: string
}

// Endpoint para convertir audio a texto usando Whisper
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null
    const tipoTransaccion = formData.get("tipo") as string | null // "egreso" o "ingreso"
    const textoDirecto = formData.get("texto") as string | null // Si ya tenemos el texto (Web Speech API)

    if (!audioFile && !textoDirecto) {
      return NextResponse.json(
        { error: "Se requiere un archivo de audio o texto" },
        { status: 400 }
      )
    }

    let transcripcion: string

    // Si tenemos texto directo (de Web Speech API), usamos ese
    if (textoDirecto) {
      transcripcion = textoDirecto
    } else if (audioFile) {
      // Convertir el archivo a un formato que OpenAI acepte
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
      
      // Crear un archivo temporal para Whisper
      const file = new File([audioBuffer], "audio.webm", { type: audioFile.type })

      // Transcribir con Whisper
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "es", // Español
        response_format: "text",
      })

      transcripcion = transcription
    } else {
      return NextResponse.json(
        { error: "No se pudo procesar el audio" },
        { status: 400 }
      )
    }

    // Ahora extraer datos estructurados del texto usando GPT-4o mini
    const tipo = tipoTransaccion || "egreso"
    
    if (tipo === "egreso") {
      const datosExtraidos = await extraerDatosEgreso(transcripcion)
      return NextResponse.json({
        success: true,
        tipo: "egreso",
        transcripcion,
        datos: datosExtraidos,
      })
    } else {
      const datosExtraidos = await extraerDatosIngreso(transcripcion)
      return NextResponse.json({
        success: true,
        tipo: "ingreso",
        transcripcion,
        datos: datosExtraidos,
      })
    }
  } catch (error) {
    console.error("[v0] Error en voice-to-data:", error)
    return NextResponse.json(
      { 
        error: "Error al procesar la voz",
        detalle: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    )
  }
}

async function extraerDatosEgreso(texto: string): Promise<ExtractedEgresoData> {
  const hoy = new Date().toISOString().split("T")[0]
  
  const prompt = `Eres un asistente que extrae datos financieros de texto en español (Paraguay/Latinoamérica).

Del siguiente texto, extrae:
1. MONTO: El valor numérico. Interpreta "mil" = 1000, "millón" = 1000000, "cien" = 100, etc. Si dice "50 mil" = 50000. Si dice "un millón" = 1000000. Los montos en Paraguay suelen ser en guaraníes (números grandes como 50000, 100000, 500000).
2. TIPO_CATEGORIA: Debe ser EXACTAMENTE uno de estos valores: ${TIPOS_CATEGORIA_EGRESO.join(", ")}. Mapea el contexto:
   - Comida, supermercado, mercado, almacén, verduras → "Gastos Varios"
   - Alquiler, luz, agua, internet, gas, mantenimiento casa → "Vivienda"  
   - Cuota, préstamo, tarjeta, crédito → "Pago Deudas"
   - Restaurante, cine, salida, entretenimiento, bar, fiesta → "Disfrute"
   - Curso, libro, capacitación, universidad, colegio → "Educación"
   - Ahorro, guardé, aparté dinero → "Ahorro"
   - Donación, iglesia, caridad, ayuda → "Donación"
   - Viaje, vacaciones, proyecto personal, sueño → "Sueños"
   - Inversión, acciones, crypto, negocio propio → "Libertad Financiera"
3. CONCEPTO: Una descripción breve de máximo 5 palabras sobre el gasto.
4. FECHA: Si menciona "hoy" usa ${hoy}. Si dice "ayer" calcula la fecha. Si no menciona fecha, usa ${hoy}.

TEXTO: "${texto}"

Responde SOLO con un JSON válido (sin markdown, sin \`\`\`):
{
  "monto": numero_o_null,
  "tipo_categoria": "categoria_exacta_de_la_lista_o_null",
  "concepto": "descripcion_corta_o_null",
  "fecha": "YYYY-MM-DD_o_null",
  "confianza": "alta|media|baja"
}

La confianza es:
- "alta" si pudiste extraer monto Y categoria claramente
- "media" si pudiste extraer al menos uno de los dos
- "baja" si el texto es muy ambiguo`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.1, // Baja temperatura para respuestas consistentes
      max_tokens: 200,
    })

    const respuesta = completion.choices[0]?.message?.content || "{}"
    
    // Limpiar la respuesta de posibles caracteres extra
    const jsonLimpio = respuesta
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    
    const datos = JSON.parse(jsonLimpio)
    
    return {
      monto: datos.monto || null,
      tipo_categoria: TIPOS_CATEGORIA_EGRESO.includes(datos.tipo_categoria) ? datos.tipo_categoria : null,
      concepto: datos.concepto || null,
      fecha: datos.fecha || hoy,
      confianza: datos.confianza || "baja",
      texto_original: texto,
    }
  } catch (parseError) {
    console.error("[v0] Error parseando respuesta de GPT:", parseError)
    return {
      monto: null,
      tipo_categoria: null,
      concepto: null,
      fecha: hoy,
      confianza: "baja",
      texto_original: texto,
    }
  }
}

async function extraerDatosIngreso(texto: string): Promise<ExtractedIngresoData> {
  const hoy = new Date().toISOString().split("T")[0]
  
  const prompt = `Eres un asistente que extrae datos financieros de texto en español (Paraguay/Latinoamérica).

Del siguiente texto, extrae:
1. MONTO: El valor numérico. Interpreta "mil" = 1000, "millón" = 1000000. Los montos en Paraguay suelen ser en guaraníes.
2. TIPO_INGRESO: Debe ser EXACTAMENTE uno de estos valores: ${TIPOS_INGRESO.join(", ")}. Mapea el contexto:
   - Sueldo, paga, nómina, trabajo → "Salario"
   - Proyecto, cliente, trabajo independiente → "Freelance"
   - Dividendos, intereses, rendimientos → "Inversiones"
   - Renta, inquilino, arriendo → "Alquiler"
   - Vendí, me pagaron por algo → "Venta"
   - Me regalaron, cumpleaños, regalo → "Regalo"
   - Devolución, me devolvieron → "Reembolso"
   - Cualquier otro caso → "Otro"
3. FECHA: Si menciona "hoy" usa ${hoy}. Si dice "ayer" calcula la fecha. Si no menciona fecha, usa ${hoy}.

TEXTO: "${texto}"

Responde SOLO con un JSON válido (sin markdown):
{
  "monto": numero_o_null,
  "tipo_ingreso": "tipo_exacto_de_la_lista_o_null",
  "fecha": "YYYY-MM-DD_o_null",
  "confianza": "alta|media|baja"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 150,
    })

    const respuesta = completion.choices[0]?.message?.content || "{}"
    const jsonLimpio = respuesta
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()
    
    const datos = JSON.parse(jsonLimpio)
    
    return {
      monto: datos.monto || null,
      tipo_ingreso: TIPOS_INGRESO.includes(datos.tipo_ingreso) ? datos.tipo_ingreso : null,
      fecha: datos.fecha || hoy,
      confianza: datos.confianza || "baja",
      texto_original: texto,
    }
  } catch (parseError) {
    console.error("[v0] Error parseando respuesta de GPT:", parseError)
    return {
      monto: null,
      tipo_ingreso: null,
      fecha: hoy,
      confianza: "baja",
      texto_original: texto,
    }
  }
}

// Endpoint GET para verificar que la API está funcionando
export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY
  
  return NextResponse.json({
    status: "ok",
    mensaje: "Endpoint de voz a datos",
    openai_configurado: hasApiKey,
    instrucciones: {
      metodo: "POST",
      body: "FormData con 'audio' (archivo) o 'texto' (string) y 'tipo' (egreso|ingreso)",
    },
    categorias_egreso: TIPOS_CATEGORIA_EGRESO,
    tipos_ingreso: TIPOS_INGRESO,
  })
}
