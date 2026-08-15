"use client"

import { DashboardHeader } from "@/components/dashboard-header"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Calendar, Trash2, AlertCircle, Download, Edit, X, Check, Building2, CreditCard, Wallet, Landmark, Smartphone, PiggyBank, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useMemo } from "react"
import { usePerfil } from "@/lib/contexts/perfil-context"
import { formatDateWithoutTimezone, formatMoney } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

type Ingreso = {
  id: string
  tipo_ingreso: string
  monto: number
  fecha: string
  created_at: string
  destino_caja_id: string | null
}

type DestinoInfo = {
  [ingresoId: string]: { nombre: string; tipo_cuenta: string | null; banco: string | null }
}

type Egreso = {
  id: string
  monto: number
  fecha: string
  concepto: string | null
  created_at: string
  tipo_categoria_id: string | null
  categoria_id: string | null
  origen_tipo: string | null
  origen_id: string | null
  deuda_id: string | null
  numero_cuota: number | null
  tipos_categoria_egreso?: {
    nombre: string
    color: string
  }
  categorias_egreso?: {
    nombre: string
  }
}

type OrigenInfo = {
  [egresoId: string]: { nombre: string; tipo: string }
}

const MESES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

// Convierte "YYYY-MM" en una etiqueta legible ("Agosto 2026").
const formatMesLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return `${MESES_NOMBRES[m - 1]} ${y}`
}

