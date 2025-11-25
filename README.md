# Sistema de Gestión Financiera Personal y Empresarial

Sistema integral de gestión financiera desarrollado con Next.js 15, React 19, TypeScript y Supabase, diseñado para proporcionar control total sobre finanzas personales y empresariales con análisis en tiempo real y visualizaciones interactivas.

## Descripción General

Plataforma financiera de última generación que permite gestionar múltiples perfiles (Personal, Empresarial, Terciario) con seguimiento detallado de ingresos, egresos, presupuestos, inventarios, deudas y patrimonio. Incluye sistema de categorías personalizables, análisis predictivo, alertas financieras inteligentes y reportes exportables.

## Características Principales

### Gestión de Perfiles Múltiples
- **Perfiles Personalizados**: Crea y administra perfiles separados para finanzas personales, empresariales o terciarias
- **Código de Colores**: Identificación visual rápida con iconos y colores personalizables por perfil
- **Cambio Dinámico**: Alterna entre perfiles sin perder contexto con sistema de navegación intuitivo

### Dashboard Financiero Inteligente
- **Resumen Ejecutivo**: Vista consolidada de ingresos, egresos y balance del mes actual
- **Indicadores Visuales**: Gráficos tipo donut, barras horizontales y tarjetas de superávit/déficit
- **Comparación Mensual**: Análisis comparativo automático con el mes anterior
- **Tasa de Ahorro**: Cálculo en tiempo real del porcentaje de ahorro mensual
- **Top 5 Categorías**: Identificación instantánea de las categorías con mayor gasto

### Sistema de Categorías Flexible
- **Categorías Personalizables**: Crea tipos de categoría principales con subcategorías ilimitadas
- **Gestión de Ingresos**: Categorías específicas para diferentes tipos de ingresos
- **Gestión de Egresos**: Sistema de dos niveles (tipo y subcategoría) para clasificación detallada
- **Colores Personalizados**: Asigna colores a cada tipo de categoría para identificación visual

### Registro de Transacciones
- **Formularios Intuitivos**: Carga rápida de ingresos y egresos con validación en tiempo real
- **Historial Completo**: Registro detallado de todas las transacciones con búsqueda y filtros
- **Edición y Eliminación**: Capacidad de modificar o eliminar transacciones pasadas
- **Fechas Precisas**: Manejo correcto de zonas horarias para registro exacto de fechas

### Presupuestos y Metas
- **Presupuesto Mensual**: Define metas de ingreso y límites de gasto por categoría
- **Seguimiento Visual**: Barras de progreso que indican el cumplimiento de presupuestos
- **Alertas Automáticas**: Notificaciones cuando te acercas o excedes los límites establecidos
- **Metas Financieras**: Establece y monitorea objetivos de ahorro a corto y largo plazo

### Gestión de Deudas (Personal)
- **Registro Detallado**: Administra todas tus deudas con información completa
- **Seguimiento de Pagos**: Historial de pagos realizados y cuotas pendientes
- **Cálculo de Intereses**: Seguimiento de tasas de interés y montos acumulados
- **Priorización**: Sistema de prioridades para gestión eficiente de pagos

### Cajas de Ahorro (Personal)
- **Múltiples Cajas**: Crea cajas de ahorro para diferentes objetivos
- **Metas y Plazos**: Define montos objetivo y fechas límite
- **Movimientos Detallados**: Registra depósitos y retiros con conceptos
- **Progreso Visual**: Indicadores de avance hacia las metas establecidas

### Gestión de Patrimonio (Personal)
- **Activos y Pasivos**: Registra bienes, inversiones y obligaciones
- **Valuación Actualizada**: Mantén el valor de tus activos al día
- **Categorización**: Organiza tu patrimonio por tipo y categoría
- **Análisis Patrimonial**: Visualiza tu patrimonio neto en tiempo real

