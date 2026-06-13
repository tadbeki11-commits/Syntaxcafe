# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Syntax Offline Cafe System** — an offline-first desktop POS application for cafe management. Built with:
- **Frontend/Desktop**: React 19 + TypeScript + Tauri v2 (desktop shell), Vite, Tailwind CSS, Radix UI
- **Local DB** (desktop): PGlite (Postgres in WASM), managed via Drizzle ORM, lives in `app/src/db/`
- **Backend**: NestJS + PostgreSQL + Drizzle ORM, lives in `backend/`
- **Sync**: Event-queue-based sync between local PGlite and remote Postgres

---

## Commands

### Frontend / Desktop App (`app/`)
```bash
cd app
npm run dev          # start Vite dev server (browser)
npm run tauri        # run as Tauri desktop app (requires Rust)
npm run build        # TypeScript check + Vite build
npm run lint         # ESLint
npm run db:generate  # generate Drizzle migration for local PGlite schema
npm run db:studio    # open Drizzle Studio against local DB
```

### Backend (`backend/`)
```bash
cd backend
pnpm start:dev       # run NestJS with ts-node-dev (hot reload)
pnpm build           # compile TypeScript
pnpm db:generate     # generate Drizzle migration for Postgres schema
pnpm db:migrate      # apply Drizzle migrations
pnpm db:studio       # open Drizzle Studio against Postgres
pnpm init-db         # seed initial data (scripts/seed.ts)
pnpm db:import       # import menu from JSON (scripts/importMenu.ts)
pnpm db:populate-recipes  # populate recipe data
```

---

## Architecture

### Two separate databases with mirrored schemas

| Location | DB | Schema path |
|---|---|---|
| `app/` (client) | PGlite (WASM, local) | `app/src/db/schema.ts` and `app/src/infrastructure/database/schema/` |
| `backend/` (server) | PostgreSQL | `backend/src/db/schema.ts` and `backend/src/db/tables/` |

Both use Drizzle ORM with separate `drizzle.config.ts` files and separate migration folders (`app/drizzle/` and `backend/drizzle/`).

### Frontend Clean Architecture (DDD layers in `app/src/`)

```
domain/          → Entities, value objects, repository interfaces (zero framework dependencies)
application/     → Facades and use cases; consumes domain interfaces; one facade per domain area
infrastructure/  → Concrete implementations:
  database/      →   PGlite repositories (implements domain interfaces)
  api/           →   HTTP client + Axios calls to NestJS backend
  sync/          →   SimpleSyncEngine + sync tasks
  printing/      →   Printer config + receipt generation
bootstrap/       → DI container (Container class), TOKENS, registerAllModules, sync startup
presentation/    → (partial; most UI still in pages/ and components/)
pages/           → Role-gated React pages
components/      → Shared UI components
```

**The entry point for all domain operations from UI is `app/src/application/index.ts`** — it exports a single `appServices` object with lazy-resolved facades (`auth`, `orders`, `menu`, `payments`, `inventory`, `tables`, `settings`, etc.). Pages always import from here, never directly from DB or infrastructure.

### DI Container pattern

`bootstrap/container.ts` holds a simple `Container` class with `registerSingleton` / `register` / `resolve`. Facades and repositories are registered via tokens (symbols in `TOKENS`). Resolve with `getContainer().resolve<T>(TOKENS.xxx)`.

Adding a new domain: (1) create domain interface, (2) create facade in `application/`, (3) create PGlite repository in `infrastructure/database/repositories/`, (4) add token to `TOKENS`, (5) register in `bootstrap/register-modules.ts`, (6) expose via `appServices` in `application/index.ts`.

### Backend NestJS structure (`backend/src/`)

Standard NestJS modules under `src/modules/`: `auth`, `users`, `menu`, `order`, `payment`, `inventory`, `stock-locations`, `settings`, `roles`, `recipes`, `sync`, `tables`. Each module has `*.module.ts`, `*.service.ts`, `*.controller.ts`.

DB schema tables live individually in `backend/src/db/tables/<name>.table.ts` and are re-exported via `backend/src/db/schema.ts`. Relations are in `backend/src/db/relations.ts`.

### Sync engine

`app/src/infrastructure/sync/sync-engine.ts` — `SimpleSyncEngine` class, started in `bootstrap/sync.ts`. It tracks online/offline state and runs sync tasks from `sync/tasks/`. Each task knows how to count unsynced local records and push them to the backend. The sync engine uses `notImplemented()` stubs for features not yet migrated (payroll, HR, performance, etc.) — these are safe no-ops.

### Role-based routing

`app/src/App.tsx` splits routes by role: `cafe_waiter` → `/waiter/*`, all others → `/dashboard/*`. `ProtectedRoute` enforces role arrays. Roles: `admin`, `cashier`, `kitchen_staff`, `cafe_waiter`.

### Monetary values

Amounts are stored as **integers in cents** (e.g., `total_amount: integer` = birr, `total_cents: integer` = sub-unit). Both fields typically exist together. Follow this convention for any new monetary columns.

### Printing

`app/src/utils/receiptPrinter.ts` handles 80mm thermal printing. Order receipts: tries server-generated images first, falls back to locally generated HTML split by department/category. Stock transfer receipts: tries native Tauri thermal printing (`tauri-plugin-thermal-printer`) first, falls back to HTML. Department-to-printer mapping lives in `app/src/infrastructure/printing/printer-config.ts`.
