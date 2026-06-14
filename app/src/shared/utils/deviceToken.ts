// Device enrollment for multi-tenant / multi-branch operation.
//
// A device redeems a branch enrollment code (managed by an owner/platform admin)
// for a long-lived token via POST /devices/enroll. We persist that token in the
// local SQLite DB (the `device_enrollment` table — survives logins, unlike the
// session user) and attach it as `x-device-token` on every API/sync request so the
// backend pins the device to its branch (see backend TenantMiddleware).
//
// The token is read synchronously on every request via getDeviceToken(), so we keep
// an in-memory cache that is hydrated once from SQLite at startup by
// loadDeviceEnrollment() (called during bootstrap, before any API/sync call fires).

import { getLocalDb } from "@/db/localDb";
import { deviceEnrollmentTable } from "@/db/schema";

export interface DeviceEnrollment {
  token: string;
  businessId: string;
  branchId: string;
  deviceName?: string | null;
  enrolledAt: string;
}

let cached: DeviceEnrollment | null = null;
let loadPromise: Promise<DeviceEnrollment | null> | null = null;

/**
 * Hydrates the in-memory cache from SQLite. Idempotent and safe to call
 * concurrently — the first call wins and the rest await the same promise.
 */
export const loadDeviceEnrollment = (): Promise<DeviceEnrollment | null> => {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const db = await getLocalDb();
      const rows = await db.select().from(deviceEnrollmentTable).limit(1);
      const row = rows[0];
      if (row?.token) {
        cached = {
          token: row.token,
          businessId: row.business_id ?? "",
          branchId: row.branch_id ?? "",
          deviceName: row.device_name ?? null,
          enrolledAt: row.enrolled_at ?? "",
        };
      } else {
        cached = null;
      }
    } catch (error) {
      console.error("[deviceToken] Failed to load enrollment:", error);
      cached = null;
    }
    return cached;
  })();
  return loadPromise;
};

/** Synchronous accessors — valid after loadDeviceEnrollment() has resolved once. */
export const getDeviceEnrollment = (): DeviceEnrollment | null => cached;

export const getDeviceToken = (): string | null => cached?.token ?? null;

export const isDeviceEnrolled = (): boolean => !!cached?.token;

/** Persists the enrollment (single row, id=1) and updates the cache. */
export const setDeviceEnrollment = async (
  enrollment: DeviceEnrollment,
): Promise<void> => {
  cached = enrollment;
  loadPromise = Promise.resolve(enrollment);
  const db = await getLocalDb();
  // No transactions on the pooled SQLite connection — run writes sequentially.
  await db.delete(deviceEnrollmentTable);
  await db.insert(deviceEnrollmentTable).values({
    id: 1,
    token: enrollment.token,
    business_id: enrollment.businessId,
    branch_id: enrollment.branchId,
    device_name: enrollment.deviceName ?? null,
    enrolled_at: enrollment.enrolledAt,
  });
};

/** Unenrolls this device: clears the persisted token and the cache. */
export const clearDeviceEnrollment = async (): Promise<void> => {
  cached = null;
  loadPromise = Promise.resolve(null);
  const db = await getLocalDb();
  await db.delete(deviceEnrollmentTable);
};
