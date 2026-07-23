"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RotateCcw, DatabaseBackup, AlertTriangle, Loader2, CheckCircle2, ShieldAlert } from "lucide-react"

// ============================================================================
// TABLAS PROTEGIDAS — NUNCA BORRAR
// ----------------------------------------------------------------------------
// Estas tablas contienen la ESTRUCTURA/predeterminados que el sistema siembra
// automáticamente al crear un perfil (mediante triggers AFTER INSERT ON
// perfiles). NO se regeneran en un reinicio, así que borrarlas dejaría el
// perfil roto (sin categorías donde cargar). El reinicio JAMÁS debe tocarlas.
//
// Actúan como allowlist de seguridad: el borrado se valida contra esta lista
// en tiempo de ejecución, de modo que aunque alguien agregue una de estas
// tablas a TABLAS_A_REINICIAR por error, el guard la excluirá igual.
const TABLAS_NUNCA_BORRAR = [
  "tipos_categoria_egreso", // categorías de egreso predeterminadas
  "categorias_egreso", // subcategorías de egreso predeterminadas
  "categorias_ingresos", // Salario / Emprendimiento / Ingresos Extras
  "categorias_egresos_vivienda", // estructura de gastos de vivienda
  "categorias_egresos_varios", // estructura de gastos varios
  "configuracion_usuario", // preferencias/configuración del usuario
] as const

// Tablas de DATOS/cargas que se vacían al reiniciar un perfil.
// Se filtran por perfil_id (UUID único del perfil), por lo que el reinicio
// afecta EXCLUSIVAMENTE al perfil activo (Personal, Empresarial o CRM) y
// nunca a los otros perfiles del mismo usuario.
//
// IMPORTANTE: NO se incluyen las tablas de TABLAS_NUNCA_BORRAR (estructura de
// categorías y configuración), porque son la base funcional del perfil y solo
// se siembran al crearlo. Así la cuenta queda "en cero" pero operativa.
const TABLAS_A_REINICIAR = [
  // Presupuesto
  "presupuesto_ingresos",
  "presupuesto_categorias",
  "presupuesto_mensual",
  // Movimientos personales
  "egresos",
  "ingresos",
  "calendario_pagos_deudas",
  "deudas", // cascada: pagos_deuda
  "tareas_meta",
  "metas",
  "patrimonio",
  "cajas_ahorro", // cascada: movimientos_caja
  "alertas_financieras",
  "logros_financieros",
  "registro_habitos",
  "registro_habitos_recurrentes",
  "habitos",
  "habitos_recurrentes",
  // Empresarial
  "compras",
  "ventas",
  "inventario",
  "materias_primas",
  "proveedores",
  // CRM
  "crm_ventas", // cascada: crm_pagos_cuotas
  "crm_seguimientos",
  "crm_revisitas",
  "crm_testimonios",
  "crm_no_compras",
  "crm_citas",
  "crm_agendamientos",
  "crm_interacciones",
  "crm_oportunidades", // cascada: crm_pipeline_historial
  "crm_prospectos",
  "crm_configuracion_seguimiento",
] as const

type EstadoReinicio = "idle" | "procesando" | "exito" | "error"

