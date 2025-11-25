# FinanzasPro - Sistema de Gestión Financiera

Sistema integral de gestión financiera desarrollado con tecnologías modernas, diseñado para proporcionar control total sobre finanzas personales y empresariales con análisis en tiempo real y visualizaciones interactivas.

## Descripción

Plataforma financiera completa que permite gestionar múltiples perfiles (Personal, Empresarial, Terciario) con seguimiento detallado de ingresos, egresos, presupuestos, inventarios, deudas y patrimonio. Incluye sistema de categorías personalizables, análisis predictivo, alertas financieras inteligentes y reportes exportables.

## Características Principales

### Gestión de Perfiles Múltiples
- Perfiles personalizados para finanzas personales, empresariales o terciarias
- Código de colores para identificación visual rápida
- Cambio dinámico entre perfiles sin perder contexto

### Dashboard Financiero
- Resumen ejecutivo con vista consolidada de ingresos, egresos y balance
- Indicadores visuales con gráficos interactivos
- Comparación mensual automática
- Tasa de ahorro en tiempo real
- Top 5 categorías con mayor gasto

### Sistema de Categorías
- Categorías personalizables con subcategorías ilimitadas
- Sistema de dos niveles para clasificación detallada
- Colores personalizados para identificación visual

### Registro de Transacciones
- Formularios intuitivos con validación en tiempo real
- Historial completo con búsqueda y filtros avanzados
- Edición y eliminación de transacciones pasadas
- Manejo preciso de fechas y zonas horarias

### Presupuestos y Metas
- Presupuesto mensual por categoría
- Seguimiento visual con barras de progreso
- Alertas automáticas de límites
- Metas financieras a corto y largo plazo

### Gestión de Deudas
- Registro detallado de deudas
- Seguimiento de pagos y cuotas pendientes
- Cálculo automático de intereses
- Sistema de priorización

### Cajas de Ahorro
- Múltiples cajas para diferentes objetivos
- Definición de metas y plazos
- Registro de movimientos con conceptos
- Indicadores de progreso

### Gestión de Patrimonio
- Registro de activos y pasivos
- Valuación actualizada
- Categorización por tipo
- Análisis de patrimonio neto

### Gestión Empresarial
- Control de inventario con alertas de stock mínimo
- Gestión de materias primas y proveedores
- Registro de ventas y compras
- Reportes de rentabilidad y márgenes

### Análisis y Reportes
- Gráficos de distribución de gastos
- Proyecciones de flujo de caja
- Análisis comparativo de períodos
- Exportación CSV para análisis externo

## Stack Tecnológico

### Frontend
- **Next.js 15.2.4** - Framework React con App Router
- **React 19.2.0** - Biblioteca para interfaces de usuario
- **TypeScript 5** - Tipado estático
- **Tailwind CSS 3.4** - Framework CSS utility-first
- **shadcn/ui** - Componentes UI accesibles

### Backend y Base de Datos
- **PostgreSQL** - Base de datos relacional
- **Row Level Security (RLS)** - Seguridad a nivel de fila

### Librerías
- **Recharts 2.15.4** - Visualizaciones de datos
- **React Hook Form 7.60** - Gestión de formularios
- **Zod 3.25** - Validación de esquemas
- **Lucide React** - Iconos SVG
- **date-fns 4.1** - Manipulación de fechas

## Estructura del Proyecto

