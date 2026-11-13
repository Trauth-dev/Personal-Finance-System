"use client"

import { useMemo, useState } from "react"
import { Search, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { UsuarioAdmin } from "@/lib/admin/datos"
import {
  AVISO_CLASE,
  ESTADO_CUENTA_INFO,
  ESTADO_PAGO_INFO,
  SEGMENTO_INFO,
  fmtFecha,
  fmtNum,
  fmtRelativo,
} from "@/components/admin/formato"

type Filtro =
  | "todos"
  | "atencion"
  | "activo"
  | "pausado"
  | "bloqueado"
  | "nuevo"
  | "en_riesgo"
  | "inactivo"
  | "sin_activar"
type Orden = "ingreso" | "alta" | "actividad" | "nombre" | "plan" | "pago" | "cuenta" | "avisos"

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "todos", label: "Todos" },
  { valor: "atencion", label: "Requieren atención" },
  { valor: "activo", label: "Cuenta activa" },
  { valor: "pausado", label: "Pausados" },
  { valor: "bloqueado", label: "Bloqueados" },
  { valor: "nuevo", label: "Nuevos" },
  { valor: "en_riesgo", label: "En riesgo" },
  { valor: "inactivo", label: "Inactivos" },
  { valor: "sin_activar", label: "Sin activar" },
]

function coincide(u: UsuarioAdmin, filtro: Filtro) {
  switch (filtro) {
    case "todos":
      return true
    case "atencion":
      return u.avisos.some((a) => a.nivel !== "info")
    case "activo":
    case "pausado":
    case "bloqueado":
      return u.estado === filtro
    default:
      return u.segmento === filtro
  }
}

