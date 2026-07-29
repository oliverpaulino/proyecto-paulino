# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server with Turbopack on localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test suite is configured yet.

## Architecture

This is a **Next.js 15 App Router** project with a **Hono** backend API, **Better Auth** for authentication, and **Kysely** for type-safe PostgreSQL queries.

### Request flow

All API traffic hits `src/app/api/[...route]/route.ts`, which delegates every HTTP method to the Hono app defined in `src/backend/app.ts`. The Hono app is mounted at `/api` and handles:
- General routes (e.g. `GET /api/hello`)
- Auth routes via `auth.handler` at `/api/auth/**`

### Auth

`src/lib/auth.ts` — server-side Better Auth instance with plugins: `organization`, `jwt`, `admin`. Connects directly to Postgres via `pg.Pool` using `DB_CONNECTION_STRING`.

`src/lib/auth-client.ts` — client-side `createAuthClient` for use in React components. Exports `signIn`, `signUp`, `useSession`.

`src/lib/permission.ts` — RBAC access control via `better-auth/plugins/access`. Defines resources (`project`, `product`, `category`, `service`, `client`, `supplier`) and roles (`member`, `admin`, `owner`).

### Database

`src/backend/database.ts` — single `Kysely<DB>` instance. The `DB` interface defines the schema: `categories`, `product`, `product_variants`, `stock_levels`. All tables include `organization_id` for multi-tenancy. Requires `DB_CONNECTION_STRING` env var.

### UI

Components use **shadcn/ui** (`src/components/ui/`) with **Tailwind CSS v4**. The `components.json` file configures shadcn (path aliases, style, etc.). Add new shadcn components with `npx shadcn@latest add <component>`.

The dashboard layout (`src/app/dashboard/page.tsx`) uses `SidebarProvider` + `AppSidebar` + `SidebarInset` pattern from shadcn's sidebar primitive.

### Path aliases

`@/` maps to `src/` (configured in `tsconfig.json`).

### Nómina e ISR (República Dominicana)

`src/backend/modules/nomina/` calcula la nómina de choferes: se les paga por
producción (conduces × la tarifa del empleado) con un mínimo garantizado por
período.

**Antes de tocar cualquier cálculo de ISR, retención, impuesto, AFP, SFS o base
imponible, lee el skill `nomina-isr-rd`** (`.claude/skills/nomina-isr-rd/`).
Las cifras fiscales caducan por año: la escala del ISR de 2027 (Ley 30-26) ya
está legislada y tiene cinco tramos en vez de cuatro. El skill dice qué
verificar en dgii.gov.do y por qué la escala debe vivir en datos, no
hardcodeada.

Dos cosas que no son obvias del código:
- `conduce.subtotal` es lo que se le **factura al cliente**, no lo que se le
  paga al chofer. El pago sale de `empleado_categoria_tarifa.monto_pago`.
- El empleado de un conduce se resuelve en tres niveles:
  `conduce.empleado_id` → `operador.empleado_id` → inferido por
  `equipo.operador_id` (este último es una suposición y se marca como tal).
