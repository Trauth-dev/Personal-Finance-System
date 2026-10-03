"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { ResumenAdmin, UsuarioAdmin } from "@/lib/admin/datos"
import { PRECIO_PLAN_COMPLETO, PRECIO_PLAN_PERSONAL } from "@/lib/admin/config"
import { SEGMENTO_INFO, fmtGs, fmtMes } from "@/components/admin/formato"

type Hallazgo = { titulo: string; detalle: string; recomendacion: string }

function construirHallazgos(r: ResumenAdmin, usuarios: UsuarioAdmin[]): Hallazgo[] {
  const h: Hallazgo[] = []
  if (r.sinActivar > 0)
    h.push({
      titulo: `${r.sinActivar} usuarios se registraron y nunca cargaron datos`,
      detalle: `La tasa de activación es ${r.tasaActivacion}%. Un usuario que no carga su primer ingreso o egreso casi nunca vuelve.`,
      recomendacion: "Contactalos por WhatsApp en las primeras 48 h del alta con una guía de 3 pasos para su primera carga.",
    })
  if (r.enRiesgo + r.inactivos > 0)
    h.push({
      titulo: `${r.enRiesgo + r.inactivos} usuarios con uso en caída`,
      detalle: `${r.enRiesgo} llevan entre 15 y 30 días sin usar la app y ${r.inactivos} más de 30 días.`,
      recomendacion:
        "Antes de empezar a cobrar, priorizá recuperar a los que están en riesgo: son los más fáciles de reactivar.",
    })
  if (r.nuncaIngresaron > 0)
    h.push({
      titulo: `${r.nuncaIngresaron} cuentas nunca iniciaron sesión`,
      detalle: "Pueden ser registros abandonados, correos mal escritos o cuentas creadas para terceros.",
      recomendacion: "Revisalas y depurá las que no correspondan para que las métricas reflejen usuarios reales.",
    })
  if (r.emailsSinConfirmar > 0)
    h.push({
      titulo: `${r.emailsSinConfirmar} correos sin confirmar`,
      detalle: "Sin correo confirmado no podrán recuperar la contraseña ni recibir avisos de cobro.",
      recomendacion: "Pediles confirmar el correo o reenviá la invitación desde Supabase.",
    })
  const demo = usuarios.filter((u) => u.esDemo).length
  if (demo > 0)
    h.push({
      titulo: `${demo} cuenta(s) de demostración`,
      detalle: "Las cuentas demo con contraseñas conocidas son el principal punto de entrada para un atacante.",
      recomendacion: "Bloquealas desde su ficha si ya no se usan para presentaciones.",
    })
  if (r.accesoLibreGlobal)
    h.push({
      titulo: "El acceso libre general está activado",
      detalle: "Hoy ningún usuario necesita pagar. Los estados de pago muestran \u201cAcceso libre\u201d hasta que se cierre.",
      recomendacion: "Definí la fecha de cierre con anticipación y avisá a los usuarios al menos 7 días antes.",
    })
  return h
}

export function Analisis({ resumen, usuarios }: { resumen: ResumenAdmin; usuarios: UsuarioAdmin[] }) {
  const hallazgos = construirHallazgos(resumen, usuarios)
  const segmentos = (Object.keys(SEGMENTO_INFO) as (keyof typeof SEGMENTO_INFO)[]).map((s) => ({
    clave: s,
    ...SEGMENTO_INFO[s],
    cantidad: usuarios.filter((u) => u.segmento === s).length,
  }))
  const max = Math.max(1, ...segmentos.map((s) => s.cantidad))
  const datosAltas = resumen.altasPorMes.map((m) => ({ mes: fmtMes(m.mes), altas: m.altas }))

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 lg:col-span-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold text-foreground">Proyección con los nuevos planes</h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Estimación si hoy se cobrara a los usuarios activos de los últimos 30 días (excluye exentos, demos y cuentas
              restringidas). El plan se asigna según el uso real: quien carga datos en Empresarial o CRM, Completo.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Personal · {fmtGs(PRECIO_PLAN_PERSONAL)}</span>
              <span className="font-mono text-xl font-semibold tabular-nums">{resumen.proyeccion.usuariosPersonal}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Completo · {fmtGs(PRECIO_PLAN_COMPLETO)}</span>
              <span className="font-mono text-xl font-semibold tabular-nums">{resumen.proyeccion.usuariosCompleto}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Ingreso mensual estimado</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-primary">
                {fmtGs(resumen.proyeccion.mensual)}
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {resumen.proyeccion.exentos} cuentas exentas (fundadores y profes) no se incluyen.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Segmentos de uso</h2>
          <ul className="flex flex-col gap-2.5">
            {segmentos.map((s) => (
              <li key={s.clave} className="flex flex-col gap-1" title={s.descripcion}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <span className="font-mono tabular-nums text-muted-foreground">{s.cantidad}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(s.cantidad / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Altas por mes</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosAltas} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--foreground))",
                }}
                formatter={(v: number) => [v, "Altas"]}
              />
              <Bar dataKey="altas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Hallazgos y recomendaciones</h2>
        {hallazgos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay puntos de atención en este momento.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {hallazgos.map((h) => (
              <li key={h.titulo} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <h3 className="text-pretty text-sm font-medium text-foreground">{h.titulo}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{h.detalle}</p>
                <p className="text-sm leading-relaxed text-foreground">
                  <span className="font-medium text-primary">Acción: </span>
                  {h.recomendacion}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
