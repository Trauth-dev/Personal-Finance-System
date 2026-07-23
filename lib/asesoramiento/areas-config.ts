import type { ComponentType, SVGProps } from "react"
import { Wallet, Briefcase, HeartHandshake } from "lucide-react"
import { HeadBrainIcon } from "@/components/asesoramiento/icons"

// Tanto los iconos de lucide como los iconos a medida (SVG) cumplen esta firma.
type AreaIcon = ComponentType<SVGProps<SVGSVGElement>>

/**
 * Configuracion del modulo "Asesoramiento".
 *
 * Toda la experiencia (seleccion de area -> temas -> profesional -> servicio ->
 * modalidad -> fecha/hora -> resumen) se construye a partir de estos datos.
 * Esto permite agregar nuevas areas o profesionales sin rediseniar la UI.
 *
 * NOTA: Los profesionales aqui son DATOS DE DEMOSTRACION marcados como "Ejemplo".
 * Cuando se conecte el backend (Supabase), estos datos vendran de la base de datos.
 */

export type AreaId = "finanzas" | "psicologia" | "orientacion" | "espiritual"

export type Modalidad = "online" | "presencial"

// Clases de Tailwind literales por area (no dinamicas para que el compilador las detecte)
export interface AreaTheme {
  // Texto principal del acento
  text: string
  // Fondo solido del acento (botones)
  bg: string
  // Hover del fondo solido
  bgHover: string
  // Fondo suave (chips/tarjetas seleccionadas)
  bgSoft: string
  // Borde del acento
  border: string
  // Ring de foco/seleccion
  ring: string
  // Color secundario (dorado para finanzas, indigo para psicologia)
  accentText: string
  accentBg: string
}

export interface Tema {
  id: string
  label: string
}

export interface Servicio {
  id: string
  label: string
}

export interface Profesional {
  id: string
  nombre: string
  titulo: string
  descripcion: string
  // ids de temas en los que se especializa
  temas: string[]
  modalidades: Modalidad[]
  precioPorSesion: number
  // Todos los profesionales de esta etapa son ejemplos de demostracion
  esEjemplo: boolean
  // Disponibilidad para agendar (aun no activo en esta etapa)
  disponible: boolean
}

export interface AreaConfig {
  id: AreaId
  nombre: string
  descripcionCorta: string
  icon: AreaIcon
  activa: boolean
  theme: AreaTheme
  temas: Tema[]
  servicios: Servicio[]
  profesionales: Profesional[]
}

const themeFinanzas: AreaTheme = {
  text: "text-emerald-700",
  bg: "bg-emerald-600",
  bgHover: "hover:bg-emerald-700",
  bgSoft: "bg-emerald-50",
  border: "border-emerald-500",
  ring: "ring-emerald-500",
  accentText: "text-amber-600",
  accentBg: "bg-amber-500",
}

const themePsicologia: AreaTheme = {
  text: "text-blue-700",
  bg: "bg-blue-600",
  bgHover: "hover:bg-blue-700",
  bgSoft: "bg-blue-50",
  border: "border-blue-500",
  ring: "ring-blue-500",
  accentText: "text-indigo-600",
  accentBg: "bg-indigo-500",
}

