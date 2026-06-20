// Device enrollment for the web dashboard (back-office portal).
//
// Mirrors the waiter portal's device-token flow (see lib/waiter/device.ts), but
// persists under its own key so the two portals don't clobber each other on the
// same browser. A branch admin redeems a one-time enrollment code (minted by an
// owner/platform admin for a branch) via POST /devices/enroll for a long-lived
// token. That token is attached as the `x-device-token` header on every
// dashboard API request so the backend pins this device — and therefore the
// branch-admin login — to its branch (see backend TenantMiddleware, which checks
// the device token before the JWT).
//
// Owners / platform admins do NOT enroll; without a token, requests fall back to
// the JWT's tenant exactly as before.

import { API_BASE } from "./api";

export interface DeviceEnrollment {
  token: string;
  businessId: string;
  branchId: string;
  deviceName?: string | null;
  enrolledAt: string;
}

const STORAGE_KEY = "pa_device";

export function getDeviceEnrollment(): DeviceEnrollment | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

export function getDeviceToken(): string | null {
  return getDeviceEnrollment()?.token ?? null;
}

export function isDeviceEnrolled(): boolean {
  return !!getDeviceEnrollment()?.token;
}

export function setDeviceEnrollment(enrollment: DeviceEnrollment): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(enrollment));
}

export function clearDeviceEnrollment(): void {
  localStorage.removeItem(STORAGE_KEY);
}

interface EnrollResponse {
  token: string;
  business_id: string;
  branch_id: string;
}

/**
 * Redeems a one-time enrollment code for a long-lived device token and persists
 * it. After this resolves, every subsequent dashboard API call carries the
 * device's x-device-token header.
 */
export async function enrollDevice(
  code: string,
  deviceName?: string,
): Promise<DeviceEnrollment> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error("Enrollment code is required");

  const res = await fetch(`${API_BASE}/devices/enroll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": "tauri-pos-app",
    },
    body: JSON.stringify({
      code: trimmed,
      device_name: deviceName?.trim() || undefined,
    }),
  });

  if (!res.ok) {
    let message = "Invalid enrollment code";
    try {
      const body = await res.json();
      message = body.message || message;
      if (Array.isArray(message)) message = message.join(", ");
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const data: EnrollResponse = await res.json();
  if (!data?.token) {
    throw new Error("Enrollment failed: no token returned");
  }

  const enrollment: DeviceEnrollment = {
    token: data.token,
    businessId: data.business_id,
    branchId: data.branch_id,
    deviceName: deviceName?.trim() || null,
    enrolledAt: new Date().toISOString(),
  };
  setDeviceEnrollment(enrollment);
  return enrollment;
}
