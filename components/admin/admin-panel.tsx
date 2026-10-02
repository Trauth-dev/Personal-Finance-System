"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import type { DatosAdmin } from "@/lib/admin/datos"
import { ResumenKpis } from "@/components/admin/resumen-kpis"
import { TablaUsuarios } from "@/components/admin/tabla-usuarios"
import { DetalleUsuario } from "@/components/admin/detalle-usuario"
import { Analisis } from "@/components/admin/analisis"
import { ACCION_LABEL, fmtFecha } from "@/components/admin/formato"

export function AdminPanel({ datos, adminEmail }: { datos: DatosAdmin; adminEmail: string }) {
  const router = useRouter()
  const [seleccionado, setSeleccionado] = useState<string | null>(null)
  const usuario = datos.usuarios.find((u) => u.id === seleccionado) ?? null

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <Link href="/dashboard" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3" />
            Volver a la app
          </Link>
          <h1 className="text-balance text-2xl font-semibold text-foreground">Administración de Prospera+</h1>
          <p className="text-sm text-muted-foreground">
            {adminEmail} · datos al {fmtFecha(datos.generado, true)}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.refresh()} className="self-start md:self-auto">
          <RefreshCw className="size-4" />
          Actualizar
        </Button>
      </header>

      {datos.errores.length > 0 && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Algunos datos no se pudieron cargar: {datos.errores.join(" · ")}
        </div>
      )}

      {datos.resumen.accesoLibreGlobal && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Acceso libre general activado.</span> Todos los usuarios ingresan sin
          pagar. Pausar o bloquear una cuenta sí se aplica de inmediato.
        </p>
      )}

      <ResumenKpis resumen={datos.resumen} />

      <Tabs defaultValue="usuarios" className="flex flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-0">
          <TablaUsuarios usuarios={datos.usuarios} onSeleccionar={setSeleccionado} />
        </TabsContent>

        <TabsContent value="analisis" className="mt-0">
          <Analisis resumen={datos.resumen} usuarios={datos.usuarios} />
        </TabsContent>

        <TabsContent value="auditoria" className="mt-0">
          <section aria-label="Registro de auditoría" className="rounded-lg border border-border bg-card">
            {datos.auditoria.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Todavía no hay acciones registradas. Cada pausa, bloqueo, reactivación, pago manual u observación queda
                registrada acá con fecha y responsable.
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {datos.auditoria.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5 px-4 py-3 md:flex-row md:items-center md:justify-between">
                    <span className="text-sm text-foreground">
                      {ACCION_LABEL[a.accion] ?? a.accion} · <span className="text-muted-foreground">{a.usuarioEmail}</span>
                      {typeof a.detalle.motivo === "string" && a.detalle.motivo && (
                        <span className="text-muted-foreground"> · {a.detalle.motivo}</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {fmtFecha(a.fecha, true)} · {a.adminEmail}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </TabsContent>
      </Tabs>

      <DetalleUsuario usuario={usuario} auditoria={datos.auditoria} onCerrar={() => setSeleccionado(null)} />
    </div>
  )
}
