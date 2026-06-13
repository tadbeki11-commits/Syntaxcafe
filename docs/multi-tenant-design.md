# Multi-Business / Multi-Branch Design

Status: **In progress** · Last updated: 2026-06-12
Progress: Phase 1 (schema), Phase 2 (tenant context + scoping), Phase 3 (sync partitioning + device tokens) — **done**. Next: Phase 4 (web admin).

## Goal

Evolve the Syntax Offline Cafe System from a single-cafe POS into a platform where
**one owner can run multiple cafes**, where some cafes are **branches of each other**,
and where owners manage everything through a **web admin app** — all sitting under a
**platform super admin (you)** who onboards businesses and oversees every branch.

Decisions driving this design (confirmed with the product owner):

- **Each branch is a fully independent POS** — its own menu, recipes, inventory, stock
  locations, orders, tables, and payment methods. No shared/master menu inheritance.
- **The web admin does everything the current desktop admin does**, plus cross-branch
  reporting/monitoring, menu & price management, staff & access management, and
  inventory/stock control — across all branches.
- **Tenancy model: shared database with row-level scoping** (`business_id` + `branch_id`
  columns), one Postgres backend for all businesses.

---

## 1. Starting point (current architecture)

- Each cafe runs a **Tauri desktop app** with a **local SQLite DB**, syncing to a single
  **NestJS + Postgres** backend.
- **There is no tenant scoping today.** `users`, `orders`, `menu_items`,
  `stock_locations`, etc. are flat tables that assume exactly one cafe.
- The name **`organizations` is already taken**: in the current schema it means a
  *B2B credit customer* (corporate account with `credit_balance`, charged via
  `org_credit_transactions` / `org_credit_payments`). It is **not** a tenant concept and
  must not be repurposed.
- **The sync engine is a single global firehose.** `GET /sync/changes?since=<cursor>`
  returns *every* event from one global `sync_events` table
  (`backend/src/modules/sync/sync.service.ts`). With multiple branches, every desktop
  would download every other cafe's data. **Partitioning this stream is the core of the
  project** — not the schema columns.

---

## 2. Domain model

A three-tier hierarchy, with new entities named to avoid colliding with `organizations`:

```
Platform  (you — the super admin; not a DB table, a global role)
  └── Business  (an owner / company that signs up)
        └── Branch  (one physical cafe = one desktop install + one local SQLite DB)
              └── parent_branch_id (optional) → models "branches of each other"
```

- **Platform / super admin** = you. Sits above all businesses. Creates businesses,
  provisions their initial owner account, enables/suspends them, sets plans/limits, and
  can view and manage **every** branch and its details across the whole platform. There is
  no `business_id` scoping on the super admin — it sees everything. (See §4 and §7a.)
- **Business** = an owner/company. Owns its branches and staff, manages billing, and is the
  umbrella for that owner's cross-branch reporting. A business **creates its own
  branches** (within any limit the platform sets on its plan).
- **Branch** = the real tenant boundary for *operational* data. Each branch is a fully
  independent POS.
- **`parent_branch_id`** on `branches` models "a cafe that is a branch of another cafe,"
  while `business_id` keeps them all under one owner.

So **`business_id` is the ownership/reporting axis** and **`branch_id` is the
data-isolation axis**. Almost every operational table carries **both**. The platform tier
is *unscoped* by design — it is the only role allowed to cross `business_id` boundaries.

---

## 3. Backend schema changes (shared DB, row-level)

### New tables

- `businesses` — `id, name, owner_user_id, plan, is_active, meta, timestamps`
- `branches` — `id, business_id, parent_branch_id, name, slug, timezone, currency,
  address, is_active, meta, timestamps`
- `branch_devices` — `id, business_id, branch_id, device_name, token_hash, last_seen_at,
  revoked` (enrollment + sync auth, see §6)
- `user_branches` — `user_id, branch_id, role` (which staff work at which branch; an
  owner row has business scope and no branch)

### Add `business_id` + `branch_id` to every operational table

`orders`, `order_items`, `payments`, `menu_items`, `categories`, `main_categories`,
`recipes`, `recipe_ingredients`, `inventory_items`, `inventory_stock`, `stock_locations`,
`stock_movements`, `stock_transfers`, `stock_transfer_items`, `dining_tables`,
`payment_methods`, `system_settings`, `organizations` (credit customers belong to a
business), `order_status_logs`. `users` gets `business_id` (assignment via
`user_branches`).

### Uniqueness constraints that currently assume one cafe

- `stock_locations.slug` is globally unique today → change to `unique(branch_id, slug)`.
- `users.username` → `unique(business_id, username)` (two businesses can both have an
  "admin").
- `roles.name` global unique → keep system roles global, OR scope custom roles per
  business.
- Per-cafe defaults (`is_default` stock location, default payment methods) become
  per-branch.

### Indexing

Composite indexes lead with `branch_id` (e.g. `orders(branch_id, created_at)`), since
virtually every query filters by branch.

---

## 4. Auth & access control

JWT payload grows to carry tenant context:

```json
{ "sub": "...", "username": "...", "role": "...",
  "business_id": "...?", "branch_id": "...?", "scope": "platform | owner | branch" }
```

- **Super admin** → `scope: "platform"`, **no `business_id`**. Bypasses tenant filtering
  and may act on any business/branch. Highest privilege — see hardening notes below.
- **Owner / business_admin** → `scope: "owner"`, no fixed branch, may act on any branch
  in their own business.
