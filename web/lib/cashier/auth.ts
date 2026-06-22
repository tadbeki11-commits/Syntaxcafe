import { API_BASE } from "@/lib/api";
import { getDeviceToken } from "@/lib/cashier/device";

export type CashierUser = {
  id: string;
  username: string;
  role: string;
  full_name?: string;
  // Departments (order item main_category slugs) this cashier is attached to.
  // Empty = unattached → sees all orders and settles the whole order.
  departments: string[];
};

const USER_KEY = "cp_user";

// Only cashiers may use this portal. Confirming payments is a cashier function.
const ALLOWED_ROLES = ["cashier"];

// Cashiers sign in with their name + password, exactly like the desktop POS
// (`/auth/staff-login`). Like the POS, this issues no back-office JWT: every
// subsequent request is scoped to the branch by the enrolled device's
// x-device-token header and is exempt from the permissions guard (no role in the
// tenant context). The login simply verifies credentials and caches the user.
export async function cashierLogin(
  name: string,
  password: string,
): Promise<CashierUser> {
  const res = await fetch(`${API_BASE}/auth/staff-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Client": "tauri-pos-app",
      ...(getDeviceToken() ? { "x-device-token": getDeviceToken()! } : {}),
    },
    body: JSON.stringify({ name, password }),
  });

  if (!res.ok) {
    let message =
      res.status === 401
        ? "Invalid name or password"
        : `Login failed (${res.status})`;
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
  if (!ALLOWED_ROLES.includes(data.user?.role)) {
    throw new Error("This portal is for cashiers only.");
  }

  const user: CashierUser = {
    ...data.user,
    departments: Array.isArray(data.user?.departments)
      ? data.user.departments
      : [],
  };

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export function cashierLogout() {
  localStorage.removeItem(USER_KEY);
}

export function getCashierUser(): CashierUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function isCashierAuthenticated(): boolean {
  return !!getCashierUser();
}
