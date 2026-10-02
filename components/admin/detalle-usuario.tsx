"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { RegistroAuditoria, UsuarioAdmin } from "@/lib/admin/datos"
import type { EstadoCuenta } from "@/lib/admin/config"
import {
  anularSuscripcion,
  cambiarEstadoCuenta,
  extenderSuscripcion,
  guardarObservaciones,
  type ResultadoAccion,
} from "@/app/admin/actions"
import {
  ACCION_LABEL,
  AVISO_CLASE,
  ESTADO_CUENTA_INFO,
  ESTADO_PAGO_INFO,
  SEGMENTO_INFO,
  fmtFecha,
  fmtGs,
  fmtNum,
  fmtRelativo,
} from "@/components/admin/formato"

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{valor}</dd>
    </div>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      {children}
    </section>
  )
}

export function DetalleUsuario({
  usuario,
  auditoria,
  onCerrar,
}: {
  usuario: UsuarioAdmin | null
  auditoria: RegistroAuditoria[]
  onCerrar: () => void
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [resultado, setResultado] = useState<ResultadoAccion | null>(null)
  const [motivo, setMotivo] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [confirmar, setConfirmar] = useState<EstadoCuenta | null>(null)

  useEffect(() => {
    setObservaciones(usuario?.observaciones ?? "")
    setMotivo("")
    setResultado(null)
    setConfirmar(null)
  }, [usuario?.id, usuario?.observaciones])

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setResultado(null)
    startTransition(async () => {
      const r = await accion()
      setResultado(r)
      if (r.ok) {
        setConfirmar(null)
        setMotivo("")
        router.refresh()
      }
    })
  }

  const historial = usuario ? auditoria.filter((a) => a.usuarioId === usuario.id).slice(0, 15) : []

  return (
    <Sheet open={Boolean(usuario)} onOpenChange={(open) => !open && onCerrar()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        {usuario && (
          <>
            <SheetHeader className="gap-1 pb-5 text-left">
              <SheetTitle className="text-pretty">{usuario.nombre}</SheetTitle>
              <SheetDescription className="break-all">{usuario.email}</SheetDescription>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span
                  className={cn(
                    "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                    ESTADO_CUENTA_INFO[usuario.estado].clase,
                  )}
                >
                  {ESTADO_CUENTA_INFO[usuario.estado].label}
                </span>
                <span className="text-xs text-muted-foreground">{SEGMENTO_INFO[usuario.segmento].label}</span>
                {usuario.esAdmin && <span className="text-xs text-primary">Administrador</span>}
              </div>
            </SheetHeader>

            <div className="flex flex-col gap-5 pb-8">
              {resultado && (
                <p
                  role="status"
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm",
                    resultado.ok
                      ? "border-[hsl(var(--chart-4)/0.4)] text-[hsl(var(--chart-4))]"
                      : "border-destructive/40 text-destructive",
                  )}
                >
                  {resultado.ok ? resultado.mensaje : resultado.error}
                </p>
              )}

              {usuario.avisos.length > 0 && (
                <ul className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                  {usuario.avisos.map((a) => (
                    <li key={a.texto} className="flex items-start gap-2 text-sm leading-relaxed text-foreground">
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", AVISO_CLASE[a.nivel])} aria-hidden="true" />
                      {a.texto}
                    </li>
                  ))}
                </ul>
              )}

              <Bloque titulo="Cuenta">
                <dl className="grid grid-cols-2 gap-4">
                  <Dato label="Alta" valor={fmtFecha(usuario.creado, true)} />
                  <Dato
                    label="Último ingreso"
                    valor={
                      <>
                        {fmtRelativo(usuario.ultimoIngreso)}
                        {usuario.ultimoIngreso && (
                          <span className="block text-xs text-muted-foreground">{fmtFecha(usuario.ultimoIngreso, true)}</span>
                        )}
                      </>
                    }
                  />
                  <Dato label="Última actividad con datos" valor={fmtRelativo(usuario.actividad.ultimaActividad)} />
                  <Dato label="Antigüedad" valor={`${usuario.diasDesdeAlta} días`} />
                  <Dato label="Acceso" valor={usuario.proveedor === "google" ? "Google" : usuario.proveedor === "cedula" ? "Cédula" : "Correo y contraseña"} />
                  <Dato label="Correo confirmado" valor={usuario.emailConfirmado ? "Sí" : "No"} />
                  <Dato label="Teléfono" valor={usuario.telefono ?? "—"} />
                  <Dato label="País" valor={usuario.pais ?? "—"} />
                </dl>
              </Bloque>

              <Bloque titulo="Pago y plan">
                <dl className="grid grid-cols-2 gap-4">
                  <Dato
                    label="Estado de pago"
                    valor={<span className={ESTADO_PAGO_INFO[usuario.pago.estado].clase}>{ESTADO_PAGO_INFO[usuario.pago.estado].label}</span>}
                  />
                  <Dato label="Suscripción vence" valor={fmtFecha(usuario.suscripcionVence)} />
                  <Dato label="Total pagado" valor={fmtGs(usuario.pago.totalPagado)} />
                  <Dato label="Pagos confirmados" valor={`${usuario.pago.pagosAprobados} (último: ${fmtFecha(usuario.pago.ultimoPago)})`} />
                  <Dato
                    label="Plan que le correspondería"
                    valor={usuario.planSugerido === "completo" ? "Completo · 120.000 Gs" : "Personal · 80.000 Gs"}
                  />
                </dl>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pendiente}
                    onClick={() => ejecutar(() => extenderSuscripcion(usuario.id, 30, "Pago manual registrado"))}
                  >
                    Registrar pago manual (+30 días)
                  </Button>
                  {usuario.suscripcionVence && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendiente}
                      onClick={() => ejecutar(() => anularSuscripcion(usuario.id))}
                    >
                      Anular suscripción
                    </Button>
                  )}
                </div>
              </Bloque>

              <Bloque titulo="Uso de la app">
                <dl className="grid grid-cols-3 gap-4">
                  <Dato label="Ingresos" valor={fmtNum(usuario.actividad.ingresos)} />
                  <Dato label="Egresos" valor={fmtNum(usuario.actividad.egresos)} />
                  <Dato label="Deudas" valor={fmtNum(usuario.actividad.deudas)} />
                  <Dato label="Cajas de ahorro" valor={fmtNum(usuario.actividad.cajas)} />
                  <Dato label="Clientes CRM" valor={fmtNum(usuario.actividad.clientes)} />
                  <Dato label="Metas" valor={fmtNum(usuario.actividad.metas)} />
                </dl>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Movimientos en perfiles Empresarial/CRM: {fmtNum(usuario.actividad.movimientosNoPersonales)}
                </p>
              </Bloque>

              <Bloque titulo="Control de acceso">
                {usuario.esAdmin ? (
                  <p className="text-sm text-muted-foreground">Las cuentas administradoras no pueden pausarse ni bloquearse.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {usuario.estadoMotivo && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Motivo actual: <span className="text-foreground">{usuario.estadoMotivo}</span>
                        {usuario.estadoActualizado && ` · desde ${fmtFecha(usuario.estadoActualizado, true)}`}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {usuario.estado !== "activo" && (
                        <Button
                          size="sm"
                          disabled={pendiente}
                          onClick={() => ejecutar(() => cambiarEstadoCuenta(usuario.id, "activo", ""))}
                        >
                          Reactivar cuenta
                        </Button>
                      )}
                      {usuario.estado !== "pausado" && (
                        <Button size="sm" variant="secondary" disabled={pendiente} onClick={() => setConfirmar("pausado")}>
                          Pausar
                        </Button>
                      )}
                      {usuario.estado !== "bloqueado" && (
                        <Button size="sm" variant="destructive" disabled={pendiente} onClick={() => setConfirmar("bloqueado")}>
                          Bloquear
                        </Button>
                      )}
                    </div>

                    {confirmar && (
                      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                        <Label htmlFor="motivo-estado" className="text-sm">
                          {confirmar === "pausado"
                            ? "Motivo de la pausa (ej.: falta de pago, pedido del usuario)"
                            : "Motivo del bloqueo (ej.: uso indebido)"}
                        </Label>
                        <Textarea
                          id="motivo-estado"
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          maxLength={500}
                          rows={2}
                        />
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          El usuario no podrá iniciar sesión y su sesión actual se cerrará. Sus datos se conservan intactos y
                          podés reactivarlo cuando quieras.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={confirmar === "bloqueado" ? "destructive" : "default"}
                            disabled={pendiente || motivo.trim().length < 3}
                            onClick={() => ejecutar(() => cambiarEstadoCuenta(usuario.id, confirmar, motivo))}
                          >
                            {pendiente && <Loader2 className="size-4 animate-spin" />}
                            Confirmar {confirmar === "pausado" ? "pausa" : "bloqueo"}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={pendiente} onClick={() => setConfirmar(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Bloque>

              <Bloque titulo="Observaciones internas">
                <Label htmlFor="observaciones" className="sr-only">
                  Observaciones internas
                </Label>
                <Textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Notas solo visibles para administración (acuerdos de pago, contacto, etc.)"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{observaciones.length}/2000</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={pendiente || observaciones === (usuario.observaciones ?? "")}
                    onClick={() => ejecutar(() => guardarObservaciones(usuario.id, observaciones))}
                  >
                    Guardar observaciones
                  </Button>
                </div>
              </Bloque>

              <Bloque titulo="Historial administrativo">
                {historial.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin acciones registradas.</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {historial.map((h) => (
                      <li key={h.id} className="flex flex-col text-sm">
                        <span className="text-foreground">
                          {ACCION_LABEL[h.accion] ?? h.accion}
                          {typeof h.detalle.motivo === "string" && h.detalle.motivo && (
                            <span className="text-muted-foreground"> · {h.detalle.motivo}</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {fmtFecha(h.fecha, true)} · {h.adminEmail}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </Bloque>

              <p className="font-mono text-xs text-muted-foreground">ID: {usuario.id}</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
