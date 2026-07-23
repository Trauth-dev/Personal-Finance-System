import { ListChecks, UserCheck, CalendarCheck } from "lucide-react"

const PASOS = [
  {
    icon: ListChecks,
    titulo: "Elegí el área y tema",
    texto: "Seleccioná el área que querés trabajar y los temas específicos.",
  },
  {
    icon: UserCheck,
    titulo: "Elegí al profesional",
    texto: "Revisá los perfiles y elegí el profesional que mejor se adapte a vos.",
  },
  {
    icon: CalendarCheck,
    titulo: "Agendá tu sesión",
    texto: "Seleccioná fecha y hora, y confirmá tu agendamiento.",
  },
]

export function ComoFunciona() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">¿Cómo funciona?</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {PASOS.map((paso, i) => {
          const Icon = paso.icon
          return (
            <div key={paso.titulo} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-slate-600 shrink-0">
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  <span className="text-amber-600 mr-1">{i + 1}.</span>
                  {paso.titulo}
                </p>
                <p className="text-xs text-slate-600 leading-snug mt-0.5">{paso.texto}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