### Gestión Empresarial
- **Inventario**: Control completo de productos con stock mínimo y alertas
- **Materias Primas**: Gestión de insumos con proveedores asociados
- **Proveedores**: Base de datos de proveedores con información de contacto
- **Ventas**: Registro detallado de ventas con clientes y productos
- **Compras**: Control de compras de materias primas y costos
- **Reportes**: Análisis de rentabilidad, márgenes y flujo de efectivo empresarial

### Análisis y Reportes
- **Distribución de Gastos**: Gráficos circulares y de barras por categoría
- **Flujo de Caja**: Proyecciones mensuales de ingresos vs egresos
- **Análisis Comparativo**: Comparación de periodos con porcentajes de variación
- **Exportación CSV**: Descarga tu historial completo para análisis externo

### Sistema de Autenticación
- **Registro Seguro**: Creación de cuentas con validación de email
- **Inicio de Sesión**: Autenticación segura con Supabase Auth
- **Recuperación de Contraseña**: Sistema de recuperación vía email
- **Cambio de Contraseña**: Actualización segura desde el panel de configuración

### Alertas y Logros
- **Alertas Financieras**: Notificaciones automáticas sobre presupuestos, deudas y metas
- **Logros Desbloqueables**: Sistema de gamificación para fomentar buenos hábitos financieros
- **Notificaciones Contextuales**: Alertas personalizadas según tu comportamiento financiero

## Stack Tecnológico

### Frontend
- **Next.js 15.2.4**: Framework React con App Router y Server Components
- **React 19.2.0**: Biblioteca para interfaces de usuario con últimas características
- **TypeScript 5**: Tipado estático para mayor seguridad y mantenibilidad
- **Tailwind CSS 3.4**: Framework CSS utility-first con diseño responsive
- **shadcn/ui**: Componentes UI accesibles y personalizables basados en Radix UI

### Backend y Base de Datos
- **Supabase**: Backend-as-a-Service con PostgreSQL
- **Supabase Auth**: Sistema de autenticación completo
- **Row Level Security (RLS)**: Seguridad a nivel de fila para protección de datos
- **Supabase SSR**: Server-Side Rendering con Supabase

### Librerías y Herramientas
- **Recharts 2.15.4**: Gráficos interactivos y visualizaciones de datos
- **React Hook Form 7.60**: Gestión eficiente de formularios con validación
- **Zod 3.25**: Validación y parsing de esquemas TypeScript-first
- **Lucide React**: Iconos SVG modernos y personalizables
- **date-fns 4.1**: Manipulación y formateo de fechas
- **Next Themes**: Gestión de temas claro/oscuro
- **Sonner**: Sistema de notificaciones toast elegante

### Fuentes
- **Geist**: Fuente sans-serif moderna de Vercel
- **Geist Mono**: Fuente monoespaciada para código

## Estructura del Proyecto

