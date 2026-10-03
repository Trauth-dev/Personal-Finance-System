"use client"

import { useMemo, useState } from "react"
import { Search, ChevronRight } from "lucide-react"
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
type Orden = "ingreso" | "alta" | "actividad" | "nombre"

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
    }
    const k = clave[orden]
    return [...lista].sort((a, b) => {
      const x = k(a)
      const y = k(b)
      if (orden === "nombre") return String(x).localeCompare(String(y))
      return x < y ? 1 : x > y ? -1 : 0
    })
  }, [usuarios, busqueda, filtro, orden])

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
          <SelectTrigger className="md:w-52" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ingreso">Último ingreso</SelectItem>
            <SelectItem value="alta">Fecha de alta</SelectItem>
            <SelectItem value="actividad">Más datos cargados</SelectItem>
            <SelectItem value="nombre">Nombre (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando {visibles.length} de {usuarios.length} usuarios
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Usuario</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead>Pago</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead>Último ingreso</TableHead>
              <TableHead className="text-right">Datos</TableHead>
              <TableHead>Avisos</TableHead>
              <TableHead>
                <span className="sr-only">Ver ficha</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
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