export function PerfilAcciones() {
  const { perfilActual } = usePerfil()

  const [openReset, setOpenReset] = useState(false)
  const [openBackup, setOpenBackup] = useState(false)
  const [confirmado, setConfirmado] = useState(false)
  const [estado, setEstado] = useState<EstadoReinicio>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const nombrePerfil = perfilActual?.nombre ?? "este perfil"

  const cerrarReset = () => {
    if (estado === "procesando") return
    setOpenReset(false)
    // Restablecer el estado luego de la animación de cierre
    setTimeout(() => {
      setConfirmado(false)
      setEstado("idle")
      setErrorMsg(null)
    }, 200)
  }

  const handleReiniciar = async () => {
    if (!perfilActual?.id || !confirmado) return

    setEstado("procesando")
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setEstado("error")
        setErrorMsg("Tu sesión expiró. Volvé a iniciar sesión e intentá de nuevo.")
        return
      }

      // Borrado secuencial por perfil_id. RLS garantiza que solo se toquen
      // las filas del usuario autenticado.
      for (const tabla of TABLAS_A_REINICIAR) {
        // Guard de seguridad: nunca borrar las tablas de estructura/predeterminados.
        if ((TABLAS_NUNCA_BORRAR as readonly string[]).includes(tabla)) {
          console.log("[v0] Tabla protegida, se omite del reinicio:", tabla)
          continue
        }

        const { error } = await supabase.from(tabla).delete().eq("perfil_id", perfilActual.id)
        if (error) {
          console.log("[v0] Error al reiniciar tabla:", tabla, error.message)
          throw new Error(`No se pudo reiniciar "${tabla}": ${error.message}`)
        }
      }

      setEstado("exito")
      // Recargar para que todos los tableros reflejen la cuenta en cero
      setTimeout(() => {
        window.location.reload()
      }, 1400)
    } catch (err) {
      setEstado("error")
      setErrorMsg(err instanceof Error ? err.message : "Ocurrió un error inesperado.")
    }
  }

  return (
    <>
      <Card className="bg-slate-900/50 border-red-500/30 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-red-500/20 to-rose-500/20 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-400" />
            <div>
              <CardTitle className="text-white">Datos del perfil</CardTitle>
              <CardDescription className="text-slate-400">
                Gestioná la copia de seguridad y el reinicio del perfil{" "}
                <span className="font-semibold text-slate-200">{nombrePerfil}</span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Copia de Seguridad */}
            <div className="flex flex-col justify-between rounded-xl border border-blue-500/25 bg-slate-800/40 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30">
                  <DatabaseBackup className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Copia de Seguridad</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Guardá un respaldo de todas tus cargas de este perfil para restaurarlas cuando lo necesites.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenBackup(true)}
                className="mt-4 w-full border-blue-500/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20 hover:text-white"
              >
                <DatabaseBackup className="w-4 h-4 mr-2" />
                Crear copia de seguridad
              </Button>
            </div>

            {/* Reiniciar Perfil */}
            <div className="flex flex-col justify-between rounded-xl border border-red-500/25 bg-slate-800/40 p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30">
                  <RotateCcw className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Reiniciar Perfil</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Borra todas las cargas de este perfil y deja la cuenta completamente en cero. Los demás perfiles no
                    se ven afectados.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setOpenReset(true)}
                disabled={!perfilActual}
                className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reiniciar Perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo: Reiniciar Perfil */}
      <AlertDialog open={openReset} onOpenChange={(o) => (o ? setOpenReset(true) : cerrarReset())}>
        <AlertDialogContent className="border-red-500/30 bg-slate-900">
          {estado === "exito" ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
              <AlertDialogTitle className="text-white">Perfil reiniciado</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 mt-1">
                Todas las cargas de <span className="font-semibold text-slate-200">{nombrePerfil}</span> fueron
                eliminadas. Actualizando…
              </AlertDialogDescription>
            </div>
          ) : (
            <>
              <AlertDialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <AlertDialogTitle className="text-white">
                    ¿Reiniciar el perfil {nombrePerfil}?
                  </AlertDialogTitle>
                </div>
                <AlertDialogDescription className="text-slate-400 pt-2">
                  Esta acción es{" "}
                  <span className="font-semibold text-red-300">permanente e irreversible</span>. Se borrarán todos los
                  datos cargados en este perfil: ingresos, egresos, presupuestos, deudas, metas, patrimonio, cajas de
                  ahorro y demás registros. La cuenta volverá a cero.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                Solo se reinicia el perfil <span className="font-semibold">{nombrePerfil}</span>. Los otros perfiles de
                tu cuenta se mantienen intactos.
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmado}
                  onChange={(e) => setConfirmado(e.target.checked)}
                  disabled={estado === "procesando"}
                  className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-red-600 accent-red-600"
                />
                <span className="text-sm text-slate-300">
                  Entiendo que esta acción no se puede deshacer y que se borrarán todos los datos de este perfil.
                </span>
              </label>

              {estado === "error" && errorMsg && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <AlertDialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={cerrarReset}
                  disabled={estado === "procesando"}
                  className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleReiniciar}
                  disabled={!confirmado || estado === "procesando"}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {estado === "procesando" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reiniciando…
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Sí, reiniciar perfil
                    </>
                  )}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo: Copia de Seguridad (en preparación) */}
      <AlertDialog open={openBackup} onOpenChange={setOpenBackup}>
        <AlertDialogContent className="border-blue-500/30 bg-slate-900">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/15 border border-blue-500/30">
                <DatabaseBackup className="w-6 h-6 text-blue-400" />
              </div>
              <AlertDialogTitle className="text-white">Copia de Seguridad</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-slate-400 pt-2">
              Esta función está en preparación y estará disponible muy pronto. Vas a poder guardar y restaurar todas las
              cargas de tu perfil de forma segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              onClick={() => setOpenBackup(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Entendido
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
