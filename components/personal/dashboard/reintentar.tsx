"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RotateCw } from "lucide-react"

export function Reintentar() {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pendiente}
      className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-60"
    >
      <RotateCw className={`size-3 ${pendiente ? "animate-spin" : ""}`} aria-hidden="true" />
      {pendiente ? "Reintentando" : "Reintentar"}
    </button>
  )
}
