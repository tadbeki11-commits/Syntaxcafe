import { API_BASE } from "@/lib/api";

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

export async function waiterLogin(
  username: string,
  password: string,
): Promise<WaiterUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": "tauri-pos-app",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    let message = `Login failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.message || message;
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

  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${12 * 3600}; samesite=lax`;
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

export function isWaiterAuthenticated(): boolean {
  return !!getWaiterToken() && !!getWaiterUser();
}
