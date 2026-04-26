import { NextResponse } from "next/server"

// API para obtener la tasa de cambio USD/PYG en tiempo real
// Usamos múltiples fuentes como fallback

export async function GET() {
  try {
    // Intentar obtener de ExchangeRate-API (gratis, 1500 requests/mes)
    const response = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
      { next: { revalidate: 3600 } } // Cache por 1 hora
    )

    if (response.ok) {
      const data = await response.json()
      const tasaPYG = data.rates?.PYG

      if (tasaPYG) {
        return NextResponse.json({
          success: true,
          tasa: Math.round(tasaPYG),
          moneda_origen: "USD",
          moneda_destino: "PYG",
          fuente: "ExchangeRate-API",
          fecha: new Date().toISOString().split("T")[0],
          actualizado: data.date
        })
      }
    }

    // Fallback: Usar tasa fija actualizada manualmente
    // Tasa aproximada al 26 de abril de 2026
    return NextResponse.json({
      success: true,
      tasa: 7500,
      moneda_origen: "USD",
      moneda_destino: "PYG",
      fuente: "fallback",
      fecha: new Date().toISOString().split("T")[0],
      mensaje: "Usando tasa de respaldo. Configure manualmente si es necesario."
    })

  } catch (error) {
    console.error("Error fetching exchange rate:", error)
    
    // En caso de error, devolver tasa de respaldo
    return NextResponse.json({
      success: true,
      tasa: 7500,
      moneda_origen: "USD",
      moneda_destino: "PYG",
      fuente: "fallback",
      fecha: new Date().toISOString().split("T")[0],
      error: "No se pudo obtener la tasa en tiempo real"
    })
  }
}
