"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const BASE = "/dashboard/empresarial"

export const GRUPOS_EMPRESARIAL = [
  {
    id: "operaciones",
    items: [
      { title: "Ventas", href: `${BASE}/ventas` },
      { title: "Compras", href: `${BASE}/compras` },
      { title: "Proveedores", href: `${BASE}/proveedores` },
      { title: "Historial", href: `${BASE}/historial` },
    ],
  },
  {
    id: "inventario",
    items: [
      { title: "Productos", href: `${BASE}/inventario` },
      { title: "Materias Primas", href: `${BASE}/materias-primas` },
    ],
  },
  {
    id: "finanzas",
    items: [
      { title: "Cuentas por Cobrar / Pagar", href: `${BASE}/cuentas` },
      { title: "Flujo de Caja", href: `${BASE}/flujo` },
    ],
  },
] as const

export function grupoDeRuta(pathname: string) {
  return GRUPOS_EMPRESARIAL.find((g) => g.items.some((i) => pathname.startsWith(i.href)))
}

export function EmpresarialSubnav() {
  const pathname = usePathname()
  const grupo = grupoDeRuta(pathname)
  if (!grupo) return null

  return (
    <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-2 pb-2 sm:px-4 md:px-6">
      {grupo.items.map((item) => {
        const activo = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activo
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}
