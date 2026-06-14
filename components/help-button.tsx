"use client"

import { useState } from "react"
import {
  HelpCircle,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  MousePointerClick,
  ListChecks,
  DollarSign,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  Save,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Paso = {
  icon: React.ComponentType<{ className?: string }>
  titulo: string
  detalle: string
}

const PASOS_INGRESO: Paso[] = [
  {
    icon: TrendingUp,
    titulo: "Abrí la pestaña Ingreso",
    detalle: 'Entrá a "Carga de Ingreso y Egreso" y seleccioná la pestaña Ingreso.',
  },
  {
    icon: MousePointerClick,
    titulo: "Elegí el tipo de ingreso",
    detalle: "Tocá la categoría que corresponda (sueldo, venta, extra, etc.).",
  },
  {
    icon: DollarSign,
    titulo: "Escribí el monto",
    detalle: "Ingresá el monto en guaraníes. El teclado numérico aparece solo en el celular.",
  },
  {
    icon: CalendarDays,
    titulo: "Revisá la fecha",
    detalle: "Confirmá la fecha del ingreso y agregá un concepto si querés (opcional).",
  },
  {
    icon: CheckCircle2,
    titulo: "Registrá el ingreso",
    detalle: 'Tocá el botón "Registrar Ingreso" y listo, queda guardado.',
  },
]

const PASOS_EGRESO: Paso[] = [
  {
    icon: TrendingDown,
    titulo: "Abrí la pestaña Egreso",
    detalle: 'Entrá a "Carga de Ingreso y Egreso" y seleccioná la pestaña Egreso.',
  },
  {
    icon: LayoutGrid,
    titulo: "Elegí el tipo de categoría",
    detalle: "Seleccioná una categoría (Vivienda, Supermercado, Salud, etc.).",
  },
  {
    icon: ListChecks,
    titulo: "Elegí la descripción",
    detalle: "Tocá la descripción del gasto. La app te lleva automáticamente al monto.",
  },
  {
    icon: DollarSign,
    titulo: "Escribí el monto",
    detalle: "Ingresá el monto en guaraníes. Revisá la fecha y el concepto (opcional).",
  },
  {
    icon: CheckCircle2,
    titulo: "Registrá el egreso",
    detalle: 'Tocá "Registrar Egreso" para guardar el gasto.',
  },
]

const PASOS_PRESUPUESTO: Paso[] = [
  {
    icon: PiggyBank,
    titulo: "Abrí la pestaña Presupuesto",
    detalle: 'Entrá a "Carga de Ingreso y Egreso" y seleccioná la pestaña Presupuesto.',
  },
  {
    icon: LayoutGrid,
    titulo: "Revisá tus categorías",
    detalle: "Vas a ver tus categorías agrupadas (Vivienda, Personales, Ahorro, etc.).",
  },
  {
    icon: DollarSign,
    titulo: "Asigná un monto a cada una",
    detalle: "Escribí cuánto querés destinar a cada concepto durante el mes.",
  },
  {
    icon: ListChecks,
    titulo: "Controlá lo que falta asignar",
    detalle: "La app te indica cuánto te falta repartir hasta llegar al 100%.",
  },
  {
    icon: Save,
    titulo: "Establecé el presupuesto",
    detalle: 'Tocá "Establecer Presupuesto" para guardarlo y seguirlo durante el mes.',
  },
]

function ListaPasos({ pasos }: { pasos: Paso[] }) {
  return (
    <ol className="space-y-3">
      {pasos.map((paso, index) => {
        const Icon = paso.icon
        return (
          <li
            key={index}
            className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
                <p className="font-semibold text-foreground text-pretty">{paso.titulo}</p>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                {paso.detalle}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function HelpButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          aria-label="Ayuda: cómo usar la app"
          className={cn(
            "fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full shadow-lg",
            className,
          )}
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            ¿Cómo usar la app?
          </DialogTitle>
          <DialogDescription>
            Pasos rápidos para registrar tus movimientos y armar tu presupuesto.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ingreso" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
            <TabsTrigger value="egreso">Egreso</TabsTrigger>
            <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
          </TabsList>
          <TabsContent value="ingreso" className="mt-4">
            <ListaPasos pasos={PASOS_INGRESO} />
          </TabsContent>
          <TabsContent value="egreso" className="mt-4">
            <ListaPasos pasos={PASOS_EGRESO} />
          </TabsContent>
          <TabsContent value="presupuesto" className="mt-4">
            <ListaPasos pasos={PASOS_PRESUPUESTO} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
