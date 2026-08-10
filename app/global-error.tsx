"use client"

/**
 * Error boundary de ÚLTIMO recurso (nivel raíz).
 * Se activa cuando el error escapa incluso al layout raíz. Reemplaza la
 * pantalla negra por defecto de Next.js con una UI recuperable y registra
 * el error real en la consola para poder diagnosticarlo.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  console.log("[v0] GlobalError capturado:", error?.message, "| digest:", error?.digest, "| stack:", error?.stack)

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b0f19",
          color: "#e5e7eb",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "9999px",
              backgroundColor: "rgba(239,68,68,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: 28,
            }}
            aria-hidden="true"
          >
            !
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#9ca3af", margin: "0 0 24px" }}>
            Ocurrió un error inesperado al cargar esta sección. Podés reintentar sin perder tu información.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#7c3aed",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                window.location.href = "/dashboard"
              }}
              style={{
                backgroundColor: "transparent",
                color: "#e5e7eb",
                border: "1px solid #374151",
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
