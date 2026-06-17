import { API_BASE } from "@/lib/api";
import { getDeviceToken } from "@/lib/waiter/device";

export type WaiterUser = {
  id: string;
  username: string;
  role: string;
  full_name?: string;
};

const TOKEN_COOKIE = "wp_token";
const USER_KEY = "wp_user";

// Roles allowed to use the waiter portal. Kept narrow on purpose — this device
// is meant for floor staff taking table orders.
const ALLOWED_ROLES = ["cafe_waiter"];

// Mirrors the desktop POS login: floor staff pick their name and tap a 4-digit
// PIN. We send the enrolled device token (added by the caller's fetch headers is
// not needed here — pin-login resolves the user by name within the device's
// business via the x-device-token header below).
export async function waiterLogin(
  name: string,
  pin: string,
): Promise<WaiterUser> {
  const res = await fetch(`${API_BASE}/auth/pin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": "tauri-pos-app",
      ...(getDeviceToken() ? { "x-device-token": getDeviceToken()! } : {}),
    },
    body: JSON.stringify({ name, pin }),
  });

  if (!res.ok) {
    let message =
      res.status === 401 ? "Invalid name or PIN" : `Login failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
      if (Array.isArray(message)) message = message.join(", ");
    } catch {
      /* non-JSON error body */
    }
    throw new Error(message);
  }

  const data = await res.json();
  const token = data?.token?.access_token;
  if (!token) throw new Error("Login failed: no token returned");

  if (!ALLOWED_ROLES.includes(data.user?.role)) {
    throw new Error("This portal is for café waiters only.");
  }

  // Mobile Safari/Chrome drop SameSite=Lax cookies set from JS over HTTPS unless
  // `Secure` is present, which made a fresh tab look logged out. Match the
  // attribute handling used for the back-office session in lib/auth.ts.
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? " Secure;"
      : "";
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${12 * 3600}; SameSite=Lax;${secure}`;
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data.user;
}

export function waiterLogout() {
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  localStorage.removeItem(USER_KEY);
}

export function getWaiterToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]+)`),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export function getWaiterUser(): WaiterUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

// Persist an updated waiter user (e.g. after editing their profile) so the
// cached session reflects the new name/username on the next render.
export function setWaiterUser(user: WaiterUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isWaiterAuthenticated(): boolean {
  return !!getWaiterToken() && !!getWaiterUser();
}