\`\`\`
.
├── app/                          # Aplicación Next.js
│   ├── auth/                     # Autenticación
│   ├── dashboard/                # Dashboard principal
│   │   ├── personal/             # Finanzas personales
│   │   ├── empresarial/          # Gestión empresarial
│   │   ├── perfiles/             # Gestión de perfiles
│   │   └── configuracion/        # Configuración
│   └── layout.tsx                # Layout raíz
├── components/                   # Componentes React
│   ├── charts/                   # Gráficos
│   ├── forms/                    # Formularios
│   ├── personal/                 # Componentes personales
│   ├── empresarial/              # Componentes empresariales
│   └── ui/                       # Componentes UI
├── lib/                          # Utilidades
│   ├── supabase/                 # Configuración de base de datos
│   ├── contexts/                 # Contextos de React
│   └── utils.ts                  # Funciones utilitarias
├── scripts/                      # Scripts SQL
└── middleware.ts                 # Middleware de Next.js
\`\`\`

## Esquema de Base de Datos

### Tablas Principales

**Autenticación y Usuarios**
- profiles - Perfiles de usuario
- perfiles - Perfiles financieros múltiples

**Finanzas Personales**
- ingresos - Registro de ingresos
- egresos - Registro de egresos
- categorias_ingresos - Categorías de ingresos
- tipos_categoria_egreso - Tipos de categorías de egreso
- categorias_egreso - Subcategorías de egreso
- presupuesto_mensual - Presupuestos mensuales
- presupuesto_categorias - Presupuestos por categoría
- deudas - Gestión de deudas
- pagos_deuda - Historial de pagos
- cajas_ahorro - Cajas de ahorro
- movimientos_caja - Movimientos de cajas
- patrimonio - Activos y pasivos
- alertas_financieras - Notificaciones
- logros_financieros - Logros desbloqueados

**Gestión Empresarial**
- inventario - Productos
- materias_primas - Insumos
- proveedores - Base de datos de proveedores
- ventas - Registro de ventas
- compras - Registro de compras

### Seguridad
Todas las tablas implementan Row Level Security (RLS) con políticas que garantizan aislamiento completo entre usuarios y protección a nivel de base de datos.

## Instalación

### Prerrequisitos
- Node.js 18+
- npm, yarn o pnpm
- PostgreSQL (local o remoto)

### Pasos

1. **Clonar el repositorio**
\`\`\`bash
git clone <repository-url>
cd finanzas-pro
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar variables de entorno**

Crear archivo `.env.local`:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key
POSTGRES_URL=tu_postgres_url
\`\`\`

4. **Configurar base de datos**

Ejecutar scripts SQL en orden desde la carpeta `scripts/`:
\`\`\`
001_create_tables.sql
002_enable_rls.sql
008_create_perfiles_system_v2.sql
009_create_business_tables.sql
010_create_personal_finance_system.sql
011_add_presupuesto_and_patrimonio.sql
\`\`\`

5. **Ejecutar en desarrollo**
\`\`\`bash
npm run dev
\`\`\`

6. **Acceder a la aplicación**
\`\`\`
http://localhost:3000
\`\`\`

## Usuario de Prueba

### Credenciales Demo
\`\`\`
Email: trauthdemo@gmail.com
Contraseña: demo123
\`\`\`

### Contenido Incluido
- Perfil Personal configurado
- Categorías predefinidas completas
- 50+ transacciones de ejemplo (últimos 3 meses)
- Presupuesto mensual: Gs 3.758.000
- Distribución por categorías configurada
- 3 Deudas activas en seguimiento
- 3 Cajas de ahorro con metas
- Patrimonio neto registrado
- Alertas financieras configuradas

## Características de Diseño

### Sistema de Colores
- Paleta moderna con degradados sutiles
- Colores semánticos para feedback visual
- Soporte para modo claro y oscuro
- Colores personalizables por perfil

### Tipografía
- Jerarquía clara con tamaños variables
- Línea de altura optimizada para legibilidad
- Fuentes modernas sans-serif

### Componentes UI
- Accesibles siguiendo WCAG 2.1
- Animaciones sutiles y transiciones fluidas
- Responsive design móvil-first
- Feedback visual inmediato

## Seguridad

### Autenticación
- JWT tokens gestionados por sistema de auth
- Sesiones persistentes con cookies HTTP-only
- Refresh automático de tokens
- Protección CSRF integrada

### Autorización
- Row Level Security (RLS) en todas las tablas
- Políticas a nivel de base de datos
- Middleware para protección de rutas
- Validación de permisos en cada request

### Validación
- Validación de formularios con Zod
- Sanitización de inputs
- Prevención de SQL injection
- Validación server-side obligatoria

## Performance

### Optimizaciones
- Server-Side Rendering (SSR)
- Lazy loading de componentes
- Imágenes optimizadas
- Debouncing en búsquedas
- Memoización de cálculos
- Paginación en listados

### Caching
- Revalidación automática de datos
- Cache de consultas frecuentes
- Estrategia Stale-While-Revalidate

## Deployment

### Build para Producción
\`\`\`bash
npm run build
npm run start
\`\`\`

### Variables de Entorno
Configurar en plataforma de deployment:
- Variables de autenticación
- Strings de conexión PostgreSQL
- Claves de servicio

## Roadmap

### Próximas Funcionalidades
- Análisis predictivo con IA
- Integración bancaria (Open Banking)
- Transacciones recurrentes automáticas
- Reportes personalizados avanzados
- Aplicación móvil nativa
- Modo offline
- Multi-moneda con conversión automática
- Sistema de logros ampliado

## Licencia

Este proyecto es de código propietario. Todos los derechos reservados.

## Contacto

Para consultas sobre el proyecto, contacta al desarrollador.

---

**Sistema desarrollado con Next.js, React, TypeScript y PostgreSQL**
