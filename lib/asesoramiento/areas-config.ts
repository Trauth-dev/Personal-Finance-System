import type { ComponentType, SVGProps } from "react"
import { Wallet, Briefcase, HeartHandshake } from "lucide-react"
import { HeadBrainIcon } from "@/components/asesoramiento/icons"
import { formatMoney } from "@/lib/currency"

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
  // --- Campos opcionales para profesionales reales ---
  // Foto de perfil (ruta local en /public). Si no existe, se usa el avatar neutro.
  fotoUrl?: string
  // Anios de experiencia (se muestra como credencial destacada)
  experienciaAnios?: number
  // Areas de especialidad detalladas
  especialidades?: string[]
  // Formacion academica destacada
  formacion?: string[]
  // Logros / hitos profesionales
  logros?: string[]
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
        id: "fin-luciana-blanco",
        nombre: "Luciana Blanco",
        titulo: "Especialista en educación y asesoría financiera",
        descripcion:
          "Máster en Dirección de Empresas con más de 14 años de experiencia enseñando finanzas en entornos empresariales. Coordinadora General de Finanzas y Directora Académica, acompaña a personas y emprendedores a ordenar sus finanzas, gestionar su flujo de caja, salir de deudas y dar sus primeros pasos en inversiones con un método claro y aplicado.",
        temas: ["deudas", "presupuesto", "ahorro", "inversiones", "emprendimiento"],
        modalidades: ["online", "presencial"],
        precioPorSesion: 250000,
        esEjemplo: false,
        disponible: false,
        fotoUrl: "/asesoramiento/luciana-blanco.png",
        experienciaAnios: 14,
        especialidades: [
          "Administración financiera",
          "Gestión de flujo de caja",
          "Educación financiera",
          "Finanzas para emprendedores",
          "Evaluación y formulación de proyectos",
          "Introducción a las inversiones",
          "Análisis financiero",
          "Planificación financiera",
        ],
        formacion: [
          "Máster en Dirección de Empresas — EDAN, Escuela de Administración de Negocios",
          "Diplomado en Fintech — Universidad Nacional de Asunción (2023)",
          "Diplomado en Finanzas — Instituto Técnico Superior Principios de Vida (2023)",
          "Especialista en Didáctica Universitaria — UNIDA",
        ],
        logros: [
          "Diseño e implementación de la malla curricular del Instituto Técnico Superior Principios de Vida.",
          "Capacitación a más de 2.000 estudiantes desde 2014 en finanzas personales, flujo de caja e inversiones.",
          "Programas de educación financiera implementados en más de 30 empresas.",
        ],
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
  return formatMoney(monto)
}
