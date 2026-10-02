"use client"

import { useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function CuentaRestringidaPage() {
  useEffect(() => {
    createClient().auth.signOut()
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-balance text-xl font-semibold text-foreground">Tu cuenta está restringida</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          El acceso a tu cuenta de Prospera+ fue pausado o suspendido por administración. Tus datos se conservan intactos.
          Si creés que es un error o querés reactivarla, comunicate con el equipo de Prospera+.
        </p>
        <Link href="/auth/login" className="text-sm font-medium text-primary hover:underline">
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  )
}
