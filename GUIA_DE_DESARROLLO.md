# Guía de Desarrollo - Workflow Manager (NestJS + tRPC + Next.js)

## Objetivo
Construir una aplicación fullstack para crear y gestionar workflows de alertas con **seguridad de tipos end-to-end**.

**Stack oficial:**
- Backend: **NestJS 10+** + **Fastify**
- API: **tRPC v11** con **nestjs-trpc**
- Frontend: **Next.js 15+ App Router**
- Base de datos: **PostgreSQL**
- ORM: **Prisma**
- Monorepo: **Turborepo + pnpm**

---

## 1. Inicialización del monorepo (5 minutos)

```bash
mkdir workflow-manager && cd workflow-manager
pnpm dlx create-turbo@latest . --example basic

Borra las carpetas de ejemplo y deja esta estructura:

workflow-manager/
├── apps/
│   ├── backend/          # NestJS + tRPC
│   └── frontend/         # Next.js 15 App Router
├── packages/
│   ├── prisma/           # Schema + client compartido
│   └── shared/           # Tipos y utilidades comunes (opcional)
├── docker-compose.yml
├── turbo.json
├── package.json
└── GUIA_DE_DESARROLLO.md



2. Configuración base (orden recomendado)

Docker Postgres
Crea docker-compose.yml (te lo doy más abajo si querés).

Instalar dependencias (te paso el package.json root y de cada app).
Prisma en packages/prisma
schema.prisma con modelos: Workflow, Event, EventHistory, Comment, Snooze, etc.
prisma generate y prisma db seed

Backend (apps/backend)
Configurar nestjs-trpc con @Router(), @Query(), @Mutation().
Crear módulo principal TrpcModule.

Frontend (apps/frontend)
Crear trpc client con createTRPCNext + App Router.
Usar Server Components + tRPC hooks.



3. Estructura recomendada (Feature Folder Based)
SÍ, estoy 100% de acuerdo con feature folders.
Es la mejor opción para este proyecto porque:

Separa responsabilidades por dominio (no por capa técnica).
Facilita la escalabilidad y el mantenimiento.
Permite crear módulos totalmente independientes fácilmente.

Estructura del Backend (apps/backend/src/)

src/
├── features/
│   ├── workflows/          # Crear, editar, activar/desactivar workflows
│   ├── events/             # Disparos, historial, resolver, snooze
│   ├── notifications/      # Canal in-app + email
│   ├── history/            # Historial paginado y filtrado
│   └── daily-summary/      # Tarea cron (extra)
├── trpc/
│   ├── routers/            # routers públicos (app.router.ts)
│   └── context.ts
├── common/                 # filtros, guards, interceptors, exceptions
├── database/               # repositorios Prisma (opcional)
├── modules/                # ← AQUÍ van los módulos independientes
│   └── external-apis/      # Ej: ResendEmailModule, ExternalAlertModule, etc.
├── config/
├── utils/
└── main.ts

Ventajas de esta estructura:

Cada feature es un módulo NestJS completo (@Module()).
Puede exportar su propio tRPC router.
Fácil de mover a otro proyecto.

Estructura del Frontend (apps/frontend/src/)

src/
├── app/
│   ├── (dashboard)/
│   │   ├── workflows/
│   │   ├── events/
│   │   └── history/
│   ├── api/                # trpc client (generado automáticamente)
│   └── globals.css
├── features/
│   ├── workflows/          # page.tsx + components + hooks
│   ├── events/
│   ├── history/
│   └── notifications/
├── components/             # UI compartida (shadcn)
├── lib/
│   └── trpc.ts
└── types/

4. Módulos totalmente independientes (para APIs externas)
Sí, excelente idea.
Crea la carpeta apps/backend/src/modules/ y dentro haces módulos NestJS puros que no dependan de tRPC.
Ejemplo futuro:
modules/
└── resend/
    ├── resend.module.ts
    ├── resend.service.ts
    ├── resend.types.ts
    └── dto/

    Este módulo:

Solo depende de @nestjs/common y resend (o axios).
Se puede exportar como paquete (packages/resend-client) si querés reutilizarlo en otro proyecto.
Se inyecta fácilmente en cualquier feature (NotificationsService).

Ventaja: Si mañana necesitás conectar con Slack, Twilio, Prometheus, etc., solo creás un nuevo módulo en modules/ y lo usás donde quieras.


5. Flujo de desarrollo recomendado (paso a paso diario)

Día 1 → Monorepo + Prisma + Docker + seed
Día 2 → Backend: tRPC routers básicos (workflows y events)
Día 3 → Frontend: páginas de workflows + formulario con Zod
Día 4 → Lógica de disparo + historial + deduplicación de eventos abiertos
Día 5 → Funcionalidades extra (snooze + comentarios)
Día 6 → Resumen diario (cron) + notificaciones
Día 7 → Pulido, tests de tRPC y documentación

Querés que te genere ahora mismo las siguientes piezas concretas?
Dime qué querés primero (puedo ir entregando de a una):

A) docker-compose.yml completo
B) package.json root + apps/backend y frontend
C) schema.prisma completo con todos los modelos
D) Ejemplo de un Feature Folder (workflows/ completo con router + service)
E) Estructura exacta de TrpcModule con nestjs-trpc