export default function PersonalHistorialPage() {
  const { perfilActual } = usePerfil()
  const [ingresos, setIngresos] = useState<Ingreso[]>([])
  const [egresos, setEgresos] = useState<Egreso[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteType, setDeleteType] = useState<"ingreso" | "egreso" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editType, setEditType] = useState<"ingreso" | "egreso" | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [origenesInfo, setOrigenesInfo] = useState<OrigenInfo>({})
  const [destinosInfo, setDestinosInfo] = useState<DestinoInfo>({})
  const [selectedMonth, setSelectedMonth] = useState<string>("todos")
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (perfilActual?.id) {
      loadData()
    }
  }, [perfilActual])

  const loadData = async () => {
    if (!perfilActual?.id) return

    const supabase = createClient()
    setIsLoading(true)

    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("*")
      .eq("perfil_id", perfilActual.id)
      .order("fecha", { ascending: false })

    const { data: egresosData } = await supabase
      .from("egresos")
      .select(`
        *,
        tipos_categoria_egreso (nombre, color),
        categorias_egreso (nombre)
      `)
      .eq("perfil_id", perfilActual.id)
      .order("fecha", { ascending: false })

    setIngresos(ingresosData || [])
    setEgresos(egresosData || [])

    // Cargar nombres de origenes de fondos
    if (egresosData) {
      const origenes: OrigenInfo = {}
      const cajasIds = [...new Set(egresosData.filter((e) => e.origen_tipo === "caja_ahorro" && e.origen_id).map((e) => e.origen_id))]
      const tarjetasIds = [...new Set(egresosData.filter((e) => e.origen_tipo === "tarjeta_credito" && e.origen_id).map((e) => e.origen_id))]

      // Crear mapas de nombres
      const cajasMap: Record<string, string> = {}
      const tarjetasMap: Record<string, string> = {}

      if (cajasIds.length > 0) {
        const { data: cajasData } = await supabase
          .from("cajas_ahorro")
          .select("id, nombre")
          .in("id", cajasIds)
        if (cajasData) cajasData.forEach((c) => { cajasMap[c.id] = c.nombre })
      }

      if (tarjetasIds.length > 0) {
        const { data: tarjetasData } = await supabase
          .from("deudas")
          .select("id, nombre")
          .in("id", tarjetasIds)
        if (tarjetasData) tarjetasData.forEach((t) => { tarjetasMap[t.id] = t.nombre })
      }

      // Mapear cada egreso con su origen
      egresosData.forEach((e) => {
        if (e.origen_tipo === "caja_ahorro" && e.origen_id && cajasMap[e.origen_id]) {
          origenes[e.id] = { nombre: cajasMap[e.origen_id], tipo: "caja_ahorro" }
        } else if (e.origen_tipo === "tarjeta_credito" && e.origen_id && tarjetasMap[e.origen_id]) {
          origenes[e.id] = { nombre: tarjetasMap[e.origen_id], tipo: "tarjeta_credito" }
        }
      })

      setOrigenesInfo(origenes)
    }

    // Cargar destinos de ingresos
    if (ingresosData) {
      const destinos: DestinoInfo = {}
      const cajasDestinoIds = [...new Set(ingresosData.filter((i) => i.destino_caja_id).map((i) => i.destino_caja_id as string))]

      if (cajasDestinoIds.length > 0) {
        const { data: cajasData } = await supabase
          .from("cajas_ahorro")
          .select("id, nombre, tipo_cuenta, banco")
          .in("id", cajasDestinoIds)

        if (cajasData) {
          ingresosData.forEach((i) => {
            if (i.destino_caja_id) {
              const caja = cajasData.find((c) => c.id === i.destino_caja_id)
              if (caja) {
                destinos[i.id] = { nombre: caja.nombre, tipo_cuenta: caja.tipo_cuenta, banco: caja.banco }
              }
            }
          })
        }
      }

      setDestinosInfo(destinos)
    }

    setIsLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId || !deleteType) return

    const supabase = createClient()
    const table = deleteType === "ingreso" ? "ingresos" : "egresos"

    // Si es un ingreso con destino caja, revertir el deposito
    if (deleteType === "ingreso") {
      const ingresoToDelete = ingresos.find((i) => i.id === deleteId)
      if (ingresoToDelete?.destino_caja_id) {
        const montoRevertir = Number(ingresoToDelete.monto)
        const { data: cajaData } = await supabase
          .from("cajas_ahorro")
          .select("monto_actual")
          .eq("id", ingresoToDelete.destino_caja_id)
          .single()

        if (cajaData) {
          const nuevoMonto = Math.max(0, Number(cajaData.monto_actual) - montoRevertir)
          await supabase
            .from("cajas_ahorro")
            .update({ monto_actual: nuevoMonto })
            .eq("id", ingresoToDelete.destino_caja_id)

          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from("movimientos_caja").insert({
              caja_id: ingresoToDelete.destino_caja_id,
              perfil_id: perfilActual?.id,
              user_id: user.id,
              tipo: "retiro",
              monto: montoRevertir,
              descripcion: `Reversion: eliminacion de ingreso "${ingresoToDelete.tipo_ingreso}"`,
              fecha: new Date().toISOString().split("T")[0],
            })
          }
        }
      }
    }

    // Si es un egreso con origen, revertir el descuento
    if (deleteType === "egreso") {
      const egresoToDelete = egresos.find((e) => e.id === deleteId)
      if (egresoToDelete?.origen_tipo && egresoToDelete?.origen_id) {
        const montoRevertir = Number(egresoToDelete.monto)

        if (egresoToDelete.origen_tipo === "caja_ahorro") {
          // Devolver dinero a la caja de ahorro
          const { data: cajaData } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual")
            .eq("id", egresoToDelete.origen_id)
            .single()

          if (cajaData) {
            await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: Number(cajaData.monto_actual) + montoRevertir })
              .eq("id", egresoToDelete.origen_id)

            // Registrar movimiento de deposito (reversion)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase.from("movimientos_caja").insert({
                caja_id: egresoToDelete.origen_id,
                perfil_id: perfilActual?.id,
                user_id: user.id,
                tipo: "deposito",
                monto: montoRevertir,
                descripcion: `Reversion por eliminacion de egreso`,
                fecha: new Date().toISOString().split("T")[0],
              })
            }
          }
        } else if (egresoToDelete.origen_tipo === "tarjeta_credito") {
          // Devolver credito disponible a la tarjeta
          const { data: tarjetaData } = await supabase
            .from("deudas")
            .select("monto_total")
            .eq("id", egresoToDelete.origen_id)
            .single()

          if (tarjetaData) {
            await supabase
              .from("deudas")
              .update({ monto_total: Number(tarjetaData.monto_total) + montoRevertir })
              .eq("id", egresoToDelete.origen_id)
          }
        }
      }

      // Si el egreso es un pago de deuda (prestamo o tarjeta), revertir monto_pagado
      if (egresoToDelete?.deuda_id) {
        const montoRevertir = Number(egresoToDelete.monto)
        const { data: deudaData } = await supabase
          .from("deudas")
          .select("monto_pagado, cuotas_pagadas, monto_total, tipo_deuda, limite_credito")
          .eq("id", egresoToDelete.deuda_id)
          .single()

        if (deudaData) {
          const nuevoMontoPagado = Math.max(0, Number(deudaData.monto_pagado) - montoRevertir)
          const nuevasCuotas = egresoToDelete.numero_cuota
            ? Math.max(0, Number(deudaData.cuotas_pagadas) - 1)
            : Number(deudaData.cuotas_pagadas)

          let nuevoMontoTotal = Number(deudaData.monto_total)
          if (deudaData.tipo_deuda === "tarjeta_credito") {
            // Para tarjetas: al revertir un pago, se reduce el disponible
            nuevoMontoTotal = Math.max(0, Number(deudaData.monto_total) - montoRevertir)
          }

          const estaPagada = deudaData.tipo_deuda === "tarjeta_credito"
            ? nuevoMontoTotal >= (Number(deudaData.limite_credito) || 0)
            : nuevoMontoPagado >= nuevoMontoTotal

          await supabase
            .from("deudas")
            .update({
              monto_total: nuevoMontoTotal,
              monto_pagado: nuevoMontoPagado,
              cuotas_pagadas: nuevasCuotas,
              estado: estaPagada ? "pagada" : "activa",
            })
            .eq("id", egresoToDelete.deuda_id)
        }
      }
    }

    const { error } = await supabase.from(table).delete().eq("id", deleteId)

    if (!error) {
      loadData()
    }

    setDeleteId(null)
    setDeleteType(null)
  }

  const handleEdit = (item: Ingreso | Egreso, type: "ingreso" | "egreso") => {
    setEditId(item.id)
    setEditType(type)
    setEditData({ ...item })
  }

  const handleSaveEdit = async () => {
    if (!editId || !editType || !editData) return

    const supabase = createClient()
    const table = editType === "ingreso" ? "ingresos" : "egresos"

    let updateData: any
    if (editType === "ingreso") {
      updateData = {
        tipo_ingreso: editData.tipo_ingreso,
        monto: editData.monto,
        fecha: editData.fecha,
      }
    } else {
      updateData = {
        monto: editData.monto,
        fecha: editData.fecha,
        concepto: editData.concepto,
      }
    }

    // Si es un egreso vinculado a una deuda y cambio el monto, ajustar la deuda
    if (editType === "egreso") {
      const egresoOriginal = egresos.find((e) => e.id === editId)
      if (egresoOriginal?.deuda_id && Number(editData.monto) !== Number(egresoOriginal.monto)) {
        const diferencia = Number(editData.monto) - Number(egresoOriginal.monto)

        const { data: deudaData } = await supabase
          .from("deudas")
          .select("monto_pagado, monto_total, tipo_deuda, limite_credito")
          .eq("id", egresoOriginal.deuda_id)
          .single()

        if (deudaData) {
          const nuevoMontoPagado = Math.max(0, Number(deudaData.monto_pagado) + diferencia)
          let nuevoMontoTotal = Number(deudaData.monto_total)

          if (deudaData.tipo_deuda === "tarjeta_credito") {
            nuevoMontoTotal = Math.max(0, Number(deudaData.monto_total) + diferencia)
          }

          const estaPagada = deudaData.tipo_deuda === "tarjeta_credito"
            ? nuevoMontoTotal >= (Number(deudaData.limite_credito) || 0)
            : nuevoMontoPagado >= nuevoMontoTotal

          await supabase
            .from("deudas")
            .update({
              monto_total: nuevoMontoTotal,
              monto_pagado: nuevoMontoPagado,
              estado: estaPagada ? "pagada" : "activa",
            })
            .eq("id", egresoOriginal.deuda_id)
        }
      }

      // Si el egreso tenia origen (caja/tarjeta) y cambio el monto, ajustar el origen
      if (egresoOriginal?.origen_tipo && egresoOriginal?.origen_id && Number(editData.monto) !== Number(egresoOriginal.monto)) {
        const diferencia = Number(editData.monto) - Number(egresoOriginal.monto)

        if (egresoOriginal.origen_tipo === "caja_ahorro") {
          const { data: cajaData } = await supabase
            .from("cajas_ahorro")
            .select("monto_actual")
            .eq("id", egresoOriginal.origen_id)
            .single()

          if (cajaData) {
            await supabase
              .from("cajas_ahorro")
              .update({ monto_actual: Math.max(0, Number(cajaData.monto_actual) - diferencia) })
              .eq("id", egresoOriginal.origen_id)
          }
        } else if (egresoOriginal.origen_tipo === "tarjeta_credito") {
          const { data: tarjetaData } = await supabase
            .from("deudas")
            .select("monto_total")
            .eq("id", egresoOriginal.origen_id)
            .single()

          if (tarjetaData) {
            await supabase
              .from("deudas")
              .update({ monto_total: Math.max(0, Number(tarjetaData.monto_total) - diferencia) })
              .eq("id", egresoOriginal.origen_id)
          }
        }
      }
    }

    // Si es un ingreso con destino caja y cambio el monto, ajustar la caja
    if (editType === "ingreso") {
      const ingresoOriginal = ingresos.find((i) => i.id === editId)
      if (ingresoOriginal?.destino_caja_id && Number(editData.monto) !== Number(ingresoOriginal.monto)) {
        const diferencia = Number(editData.monto) - Number(ingresoOriginal.monto)

        const { data: cajaData } = await supabase
          .from("cajas_ahorro")
          .select("monto_actual")
          .eq("id", ingresoOriginal.destino_caja_id)
          .single()

        if (cajaData) {
          await supabase
            .from("cajas_ahorro")
            .update({ monto_actual: Math.max(0, Number(cajaData.monto_actual) + diferencia) })
            .eq("id", ingresoOriginal.destino_caja_id)
        }
      }
    }

    const { error } = await supabase.from(table).update(updateData).eq("id", editId)

    if (!error) {
      loadData()
      setEditId(null)
      setEditType(null)
      setEditData(null)
    } else {
      console.error("[v0] Error al guardar edicion:", error)
      alert("Error al guardar los cambios. Por favor intenta nuevamente.")
    }
  }

  // Lista de meses disponibles (YYYY-MM) a partir de todos los movimientos,
  // ordenados del más reciente al más antiguo, para el filtro del historial.
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    ;[...ingresos, ...egresos].forEach((m) => {
      if (m.fecha) set.add(String(m.fecha).slice(0, 7))
    })
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1))
  }, [ingresos, egresos])

  // Aplica el filtro de mes seleccionado ("todos" = sin filtro).
  const matchesMonth = (fecha: string | null | undefined) => {
    if (selectedMonth === "todos") return true
    return !!fecha && String(fecha).slice(0, 7) === selectedMonth
  }

  const filteredIngresos = useMemo(
    () => ingresos.filter((i) => matchesMonth(i.fecha)),
    [ingresos, selectedMonth],
  )
  const filteredEgresos = useMemo(
    () => egresos.filter((e) => matchesMonth(e.fecha)),
    [egresos, selectedMonth],
  )

  // Descarga un archivo Excel (.xlsx) profesional con 3 hojas: Ingresos, Egresos
  // y Presupuesto. Exporta SIEMPRE la información completa del perfil, sin
  // importar el filtro de mes aplicado en pantalla.
  const handleDownloadRegistro = async () => {
    if (!perfilActual?.id) return
    setIsDownloading(true)
    try {
      const supabase = createClient()
      const ExcelJS = (await import("exceljs")).default

      // Traer datos de presupuesto (egresos e ingresos presupuestados)
      const [{ data: presupCategorias }, { data: presupIngresos }, { data: catIngresos }] = await Promise.all([
        supabase
          .from("presupuesto_categorias")
          .select("mes, tipo_categoria, categoria, monto_presupuestado")
          .eq("perfil_id", perfilActual.id)
          .order("mes", { ascending: false }),
        supabase
          .from("presupuesto_ingresos")
          .select("mes, categoria_ingreso_id, monto_presupuestado")
          .eq("perfil_id", perfilActual.id)
          .order("mes", { ascending: false }),
        supabase.from("categorias_ingresos").select("id, nombre").eq("perfil_id", perfilActual.id),
      ])

      const catIngresosMap: Record<string, string> = {}
      ;(catIngresos || []).forEach((c) => {
        catIngresosMap[c.id] = c.nombre
      })

      const workbook = new ExcelJS.Workbook()
      workbook.creator = "ProsperaMás"
      workbook.created = new Date()

      // Estilos reutilizables para las cabeceras
      const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF7C3AED" } }
      const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 }
      const styleHeader = (row: any) => {
        row.eachCell((cell: any) => {
          cell.fill = headerFill
          cell.font = headerFont
          cell.alignment = { vertical: "middle", horizontal: "left" }
          cell.border = { bottom: { style: "thin", color: { argb: "FFD1D5DB" } } }
        })
        row.height = 22
      }
      const zebra = (sheet: any) => {
        sheet.eachRow((row: any, rowNumber: number) => {
          if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell((cell: any) => {
              if (!cell.fill || cell.fill.type !== "pattern" || cell.fill.fgColor?.argb !== "FF7C3AED") {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F3FF" } }
              }
            })
          }
        })
      }
      const GS = '"Gs" #,##0'

      // ---------- Hoja INGRESOS ----------
      const wsIng = workbook.addWorksheet("Ingresos", { views: [{ state: "frozen", ySplit: 1 }] })
      wsIng.columns = [
        { header: "Fecha", key: "fecha", width: 14 },
        { header: "Tipo de Ingreso", key: "tipo", width: 28 },
        { header: "Destino", key: "destino", width: 26 },
        { header: "Monto (Gs)", key: "monto", width: 18 },
      ]
      ;[...ingresos]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .forEach((i) => {
          wsIng.addRow({
            fecha: formatDateWithoutTimezone(i.fecha),
            tipo: i.tipo_ingreso || "Sin especificar",
            destino: destinosInfo[i.id]?.nombre || (i.destino_caja_id ? "Caja de ahorro" : "-"),
            monto: Number(i.monto) || 0,
          })
        })
      wsIng.getColumn("monto").numFmt = GS
      styleHeader(wsIng.getRow(1))
      zebra(wsIng)

      // ---------- Hoja EGRESOS ----------
      const wsEgr = workbook.addWorksheet("Egresos", { views: [{ state: "frozen", ySplit: 1 }] })
      wsEgr.columns = [
        { header: "Fecha", key: "fecha", width: 14 },
        { header: "Categoría", key: "categoria", width: 24 },
        { header: "Subcategoría", key: "subcategoria", width: 26 },
        { header: "Concepto", key: "concepto", width: 30 },
        { header: "Origen del Dinero", key: "origen", width: 24 },
        { header: "Monto (Gs)", key: "monto", width: 18 },
      ]
      ;[...egresos]
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .forEach((e) => {
          wsEgr.addRow({
            fecha: formatDateWithoutTimezone(e.fecha),
            categoria: e.tipos_categoria_egreso?.nombre || "Sin categoría",
            subcategoria: e.categorias_egreso?.nombre || "-",
            concepto: e.concepto || "-",
            origen: origenesInfo[e.id]?.nombre || "Sin especificar",
            monto: Number(e.monto) || 0,
          })
        })
      wsEgr.getColumn("monto").numFmt = GS
      styleHeader(wsEgr.getRow(1))
      zebra(wsEgr)

      // ---------- Hoja PRESUPUESTO ----------
      const wsPre = workbook.addWorksheet("Presupuesto", { views: [{ state: "frozen", ySplit: 1 }] })
      wsPre.columns = [
        { header: "Mes", key: "mes", width: 16 },
        { header: "Flujo", key: "flujo", width: 14 },
        { header: "Tipo / Categoría", key: "tipo", width: 26 },
        { header: "Detalle", key: "detalle", width: 26 },
        { header: "Monto Presupuestado (Gs)", key: "monto", width: 26 },
      ]
      ;(presupIngresos || []).forEach((p) => {
        wsPre.addRow({
          mes: formatMesLabel(String(p.mes).slice(0, 7)),
          flujo: "Ingreso",
          tipo: catIngresosMap[p.categoria_ingreso_id] || "Ingreso",
          detalle: "-",
          monto: Number(p.monto_presupuestado) || 0,
        })
      })
      ;(presupCategorias || []).forEach((p) => {
        wsPre.addRow({
          mes: formatMesLabel(String(p.mes).slice(0, 7)),
          flujo: "Egreso",
          tipo: p.tipo_categoria || "Categoría",
          detalle: p.categoria || "-",
          monto: Number(p.monto_presupuestado) || 0,
        })
      })
      wsPre.getColumn("monto").numFmt = GS
      styleHeader(wsPre.getRow(1))
      zebra(wsPre)

      // Generar y descargar
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Registro_${perfilActual.nombre || "Personal"}_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("[v0] Error al descargar registro:", err)
    } finally {
      setIsDownloading(false)
    }
  }

  if (!perfilActual) {
    return (
      <div>
        <DashboardHeader title="Editar y Eliminar Cargas" description="Edita o elimina tus movimientos personales" />
        <div className="p-6">
          <Card className="glass-effect border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">Cargando perfil personal...</CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <DashboardHeader title="Editar y Eliminar Cargas" description="Edita o elimina tus movimientos personales" />

      <div className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[200px] glass-effect text-sm">
                <SelectValue placeholder="Filtrar por mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los meses</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMesLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleDownloadRegistro} disabled={isDownloading} className="gap-2 text-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isDownloading ? "Generando..." : "Descargar Registro"}</span>
            <span className="sm:hidden">{isDownloading ? "..." : "Descargar"}</span>
          </Button>
        </div>

        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="glass-effect w-full grid grid-cols-3">
            <TabsTrigger value="todos" className="text-xs sm:text-sm">Todos</TabsTrigger>
            <TabsTrigger value="ingresos" className="text-xs sm:text-sm">Ingresos</TabsTrigger>
            <TabsTrigger value="egresos" className="text-xs sm:text-sm">Egresos</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="todos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : (
                  <>
                    {[...filteredIngresos, ...filteredEgresos]
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((item) => {
                        const isIngreso = "tipo_ingreso" in item
                        const egreso = !isIngreso ? (item as Egreso) : null
                        return (
                          <Card
                            key={item.id}
                            className="glass-effect border-border/50 hover:glow-effect transition-all"
                          >
                            <CardContent className="p-3 sm:p-6">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-center gap-3 sm:gap-4">
                                  <div
                                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: isIngreso
                                        ? "rgba(34, 197, 94, 0.2)"
                                        : `${egreso?.tipos_categoria_egreso?.color || "#ef4444"}20`,
                                    }}
                                  >
                                    {isIngreso ? (
                                      <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                                    ) : (
                                      <TrendingDown
                                        className="w-5 h-5 sm:w-6 sm:h-6"
                                        style={{ color: egreso?.tipos_categoria_egreso?.color || "#ef4444" }}
                                      />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <h3 className="font-semibold text-sm sm:text-base truncate">
                                        {isIngreso
                                          ? (item as Ingreso).tipo_ingreso
                                          : egreso?.tipos_categoria_egreso?.nombre || "Sin categoría"}
                                      </h3>
                                      <Badge
                                        variant={isIngreso ? "default" : "destructive"}
                                        className="text-xs"
                                        style={
                                          !isIngreso
                                            ? { backgroundColor: egreso?.tipos_categoria_egreso?.color || "#ef4444" }
                                            : undefined
                                        }
                                      >
                                        {isIngreso ? "Ingreso" : "Egreso"}
                                      </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatDateWithoutTimezone(item.fecha)}
                                      </span>
                                      {!isIngreso && egreso?.categorias_egreso?.nombre && (
                                        <span className="text-xs">{egreso.categorias_egreso.nombre}</span>
                                      )}
                                    </div>
                                    {!isIngreso && egreso?.concepto && (
                                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-1">{egreso.concepto}</p>
                                    )}
                                    {/* Destino del ingreso */}
                                    {isIngreso && destinosInfo[item.id] && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <ArrowRight className="w-3 h-3 text-blue-400" />
                                        <div className="p-1 rounded bg-blue-500/20">
                                          {destinosInfo[item.id].tipo_cuenta === "cuenta_bancaria" ? (
                                            <Landmark className="w-3 h-3 text-blue-400" />
                                          ) : destinosInfo[item.id].tipo_cuenta === "billetera_digital" ? (
                                            <Smartphone className="w-3 h-3 text-cyan-400" />
                                          ) : destinosInfo[item.id].tipo_cuenta === "ahorro_personal" ? (
                                            <Wallet className="w-3 h-3 text-green-400" />
                                          ) : (
                                            <PiggyBank className="w-3 h-3 text-amber-400" />
                                          )}
                                        </div>
                                        <span className="text-[11px] font-medium text-blue-400">
                                          {destinosInfo[item.id].nombre}
                                          {destinosInfo[item.id].banco ? ` (${destinosInfo[item.id].banco})` : ""}
                                        </span>
                                      </div>
                                    )}
                                    {/* Origen del egreso */}
                                    {!isIngreso && origenesInfo[item.id] && (
                                      <div className="flex items-center gap-1.5 mt-1.5">
                                        <div className={`p-1 rounded ${origenesInfo[item.id].tipo === "caja_ahorro" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                                          {origenesInfo[item.id].tipo === "caja_ahorro" ? (
                                            <Building2 className="w-3 h-3 text-blue-400" />
                                          ) : (
                                            <CreditCard className="w-3 h-3 text-purple-400" />
                                          )}
                                        </div>
                                        <span className={`text-[11px] font-medium ${origenesInfo[item.id].tipo === "caja_ahorro" ? "text-blue-400" : "text-purple-400"}`}>
                                          {origenesInfo[item.id].nombre}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-13 sm:pl-0">
                                  <div className="text-right">
                                    <p
                                      className="text-lg sm:text-2xl font-bold"
                                      style={{
                                        color: isIngreso
                                          ? "#22c55e"
                                          : egreso?.tipos_categoria_egreso?.color || "#ef4444",
                                      }}
                                    >
                                      {isIngreso ? "+" : "-"}
                                      {formatMoney(Number(item.monto))}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(item, isIngreso ? "ingreso" : "egreso")}
                                      className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setDeleteId(item.id)
                                        setDeleteType(isIngreso ? "ingreso" : "egreso")
                                      }}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-10 sm:w-10"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    {filteredIngresos.length === 0 && filteredEgresos.length === 0 && (
                      <Card className="glass-effect border-border/50">
                        <CardContent className="py-12 text-center text-muted-foreground">
                          No hay transacciones registradas para este perfil personal
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ingresos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : filteredIngresos.length > 0 ? (
                  filteredIngresos.map((ingreso) => (
                    <Card key={ingreso.id} className="glass-effect border-border/50 hover:glow-effect transition-all">
                      <CardContent className="p-3 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm sm:text-base">{ingreso.tipo_ingreso}</h3>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] sm:text-xs">
                                  Ingreso
                                </Badge>
                              </div>
                              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {formatDateWithoutTimezone(ingreso.fecha)}
                              </p>
                              {destinosInfo[ingreso.id] && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <ArrowRight className="w-3 h-3 text-blue-400" />
                                  <div className="p-1 rounded bg-blue-500/20">
                                    {destinosInfo[ingreso.id].tipo_cuenta === "cuenta_bancaria" ? (
                                      <Landmark className="w-3 h-3 text-blue-400" />
                                    ) : destinosInfo[ingreso.id].tipo_cuenta === "billetera_digital" ? (
                                      <Smartphone className="w-3 h-3 text-cyan-400" />
                                    ) : destinosInfo[ingreso.id].tipo_cuenta === "ahorro_personal" ? (
                                      <Wallet className="w-3 h-3 text-green-400" />
                                    ) : (
                                      <PiggyBank className="w-3 h-3 text-amber-400" />
                                    )}
                                  </div>
                                  <span className="text-[11px] font-medium text-blue-400">
                                    {destinosInfo[ingreso.id].nombre}
                                    {destinosInfo[ingreso.id].banco ? ` (${destinosInfo[ingreso.id].banco})` : ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 mt-2 sm:mt-0">
                            <p className="text-lg sm:text-2xl font-bold text-primary">
                              +{formatMoney(Number(ingreso.monto))}
                            </p>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(ingreso, "ingreso")}
                                className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteId(ingreso.id)
                                  setDeleteType("ingreso")
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-10 sm:w-10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No hay ingresos registrados
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="egresos">
              <div className="space-y-4">
                {isLoading ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent>
                  </Card>
                ) : filteredEgresos.length > 0 ? (
                  filteredEgresos.map((egreso) => (
                    <Card key={egreso.id} className="glass-effect border-border/50 hover:glow-effect transition-all">
                      <CardContent className="p-3 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: `${egreso.tipos_categoria_egreso?.color || "#ef4444"}20`,
                              }}
                            >
                              <TrendingDown
                                className="w-5 h-5 sm:w-6 sm:h-6"
                                style={{ color: egreso.tipos_categoria_egreso?.color || "#ef4444" }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm sm:text-base">
                                  {egreso.tipos_categoria_egreso?.nombre || "Sin categoria"}
                                </h3>
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] sm:text-xs"
                                  style={{ 
                                    backgroundColor: `${egreso.tipos_categoria_egreso?.color || "#ef4444"}20`,
                                    color: egreso.tipos_categoria_egreso?.color || "#ef4444",
                                    borderColor: `${egreso.tipos_categoria_egreso?.color || "#ef4444"}50`
                                  }}
                                >
                                  Egreso
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-0.5 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDateWithoutTimezone(egreso.fecha)}
                                </span>
                                {egreso.categorias_egreso?.nombre && (
                                  <span className="text-xs">{egreso.categorias_egreso.nombre}</span>
                                )}
                              </div>
                              {egreso.concepto && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">{egreso.concepto}</p>
                              )}
                              {origenesInfo[egreso.id] && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <div className={`p-1 rounded ${origenesInfo[egreso.id].tipo === "caja_ahorro" ? "bg-blue-500/20" : "bg-purple-500/20"}`}>
                                    {origenesInfo[egreso.id].tipo === "caja_ahorro" ? (
                                      <Building2 className="w-3 h-3 text-blue-400" />
                                    ) : (
                                      <CreditCard className="w-3 h-3 text-purple-400" />
                                    )}
                                  </div>
                                  <span className={`text-[11px] font-medium ${origenesInfo[egreso.id].tipo === "caja_ahorro" ? "text-blue-400" : "text-purple-400"}`}>
                                    {origenesInfo[egreso.id].nombre}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 mt-2 sm:mt-0">
                            <p
                              className="text-lg sm:text-2xl font-bold"
                              style={{ color: egreso.tipos_categoria_egreso?.color || "#ef4444" }}
                            >
                              -{formatMoney(Number(egreso.monto))}
                            </p>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(egreso, "egreso")}
                                className="text-primary hover:text-primary hover:bg-primary/10 h-8 w-8 sm:h-10 sm:w-10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteId(egreso.id)
                                  setDeleteType("egreso")
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 sm:h-10 sm:w-10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No hay egresos registrados
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="glass-effect">
          <DialogHeader>
            <DialogTitle>Editar {editType === "ingreso" ? "Ingreso" : "Egreso"}</DialogTitle>
            <DialogDescription>Modifica los datos de la transacción personal</DialogDescription>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              {editType === "ingreso" ? (
                <>
                  <div>
                    <Label>Tipo de Ingreso</Label>
                    <Input
                      value={editData.tipo_ingreso}
                      onChange={(e) => setEditData({ ...editData, tipo_ingreso: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editData.monto}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "")
                        setEditData({ ...editData, monto: value ? Number.parseFloat(value) : 0 })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={editData.fecha}
                      onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>Monto</Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editData.monto}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, "")
                        setEditData({ ...editData, monto: value ? Number.parseFloat(value) : 0 })
                      }}
                    />
                  </div>
                  <div>
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={editData.fecha}
                      onChange={(e) => setEditData({ ...editData, fecha: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Concepto (opcional)</Label>
                    <Input
                      value={editData.concepto || ""}
                      onChange={(e) => setEditData({ ...editData, concepto: e.target.value })}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>
              <Check className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-effect">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
