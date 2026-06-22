import { AsyncLocalStorage } from "node:async_hooks";

// Sentinel IDs of the default business/branch seeded by the multi-tenant migration.
// Used as the fallback tenant for requests that don't yet carry tenant info (the
// offline desktop app until phase 3 device tokens land).
export const DEFAULT_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_BRANCH_ID = "00000000-0000-0000-0000-000000000002";

export type TenantScope = "platform" | "owner" | "branch";

export interface TenantContext {
  /** null only for platform super admins (no owning business). */
  businessId: string | null;
  /** null for platform/owner scopes not pinned to a single branch. */
  branchId: string | null;
  scope: TenantScope;
  userId?: string | null;
  username?: string | null;
  /** Role string from the JWT (web back office). Null for device-token (POS). */
  role?: string | null;
}

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getTenant(): TenantContext | undefined {
  return storage.getStore();
}

/**
 * Active branch id for branch-scoped reads/writes. Falls back to the default
 * branch so the offline desktop app keeps working before phase 3. Throws for
 * platform/owner scopes that aren't pinned to a branch — those code paths must
 * pass an explicit branch instead of relying on the ambient one.
 */
export function requireBranchId(): string {
  const t = getTenant();
  if (t?.branchId) return t.branchId;
  if (t && t.scope !== "branch") {
    throw new Error(
      `No branch in context for scope "${t.scope}". Pass an explicit branch id.`,
    );
  }
  return DEFAULT_BRANCH_ID;
}

export function requireBusinessId(): string {
  return getTenant()?.businessId ?? DEFAULT_BUSINESS_ID;
}

/** Spread into insert values for the 22 fully branch-scoped tables. */
export function tenantInsert(): { business_id: string; branch_id: string } {
  return { business_id: requireBusinessId(), branch_id: requireBranchId() };
}