\`\`\`
.
├── app/                          # Aplicación Next.js (App Router)
│   ├── auth/                     # Páginas de autenticación
│   │   ├── login/                # Inicio de sesión
│   │   ├── registro/             # Registro de usuarios
│   │   ├── recuperar-contrasena/ # Recuperación de contraseña
│   │   └── actualizar-contrasena/# Actualización de contraseña
│   ├── dashboard/                # Dashboard principal
│   │   ├── personal/             # Módulo de finanzas personales
│   │   │   ├── page.tsx          # Dashboard personal
│   │   │   ├── historial/        # Historial de transacciones
│   │   │   ├── categorias/       # Gestión de categorías
│   │   │   ├── presupuesto/      # Presupuestos mensuales
│   │   │   ├── metas/            # Metas financieras
│   │   │   ├── deudas/           # Gestión de deudas
│   │   │   ├── cajas-ahorro/     # Cajas de ahorro
│   │   │   ├── patrimonio/       # Gestión de patrimonio
│   │   │   ├── analisis/         # Análisis financiero
│   │   │   └── flujo/            # Flujo de caja
│   │   ├── empresarial/          # Módulo empresarial
│   │   │   ├── page.tsx          # Dashboard empresarial
│   │   │   ├── historial/        # Historial de transacciones
│   │   │   ├── inventario/       # Gestión de inventario
│   │   │   ├── materias-primas/  # Gestión de materias primas
│   │   │   ├── proveedores/      # Gestión de proveedores
│   │   │   ├── ventas/           # Registro de ventas
│   │   │   └── reportes/         # Reportes empresariales
│   │   ├── perfiles/             # Gestión de perfiles
│   │   ├── configuracion/        # Configuración de usuario
│   │   └── layout.tsx            # Layout del dashboard
│   ├── globals.css               # Estilos globales
│   └── layout.tsx                # Layout raíz
├── components/                   # Componentes React
│   ├── charts/                   # Componentes de gráficos
│   │   ├── tasa-ahorro-donut.tsx # Gráfico donut de tasa de ahorro
│   │   ├── gastos-categoria-bars.tsx # Barras de gastos por categoría
│   │   ├── superavit-card.tsx    # Tarjeta de superávit/déficit
│   │   ├── distribucion-gastos-chart.tsx # Distribución de gastos
│   │   └── flujo-caja-chart.tsx  # Flujo de caja mensual
│   ├── forms/                    # Formularios
│   │   ├── ingreso-form.tsx      # Formulario de ingresos
│   │   ├── egreso-form.tsx       # Formulario de egresos
│   │   └── presupuesto-form.tsx  # Formulario de presupuesto
│   ├── personal/                 # Componentes del módulo personal
│   │   ├── deudas-manager.tsx    # Gestor de deudas
│   │   ├── cajas-ahorro-manager.tsx # Gestor de cajas de ahorro
│   │   ├── patrimonio-manager.tsx # Gestor de patrimonio
│   │   ├── presupuesto-manager.tsx # Gestor de presupuestos
│   │   ├── alertas-financieras.tsx # Panel de alertas
│   │   └── logros-financieros.tsx # Panel de logros
│   ├── empresarial/              # Componentes del módulo empresarial
│   │   ├── inventario-manager.tsx # Gestor de inventario
│   │   ├── materias-primas-manager.tsx # Gestor de materias primas
│   │   ├── proveedores-manager.tsx # Gestor de proveedores
│   │   ├── ventas-manager.tsx    # Gestor de ventas
│   │   └── reportes-empresariales.tsx # Reportes empresariales
│   ├── ui/                       # Componentes UI (shadcn)
│   ├── dashboard-header.tsx      # Header del dashboard
│   ├── dashboard-nav.tsx         # Navegación del dashboard
│   ├── perfil-selector.tsx       # Selector de perfiles
│   └── perfiles-manager.tsx      # Gestor de perfiles
├── lib/                          # Librerías y utilidades
│   ├── supabase/                 # Configuración de Supabase
│   │   ├── client.ts             # Cliente de Supabase (browser)
│   │   ├── server.ts             # Cliente de Supabase (server)
│   │   └── middleware.ts         # Middleware de Supabase
│   ├── contexts/                 # Contextos de React
│   │   └── perfil-context.tsx    # Contexto del perfil activo
│   └── utils.ts                  # Funciones utilitarias
├── scripts/                      # Scripts SQL de base de datos
│   ├── 001_create_tables.sql     # Creación de tablas principales
│   ├── 002_enable_rls.sql        # Activación de RLS
│   ├── 008_create_perfiles_system_v2.sql # Sistema de perfiles
│   ├── 009_create_business_tables.sql # Tablas empresariales
│   ├── 010_create_personal_finance_system.sql # Sistema personal
│   ├── 011_add_presupuesto_and_patrimonio.sql # Presupuesto y patrimonio
│   └── 018_create_demo_user.sql  # Usuario demo
├── middleware.ts                 # Middleware de Next.js
├── next.config.mjs               # Configuración de Next.js
├── tailwind.config.js            # Configuración de Tailwind
├── tsconfig.json                 # Configuración de TypeScript
└── package.json                  # Dependencias del proyecto
\`\`\`

## Esquema de Base de Datos

### Tablas Principales

#### Autenticación y Usuarios
- **profiles**: Perfiles de usuario con email y nombre completo
- **perfiles**: Perfiles financieros múltiples (Personal, Empresarial, Terciario)

#### Finanzas Personales
- **ingresos**: Registro de ingresos con categorización
- **egresos**: Registro de egresos con sistema de categorías multinivel
- **categorias_ingresos**: Categorías personalizadas de ingresos
- **tipos_categoria_egreso**: Tipos principales de categorías de egreso
- **categorias_egreso**: Subcategorías de egreso vinculadas a tipos
- **presupuesto_mensual**: Metas de ingreso mensuales
- **presupuesto_categorias**: Presupuestos por categoría
- **deudas**: Gestión de deudas con amortización
- **pagos_deuda**: Historial de pagos de deudas
- **cajas_ahorro**: Cajas de ahorro con metas
- **movimientos_caja**: Movimientos de cajas de ahorro
- **patrimonio**: Activos y pasivos
- **alertas_financieras**: Notificaciones del sistema
- **logros_financieros**: Logros desbloqueados

#### Gestión Empresarial
- **inventario**: Productos con stock y precios
- **materias_primas**: Insumos y materias primas
- **proveedores**: Base de datos de proveedores
- **ventas**: Registro de ventas con clientes
- **compras**: Registro de compras de materias primas

### Seguridad
Todas las tablas implementan **Row Level Security (RLS)** con políticas que garantizan:
- Los usuarios solo pueden ver y modificar sus propios datos
- Aislamiento completo entre perfiles de diferentes usuarios
- Protección a nivel de base de datos contra accesos no autorizados

## Instalación y Configuración

### Prerrequisitos
- Node.js 18+ 
- npm, yarn o pnpm
- Cuenta de Supabase (gratuita)

### Paso 1: Clonar el Repositorio
\`\`\`bash
git clone <repository-url>
cd <project-folder>
\`\`\`

### Paso 2: Instalar Dependencias
\`\`\`bash
npm install
# o
yarn install
# o
pnpm install
\`\`\`

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_supabase_service_role_key

# Database Configuration
POSTGRES_URL=tu_postgres_connection_string
POSTGRES_PRISMA_URL=tu_postgres_prisma_url
POSTGRES_URL_NON_POOLING=tu_postgres_non_pooling_url
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_postgres_password
POSTGRES_DATABASE=postgres
POSTGRES_HOST=tu_postgres_host

# Development Redirect (para testing local)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

### Paso 4: Configurar Base de Datos

1. Crea un nuevo proyecto en [Supabase](https://supabase.com)
2. Ve a SQL Editor en tu proyecto de Supabase
3. Ejecuta los scripts SQL en orden desde la carpeta `scripts/`:
   \`\`\`
   001_create_tables.sql
   002_enable_rls.sql
   008_create_perfiles_system_v2.sql
   009_create_business_tables.sql
   010_create_personal_finance_system.sql
   011_add_presupuesto_and_patrimonio.sql
   018_create_demo_user.sql (opcional, para usuario de prueba)
   \`\`\`

### Paso 5: Ejecutar en Desarrollo
\`\`\`bash
npm run dev
# o
yarn dev
# o
pnpm dev
\`\`\`

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

### Paso 6: Construir para Producción
\`\`\`bash
npm run build
npm run start
# o
yarn build
yarn start
# o
pnpm build
pnpm start
\`\`\`

## 👤 Usuario Demo

### 🚨 ATENCIÓN: Configuración Obligatoria Antes de Usar

Las credenciales del usuario demo **NO funcionarán** hasta que completes estos pasos. El usuario debe ser creado primero.

### Credenciales Demo
\`\`\`
Email: demo@gmail.com
Contraseña: demo123
\`\`\`

### Configuración Requerida (Elige UN método)

#### Método 1: Creación Automática con API (Recomendado) ⚡

**Paso 1:** Ejecuta el endpoint de creación

Desde tu terminal o navegador:
\`\`\`bash
# Con curl
curl -X POST https://tu-dominio.vercel.app/api/create-demo-user

# O abre en navegador
https://tu-dominio.vercel.app/api/create-demo-user
\`\`\`

Verás una respuesta JSON confirmando la creación del usuario en Supabase Auth.

**Paso 2:** Ejecuta el script SQL de datos

1. Abre el SQL Editor en tu proyecto Supabase
2. Ejecuta el contenido completo de `scripts/018_create_demo_user.sql`
3. Este script agrega:
   - Perfil Personal
   - Categorías de ingresos y egresos
   - 50+ transacciones de ejemplo (últimos 3 meses)
   - Presupuesto mensual (Gs 3.758.000)
   - Deudas de ejemplo
   - Cajas de ahorro
   - Patrimonio neto
   - Alertas y logros

**Paso 3:** ¡Listo! Inicia sesión con demo@gmail.com / demo123

#### Método 2: Creación Manual 📝

**Paso 1:** Regístrate manualmente

1. Ve a `/auth/registro`
2. Usa las credenciales:
   - Email: demo@gmail.com
   - Contraseña: demo123
3. Verifica tu email (revisa tu bandeja de entrada)

**Paso 2:** Ejecuta el script SQL

1. Abre el SQL Editor en Supabase
2. Ejecuta `scripts/018_create_demo_user.sql`

**Paso 3:** Inicia sesión

Ahora puedes iniciar sesión con las credenciales.

### ⚠️ Solución de Problemas

**Error: "Invalid login credentials"**
- Causa: El usuario NO ha sido creado en Supabase Auth
- Solución: Sigue el Método 1 o Método 2 arriba

**Error al ejecutar el script SQL**
- Causa: El usuario demo aún no existe en auth.users
- Solución: Completa primero el Paso 1 de cualquier método

**El endpoint /api/create-demo-user no funciona**
- Causa: Falta la variable `SUPABASE_SERVICE_ROLE_KEY`
- Solución: Agrega esta variable en tu dashboard de Vercel/Supabase

### 📊 Contenido de la Cuenta Demo

Una vez configurada, la cuenta incluye:
- ✅ Perfil Personal configurado
- ✅ Categorías predefinidas completas
- ✅ 50+ transacciones de ejemplo (últimos 3 meses)
- ✅ Presupuesto mensual: Gs 3.758.000
- ✅ Distribución por categorías:
  - Gastos Vivienda: 30%
  - Pago Deudas: 20%
  - Gastos Varios: 20%
  - Disfrute: 20%
  - Ahorro 2025: 10%
- ✅ 3 Deudas activas en seguimiento
- ✅ 3 Cajas de ahorro con metas
- ✅ Patrimonio neto registrado
- ✅ Alertas financieras configuradas
- ✅ Logros desbloqueados

## Roadmap y Mejoras Futuras

### Funcionalidades Planeadas

#### Análisis Avanzado
- **Análisis Predictivo con IA**: Predicciones de gastos futuros basadas en patrones históricos
- **Detección de Anomalías**: Alertas automáticas sobre gastos inusuales o fuera de patrón
- **Recomendaciones Inteligentes**: Sugerencias personalizadas para optimizar finanzas
- **Análisis de Tendencias**: Visualización de tendencias a largo plazo (anual, trimestral)

#### Integraciones Bancarias
- **Open Banking**: Sincronización automática con cuentas bancarias
- **Importación de Transacciones**: Lectura automática de extractos bancarios (PDF/CSV)
- **Conciliación Bancaria**: Comparación automática de registros vs movimientos reales
- **Multi-moneda**: Soporte para múltiples monedas con conversión automática

#### Automatización
- **Transacciones Recurrentes**: Registro automático de ingresos/egresos fijos
- **Pagos Programados**: Recordatorios y ejecución de pagos automáticos
- **Reglas de Categorización**: Auto-clasificación de transacciones según patrones
- **Alertas Proactivas**: Notificaciones push y email personalizables

#### Colaboración
- **Perfiles Compartidos**: Gestión financiera familiar o con socios
- **Múltiples Usuarios**: Roles y permisos diferenciados (admin, visualizador, editor)
- **Comentarios**: Anotaciones colaborativas en transacciones
- **Aprobaciones**: Flujo de aprobación para gastos importantes

#### Reportes Avanzados
- **Reportes Personalizados**: Constructor de reportes con filtros avanzados
- **Exportación Mejorada**: PDF, Excel, Google Sheets con formato profesional
- **Dashboards Personalizables**: Widgets arrastrables y configurables
- **Comparativas Multi-periodo**: Análisis comparativo de múltiples períodos

#### Inversiones y Patrimonio
- **Tracking de Inversiones**: Seguimiento de acciones, bonos, criptomonedas
- **Cálculo de ROI**: Retorno sobre inversión automatizado
- **Rebalanceo de Portfolio**: Sugerencias de rebalanceo de cartera
- **Valuación Automática**: Actualización de valores de mercado en tiempo real

#### Gamificación
- **Sistema de Logros Ampliado**: Más de 50 logros desbloqueables
- **Rankings**: Comparación anónima con otros usuarios (opcional)
- **Desafíos Mensuales**: Retos de ahorro y reducción de gastos
- **Niveles de Usuario**: Progresión basada en buenos hábitos financieros

#### Educación Financiera
- **Tutoriales Interactivos**: Guías paso a paso para cada funcionalidad
- **Biblioteca de Recursos**: Artículos y videos sobre educación financiera
- **Calculadoras Financieras**: Intereses, amortizaciones, jubilación, etc.
- **Glosario Financiero**: Términos y conceptos explicados de forma simple

#### Mobile
- **Aplicación Móvil Nativa**: Apps iOS y Android con React Native
- **Modo Offline**: Registro de transacciones sin conexión
- **Widgets**: Widgets de home screen para acceso rápido
- **Escaneo de Recibos**: OCR para captura automática de gastos

### Mejoras Técnicas

#### Performance
- **Optimización de Queries**: Índices y vistas materializadas en PostgreSQL
- **Caching Avanzado**: Redis para datos frecuentemente consultados
- **Lazy Loading**: Carga diferida de componentes pesados
- **Web Workers**: Procesamiento de cálculos complejos en background

#### Seguridad
- **2FA (Autenticación de Dos Factores)**: Capa adicional de seguridad
- **Auditoría Completa**: Log de todas las acciones sensibles
- **Cifrado de Datos Sensibles**: Encriptación E2E de información crítica
- **Rate Limiting**: Protección contra ataques de fuerza bruta

#### UX/UI
- **Temas Personalizables**: Más opciones de colores y estilos
- **Accesibilidad Mejorada**: Cumplimiento WCAG 2.1 AAA
- **Internacionalización**: Soporte para múltiples idiomas
- **Modo Compacto**: Vista densa para usuarios avanzados

#### DevOps
- **Tests Automatizados**: Cobertura completa con Jest y Playwright
- **CI/CD**: Pipeline de integración y deployment continuo
- **Monitoreo**: Sentry, LogRocket para tracking de errores
- **A/B Testing**: Experimentación de nuevas features

### Contribuciones

Si deseas contribuir al desarrollo de alguna de estas funcionalidades, por favor:
1. Revisa el roadmap actualizado
2. Crea un issue describiendo tu propuesta
3. Espera feedback antes de implementar
4. Sigue las guías de estilo del proyecto
5. Incluye tests para tu código

## Características de Diseño

### Sistema de Colores
- Paleta moderna con degradados sutiles
- Colores semánticos: verde (ingresos/positivo), rojo (egresos/negativo)
- Soporte para modo claro y oscuro
- Colores personalizables por perfil y categoría

### Tipografía
- Geist Sans: Fuente principal para interfaz
- Geist Mono: Fuente monoespaciada para datos numéricos
- Jerarquía clara con tamaños y pesos variables
- Línea de altura optimizada para legibilidad

### Componentes UI
- Componentes accesibles siguiendo WCAG 2.1
- Animaciones sutiles y transiciones fluidas
- Responsive design móvil-first
- Feedback visual inmediato en todas las acciones

### Visualizaciones
- Gráficos donut (anillo) para porcentajes
- Barras horizontales para comparaciones
- Tarjetas de resumen con indicadores de tendencia
- Colores graduales según rendimiento

## API y Rutas

### Rutas de Autenticación
- `POST /auth/callback` - Callback de Supabase Auth
- `GET /auth-handler` - Manejador de estado de autenticación

### Rutas del Dashboard
- `/dashboard` - Selector de perfil inicial
- `/dashboard/personal` - Dashboard de finanzas personales
- `/dashboard/empresarial` - Dashboard empresarial
- `/dashboard/perfiles` - Gestión de perfiles
- `/dashboard/configuracion` - Configuración de usuario

### Estructura de Server Components

El sistema utiliza React Server Components para:
- Fetch de datos desde servidor (sin estado en cliente)
- Consultas SQL directas desde componentes
- Renderizado optimizado con streaming
- Separación clara entre lógica de servidor y cliente

## Seguridad

### Autenticación
- JWT tokens gestionados por Supabase Auth
- Sesiones persistentes con cookies HTTP-only
- Refresh automático de tokens
- Protección CSRF integrada

### Autorización
- Row Level Security (RLS) en todas las tablas
- Políticas a nivel de base de datos
- Middleware de Next.js para protección de rutas
- Validación de permisos en cada request

### Datos Sensibles
- Passwords hasheados con bcrypt
- Variables de entorno para secretos
- Sin exposición de claves en cliente
- HTTPS obligatorio en producción

### Validación
- Validación de formularios con Zod
- Sanitización de inputs
- Prevención de SQL injection (queries parametrizadas)
- Validación server-side obligatoria

## Performance

### Optimizaciones Implementadas
- Server-Side Rendering (SSR) para páginas críticas
- Lazy loading de componentes pesados
- Imágenes optimizadas con Next.js Image
- Debouncing en búsquedas y filtros
- Memoización de cálculos complejos
- Paginación en listados largos

### Caching
- Revalidación automática de datos
- Cache de consultas frecuentes
- Static Generation donde es posible
- Estrategia de Stale-While-Revalidate

## Testing y Demo

### Cuenta de Prueba
El usuario demo (`demo@gmail.com` / `demo123`) permite:
- Explorar todas las funcionalidades
- Ver datos realistas precargados
- Probar flujos completos sin comprometer datos reales
- Evaluar la UX sin configuración inicial

### Datos de Prueba
El usuario demo incluye:
- 50+ transacciones de ejemplo
- 5 categorías de ingreso configuradas
- 10 categorías de egreso con subcategorías
- Presupuesto mensual establecido
- 3 metas financieras activas
- 2 deudas en seguimiento
- 3 cajas de ahorro con objetivos

## Deployment

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Deploy automático en cada push

### Docker
\`\`\`bash
docker build -t finance-app .
docker run -p 3000:3000 finance-app
\`\`\`

### Variables de Entorno en Producción
Asegúrate de configurar todas las variables en tu plataforma de deployment:
- Variables de Supabase
- Strings de conexión de PostgreSQL
- Claves de servicio

## Mantenimiento

### Backups
- Configura backups automáticos en Supabase
- Exporta datos periódicamente en CSV
- Mantén copias de los scripts SQL

### Actualizaciones
- Revisa dependencias con `npm outdated`
- Actualiza packages regularmente
- Prueba en ambiente de staging antes de producción

### Monitoreo
- Revisa logs de Supabase periódicamente
- Monitorea uso de base de datos
- Configura alertas de errores

## Soporte y Contribuciones

### Reporte de Bugs
Si encuentras un bug, por favor incluye:
- Descripción detallada del problema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Screenshots si es aplicable
- Información del navegador/sistema

### Mejoras Sugeridas
Las sugerencias de mejora son bienvenidas. Considera:
- Casos de uso específicos
- Impacto en usuarios existentes
- Complejidad de implementación

## Licencia

Este proyecto es de código propietario. Todos los derechos reservados.

## Contacto

Para consultas o más información sobre el proyecto, por favor contacta al desarrollador.

---

**Desarrollado con Next.js 15, React 19, TypeScript y Supabase**