export const AREAS: AreaConfig[] = [
  {
    id: "finanzas",
    nombre: "Finanzas",
    descripcionCorta: "Gestioná tu crecimiento y el de tu dinero",
    icon: Wallet,
    activa: true,
    theme: themeFinanzas,
    temas: [
      { id: "deudas", label: "Deudas" },
      { id: "inversiones", label: "Inversiones" },
      { id: "presupuesto", label: "Presupuesto" },
      { id: "ahorro", label: "Ahorro" },
      { id: "emprendimiento", label: "Emprendimiento" },
    ],
    servicios: [
      { id: "asesoria-financiera", label: "Asesoría financiera personalizada" },
      { id: "plan-salida-deudas", label: "Plan de salida de deudas" },
      { id: "armado-presupuesto", label: "Armado de presupuesto" },
    ],
    profesionales: [
      {
        id: "fin-1",
        nombre: "Asesor/a Financiero",
        titulo: "Asesoría financiera",
        descripcion:
          "Te ayuda a ordenar tus finanzas, salir de deudas y crear un plan para alcanzar tus metas.",
        temas: ["deudas", "presupuesto"],
        modalidades: ["online", "presencial"],
        precioPorSesion: 250000,
        esEjemplo: true,
        disponible: false,
      },
      {
        id: "fin-2",
        nombre: "Coach de Deudas",
        titulo: "Especialista en deudas",
        descripcion:
          "Especialista en eliminar deudas y recuperar tu tranquilidad financiera con un método claro.",
        temas: ["deudas", "presupuesto"],
        modalidades: ["online"],
        precioPorSesion: 220000,
        esEjemplo: true,
        disponible: false,
      },
      {
        id: "fin-3",
        nombre: "Especialista en Presupuesto",
        titulo: "Presupuesto y hábitos",
        descripcion:
          "Diseña presupuestos realistas y hábitos que te acercan a tu libertad financiera.",
        temas: ["presupuesto", "ahorro"],
        modalidades: ["online", "presencial"],
        precioPorSesion: 200000,
        esEjemplo: true,
        disponible: false,
      },
    ],
  },
  {
    id: "psicologia",
    nombre: "Psicología",
    descripcionCorta: "Bienestar emocional y mental",
    icon: HeadBrainIcon,
    activa: true,
    theme: themePsicologia,
    temas: [
      { id: "ansiedad", label: "Ansiedad" },
      { id: "estres", label: "Estrés" },
      { id: "autoestima", label: "Autoestima" },
      { id: "relaciones", label: "Relaciones" },
      { id: "duelo", label: "Duelo" },
      { id: "depresion", label: "Depresión" },
    ],
    servicios: [
      { id: "sesion-psicologica", label: "Sesión psicológica personalizada" },
      { id: "terapia-ansiedad", label: "Terapia enfocada en ansiedad" },
      { id: "acompanamiento", label: "Acompañamiento emocional" },
    ],
    profesionales: [
      {
        id: "psi-1",
        nombre: "Psicólogo/a Clínico",
        titulo: "Psicología clínica",
        descripcion:
          "Especialista en ansiedad, estrés y regulación emocional. Acompaña procesos de bienestar integral.",
        temas: ["ansiedad", "estres", "autoestima"],
        modalidades: ["online", "presencial"],
        precioPorSesion: 250000,
        esEjemplo: true,
        disponible: false,
      },
      {
        id: "psi-2",
        nombre: "Psicólogo/a Especializado",
        titulo: "Especialista en ansiedad",
        descripcion:
          "Ofrece herramientas prácticas para gestionar la ansiedad y mejorar tu calidad de vida.",
        temas: ["ansiedad", "estres", "relaciones"],
        modalidades: ["online"],
        precioPorSesion: 220000,
        esEjemplo: true,
        disponible: false,
      },
      {
        id: "psi-3",
        nombre: "Psicólogo/a Integrador",
        titulo: "Psicología clínica",
        descripcion:
          "Trabaja con un enfoque integrador para ayudarte a comprender y transformar tu bienestar emocional.",
        temas: ["autoestima", "duelo", "depresion"],
        modalidades: ["online", "presencial"],
        precioPorSesion: 200000,
        esEjemplo: true,
        disponible: false,
      },
    ],
  },
  // Areas preparadas para el futuro (aun no activas: no se muestran hasta tener profesionales reales)
  {
    id: "orientacion",
    nombre: "Orientación profesional",
    descripcionCorta: "Carrera, propósito y habilidades",
    icon: Briefcase,
    activa: false,
    theme: themeFinanzas,
    temas: [],
    servicios: [],
    profesionales: [],
  },
  {
    id: "espiritual",
    nombre: "Consejería espiritual",
    descripcionCorta: "Crecimiento espiritual y valores",
    icon: HeartHandshake,
    activa: false,
    theme: themePsicologia,
    temas: [],
    servicios: [],
    profesionales: [],
  },
]

export const AREAS_ACTIVAS = AREAS.filter((a) => a.activa)

export function getArea(id: string | null | undefined): AreaConfig | undefined {
  return AREAS.find((a) => a.id === id)
}

export function formatGuaranies(monto: number): string {
  return "Gs " + monto.toLocaleString("es-PY")
}