- **Branch staff** (cashier, kitchen, waiter) → pinned to `branch_id`.
- A **NestJS guard/interceptor** reads `scope`/`business_id`/`branch_id` from the token
  into a request-scoped **`TenantContext`**; every service query filters by it. For
  `scope: "platform"` the filter is bypassed (or set from an explicit `?businessId=` /
  `?branchId=` the super admin chooses to inspect). Centralize this so individual services
  cannot forget to scope — it is the security boundary in a shared DB.

Roles become three tiers:

- **Platform role**: `super_admin` (you)
- **Owner roles**: `owner`, `business_admin`
- **Branch roles** (existing): `admin`, `cashier`, `kitchen_staff`, `cafe_waiter`

**Super-admin hardening** (because it can see all data): separate strong auth (ideally
MFA), no PIN login, audit-log every cross-business action, and keep the count of
super-admin accounts minimal. Consider a distinct sign-in path from owner/staff login.

---

## 5. Sync redesign (critical)

Partition the firehose by branch:

1. Add **`branch_id`** (and `business_id`) to `sync_events`.
2. `getChanges` filters to the caller's branch **plus business-broadcast events**:

   ```sql
   WHERE id > :cursor
     AND ( branch_id = :branchId
        OR (business_id = :businessId AND branch_id IS NULL) )
   ```

   The `branch_id IS NULL` channel delivers owner-level changes (config, staff) to all
   devices in a business. Most owner edits will target a specific branch and carry that
   `branch_id`.
3. `ingestEvents` **stamps `branch_id`/`business_id` from the device token** — never
   trust the client payload for tenancy. A device can only write to its own branch.
4. `sync_metadata` already keys cursor by `source`; keep one cursor per device. Add index
   `sync_events(branch_id, id)`.

Without this change, isolation is only cosmetic.

---

## 6. Branch provisioning

Pin the **device** to a branch, independent of who logs in (so a waiter cannot turn
Branch A's till into Branch B):

1. Owner creates a branch in the web admin → receives a one-time **enrollment code**.
2. Desktop first-run: enter code → backend issues a long-lived **device token**
   (`branch_devices.token_hash`) stored in the Tauri secure store.
3. All sync + API calls send the device token → server derives `business_id`/`branch_id`.
4. Staff login is separate auth layered on top, scoped to that branch.

---

## 7a. Platform console (super admin — you)

A **platform/super-admin surface** above the businesses. Cheapest path: ship it as a
**super-admin section inside the same web admin app**, gated by `scope: "platform"` and a
separate sign-in. (It can later graduate into its own deployment if you want hard
separation.) Capabilities:

- **Create / suspend / delete businesses** and provision each business's initial owner
  account (the owner then logs in and manages their own staff).
- **Set plans & limits per business** (e.g. max branches, feature flags) — these gate what
  a business is allowed to do, including how many branches it may create.
- **View and manage every branch and its details** across all businesses — status, device
  enrollment, last-seen/online state, sales health.
- **Platform-wide dashboards** (businesses, branches, devices, sync health) and an
  **audit log** of super-admin actions.
- **Impersonate / "view as"** a business owner for support (audited), optional.

Business owners themselves **create their own branches** from the web admin (§7), within
the plan limit the platform set. The platform console does not have to create branches for
them — but the super admin *can* manage/correct any branch.

---

## 7. Web admin app

A **separate React web app** (new package, e.g. `web-admin/`) against the **same NestJS
backend**, deployed normally (Vercel/Netlify/VPS). Online-only — **no PGlite/SQLite, no
sync engine**. Reuse the desktop app's components and `application/` facade patterns where
practical, but call the backend over HTTP directly. The **platform console (§7a)** lives
inside this same app behind the `super_admin` role.

Uses `scope: "owner"` JWTs and provides everything the current admin does, plus:

- Cross-branch **reporting/monitoring** with roll-up dashboards
- **Menu & price management** per branch
- **Staff & access management** across branches
- **Inventory/stock control** across branches
- A **branch switcher**

New backend endpoints are mostly "list across branches" + "act on branch X," all enforced
by the tenant guard.

---

## 8. Migrating existing single-cafe data

The current data is one implicit cafe:

1. Create one `businesses` row + one `branches` row.
2. Backfill every operational table's `business_id`/`branch_id` to those IDs (one
   `UPDATE` per table), then set the columns `NOT NULL`.
3. Enroll the existing desktop install as that branch's device.

Zero data loss; the current cafe becomes "Business #1 / Branch #1."

---

## 9. Phasing

| Phase | Deliverable |
|---|---|
| **1** | `businesses`/`branches` tables; add `business_id`/`branch_id` columns (nullable); backfill; set `NOT NULL`. No behavior change. |
| **2** | Tenant context guard + scope every backend service query; JWT changes. |
| **3** | Sync partitioning (`branch_id` on `sync_events`, filtered `getChanges`, device tokens, enrollment). |
| **4** | Web admin app — reporting first, then menu/staff/inventory management. |
| **5** | **Platform console** (super admin): create/suspend businesses, provision owners, set plans/branch limits, manage all branches, audit log. |
| **6** | Self-serve business/branch onboarding (owners create branches within plan limits); billing/plan enforcement if desired. |

Phases 1–3 are backend-only and establish the foundation without major desktop UI change.
Phase 4 is the product owners log into.

---

## 10. Open questions / risks

- **No master-menu inheritance** (per current decision): opening a new branch is a
  from-scratch menu setup each time. A later "clone Branch A's menu into Branch B" copy
  operation is cheap to add — confirm whether owners will expect it.
- **The tenant guard is the security boundary** in a shared DB. It must be centralized and
  covered by tests; one unscoped query leaks one cafe's data into another's.
- **Cross-branch reporting performance**: roll-ups across many branches should use
  `business_id`-led indexes and may later need materialized summaries.