export function TablaUsuarios({
  usuarios,
  onSeleccionar,
}: {
  usuarios: UsuarioAdmin[]
  onSeleccionar: (id: string) => void
}) {
  const [busqueda, setBusqueda] = useState("")
  const [filtro, setFiltro] = useState<Filtro>("todos")
  const [orden, setOrden] = useState<Orden>("ingreso")
  const [ascendente, setAscendente] = useState(false)

  function ordenarPor(o: Orden) {
    if (o === orden) setAscendente((a) => !a)
    else {
      setOrden(o)
      setAscendente(o === "nombre" || o === "plan" || o === "pago")
    }
  }

  function Encabezado({ o, children, className }: { o: Orden; children: React.ReactNode; className?: string }) {
    const activo = orden === o
    const Icono = !activo ? ArrowUpDown : ascendente ? ArrowUp : ArrowDown
    return (
      <TableHead className={className} aria-sort={activo ? (ascendente ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => ordenarPor(o)}
          className={cn(
            "inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            activo && "text-foreground",
          )}
        >
          {children}
          <Icono className="size-3.5" aria-hidden="true" />
        </button>
      </TableHead>
    )
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const lista = usuarios.filter(
      (u) =>
        coincide(u, filtro) &&
        (!q || u.nombre.toLowerCase().includes(q) || u.email.includes(q) || (u.telefono ?? "").includes(q)),
    )
    const clave: Record<Orden, (u: UsuarioAdmin) => string | number> = {
      ingreso: (u) => u.ultimoIngreso ?? "",
      alta: (u) => u.creado,
      actividad: (u) => u.actividad.total,
      nombre: (u) => u.nombre.toLowerCase(),
      plan: (u) => u.planActual,
      pago: (u) => ESTADO_PAGO_INFO[u.pago.estado].label,
      cuenta: (u) => u.estado,
      avisos: (u) => u.avisos.length,
    }
    const k = clave[orden]
    const dir = ascendente ? 1 : -1
    return [...lista].sort((a, b) => {
      const x = k(a)
      const y = k(b)
      if (typeof x === "string" && typeof y === "string") return x.localeCompare(y, "es") * dir
      return (x < y ? -1 : x > y ? 1 : 0) * dir
    })
  }, [usuarios, busqueda, filtro, orden, ascendente])

  return (
    <section aria-label="Usuarios" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono"
            className="pl-9"
            aria-label="Buscar usuarios"
          />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="md:w-52" aria-label="Filtrar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTROS.map((f) => (
              <SelectItem key={f.valor} value={f.valor}>
                {f.label} ({usuarios.filter((u) => coincide(u, f.valor)).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orden} onValueChange={(v) => setOrden(v as Orden)}>
          <SelectTrigger className="md:w-48" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ingreso">Último ingreso</SelectItem>
            <SelectItem value="alta">Fecha de alta</SelectItem>
            <SelectItem value="actividad">Datos cargados</SelectItem>
            <SelectItem value="nombre">Nombre</SelectItem>
            <SelectItem value="plan">Plan</SelectItem>
            <SelectItem value="pago">Estado de pago</SelectItem>
            <SelectItem value="cuenta">Estado de cuenta</SelectItem>
            <SelectItem value="avisos">Avisos</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={() => setAscendente((a) => !a)}
          aria-label={ascendente ? "Orden de menor a mayor" : "Orden de mayor a menor"}
          className="gap-2"
        >
          {ascendente ? <ArrowUp className="size-4" aria-hidden="true" /> : <ArrowDown className="size-4" aria-hidden="true" />}
          {ascendente ? "Menor a mayor" : "Mayor a menor"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {visibles.length} de {usuarios.length} usuarios
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <Encabezado o="nombre">Usuario</Encabezado>
              <Encabezado o="cuenta">Cuenta</Encabezado>
              <Encabezado o="plan">Plan</Encabezado>
              <Encabezado o="pago">Pago</Encabezado>
              <TableHead>Uso</TableHead>
              <Encabezado o="alta">Alta</Encabezado>
              <Encabezado o="ingreso">Último ingreso</Encabezado>
              <Encabezado o="actividad" className="text-right">Datos</Encabezado>
              <Encabezado o="avisos">Avisos</Encabezado>
              <TableHead>
                <span className="sr-only">Ver ficha</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                  No hay usuarios con ese criterio.
                </TableCell>
              </TableRow>
            )}
            {visibles.map((u) => {
              const avisosRelevantes = u.avisos.filter((a) => a.nivel !== "info")
              return (
                <TableRow key={u.id} className="cursor-pointer" onClick={() => onSeleccionar(u.id)}>
                  <TableCell className="max-w-64">
                    <div className="flex flex-col">
                      <span className="truncate font-medium text-foreground">
                        {u.nombre}
                        {u.esAdmin && <span className="ml-2 text-xs font-normal text-primary">Admin</span>}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-xs font-medium",
                        ESTADO_CUENTA_INFO[u.estado].clase,
                      )}
                    >
                      {ESTADO_CUENTA_INFO[u.estado].label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-foreground">
                    {u.planActual === "total" ? "Total" : "Personal"}
                  </TableCell>
                  <TableCell className={cn("text-sm", ESTADO_PAGO_INFO[u.pago.estado].clase)}>
                    {ESTADO_PAGO_INFO[u.pago.estado].label}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground" title={SEGMENTO_INFO[u.segmento].descripcion}>
                    {SEGMENTO_INFO[u.segmento].label}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtFecha(u.creado)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-foreground">{fmtRelativo(u.ultimoIngreso)}</TableCell>
                  <TableCell className="text-right font-mono text-sm tabular-nums">{fmtNum(u.actividad.total)}</TableCell>
                  <TableCell>
                    {avisosRelevantes.length > 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            AVISO_CLASE[avisosRelevantes.some((a) => a.nivel === "alto") ? "alto" : "medio"],
                          )}
                          aria-hidden="true"
                        />
                        {avisosRelevantes.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSeleccionar(u.id)
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Ver ficha de ${u.nombre}`}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
